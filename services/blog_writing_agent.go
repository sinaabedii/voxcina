package services

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"backEnd/models"
)

// WritingAgent handles the writing stage of blog generation
type WritingAgent struct {
	openRouter *OpenRouterStructuredClient
	repository *BlogRepository
	validator  *BlogValidator
}

// NewWritingAgent creates a new writing agent
func NewWritingAgent(openRouter *OpenRouterStructuredClient, repository *BlogRepository, validator *BlogValidator) *WritingAgent {
	return &WritingAgent{
		openRouter: openRouter,
		repository: repository,
		validator:  validator,
	}
}

// RunWriting executes the writing stage
func (wa *WritingAgent) RunWriting(ctx context.Context, run *models.BlogPipelineRun, snapshot *ResearchSnapshot) (*models.BlogPost, error) {
	log.Printf("[blog] Starting writing for run %s, topic: %s", run.ID.Hex(), snapshot.GenerationBrief.Topic)
	startTime := time.Now()
	now := time.Now()
	completedAt := &now

	// Build writing prompt
	prompt := wa.buildWritingPrompt(snapshot)

	// Call OpenRouter with structured output
	output, err := wa.openRouter.CallWithSchema(ctx, prompt, writingOutputSchema())
	if err != nil {
		return nil, fmt.Errorf("failed to generate writing output: %w", err)
	}

	// Parse output
	var writingResult WritingResult
	if err := parseBSONToStruct(output, &writingResult); err != nil {
		return nil, fmt.Errorf("failed to parse writing output: %w", err)
	}

	// Validate blocks
	if err := wa.validator.ValidateBlocks(writingResult.Blocks); err != nil {
		log.Printf("[blog] Block validation failed, attempting repair: %v", err)
		
		// Attempt one repair retry
		repairedBlocks, repairErr := wa.attemptBlockRepair(ctx, snapshot, writingResult.Blocks)
		if repairErr != nil {
			return nil, fmt.Errorf("block validation and repair failed: %w", repairErr)
		}
		writingResult.Blocks = repairedBlocks
	}

	// Calculate content hash
	contentHash := wa.calculateContentHash(writingResult.Blocks)

	// Use admin's category if provided, otherwise fall back to AI's recommendation
	category := writingResult.RecommendedCategory
	if snapshot.GenerationBrief.Category != "" {
		category = snapshot.GenerationBrief.Category
	}

	// Create blog post
	post := models.BlogPost{
		ID:              primitive.NewObjectID(),
		Title:           wa.extractTitle(writingResult.Blocks),
		Slug:            generateSlug(wa.extractTitle(writingResult.Blocks)),
		Excerpt:         writingResult.Excerpt,
		Blocks:          writingResult.Blocks,
		Category:        category,
		Tags:            writingResult.RecommendedTags,
		Status:          "content_review",
		PipelineRunID:   run.ID.Hex(),
		ContentRevision: 1,
		ContentHash:     contentHash,
		ReadTime:        wa.calculateReadTime(writingResult.Blocks),
		AuthorSnapshot: models.AuthorSnapshot{
			Name:   "تیم وکسینا",
			Avatar: "/uploads/authors/default.jpg",
		},
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save post to database
	if err := wa.repository.InsertBlogPost(ctx, &post); err != nil {
		return nil, fmt.Errorf("failed to save blog post: %w", err)
	}

	// Save execution record
	execution := models.BlogAgentExecution{
		PipelineRunID: run.ID,
		Stage:         "write",
		Attempt:       1,
		InputSnapshot: bson.M{
			"research_snapshot": snapshot,
		},
		ParsedOutput: bson.M{
			"blocks":      writingResult.Blocks,
			"excerpt":     writingResult.Excerpt,
			"category":    writingResult.RecommendedCategory,
			"tags":        writingResult.RecommendedTags,
		},
		Provider:    "openrouter",
		Model:       "qwen/qwen3.7-plus",
		DurationMs:  int64(time.Since(startTime).Milliseconds()),
		Status:      "completed",
		CreatedAt:   time.Now(),
		StartedAt:   &startTime,
		CompletedAt: completedAt,
	}

	if err := wa.repository.InsertAgentExecution(ctx, &execution); err != nil {
		log.Printf("[blog] Warning: failed to save execution record: %v", err)
	}

	// Update run status
	run.PostID = post.ID.Hex()
	run.Status = "content_approved"
	run.ApprovedAt = &now
	if err := wa.repository.UpdatePipelineRun(ctx, run); err != nil {
		return nil, fmt.Errorf("failed to update run status: %w", err)
	}

	log.Printf("[blog] Writing completed: %d blocks, title: %s", len(writingResult.Blocks), post.Title)
	return &post, nil
}

// WritingResult is the structured output from the writing agent
type WritingResult struct {
	Blocks              []models.BlogBlock `json:"blocks"`
	Excerpt             string             `json:"excerpt"`
	RecommendedCategory string             `json:"recommended_category"`
	RecommendedTags     []string           `json:"recommended_tags"`
}

// buildWritingPrompt creates the prompt for the writing agent
func (wa *WritingAgent) buildWritingPrompt(snapshot *ResearchSnapshot) string {
	brief := snapshot.GenerationBrief
	research := snapshot.Output

	prompt := fmt.Sprintf(`You are a professional Persian fashion blogger writing for Voxcina, a Persian e-commerce platform.

**Topic:** %s
**Audience:** %s
**Desired Length:** %d words
**Tone:** %s
**Category:** %s
**Keywords:** %s

**Research Findings:**
%s

**Recommended Outline:**
- Title: %s
- Sections: %s
- Key Points: %s

**Uncertainties to Address:**
%s

**Prohibited Claims to Avoid:**
%s

**Instructions:**
1. Write in native, fluent Persian (not translated-sounding)
2. Use exactly these block types: title, header, section, subsection, text, image
3. Structure:
   - First block must be "title" (H1)
   - Use "header" (H2) for main sections
   - Use "section" (H3) for subsections
   - Use "subsection" (H4) for sub-subsections
   - Use "text" for paragraph content
   - Use "image" for inline images (1-3 images based on length)
4. Image placement:
   - Under 800 words: 1 image
   - 800-1400 words: 2 images
   - Above 1400 words: 3 images
   - Images must appear BETWEEN text blocks, never first or last
5. Include a compelling excerpt (50-100 words)
6. Recommend 3-5 tags
7. Write engaging, informative content with practical tips

Return a JSON object with this structure:
{
  "blocks": [
    {
      "type": "title",
      "text": "article title",
      "order": 0
    },
    {
      "type": "text",
      "text": "paragraph content",
      "order": 1
    },
    {
      "type": "image",
      "imageSlotID": "img-1",
      "alt": "description for accessibility",
      "order": 2
    },
    ...
  ],
  "excerpt": "short description",
  "recommended_category": "category name",
  "recommended_tags": ["tag1", "tag2"]
}

IMPORTANT: 
- Do NOT use HTML or Markdown in text blocks
- Do NOT include any other block types
- Ensure proper heading hierarchy (H1→H2→H3→H4, no skipping)
- Write in Persian, but keep JSON keys in English`,
		brief.Topic,
		brief.TargetAudience,
		brief.DesiredLength,
		brief.Tone,
		brief.Category,
		strings.Join(brief.Keywords, ", "),
		formatFindings(research.Findings),
		research.Outline.Title,
		strings.Join(research.Outline.Sections, ", "),
		strings.Join(research.Outline.KeyPoints, ", "),
		strings.Join(research.Uncertainties, "\n"),
		strings.Join(research.ProhibitedClaims, "\n"),
	)

	return prompt
}

// formatFindings formats research findings for the prompt
func formatFindings(findings []ResearchFinding) string {
	if len(findings) == 0 {
		return "No findings available."
	}

	formatted := ""
	for i, f := range findings {
		formatted += fmt.Sprintf("%d. %s (confidence: %.2f, sources: %v)\n",
			i+1, f.Claim, f.Confidence, f.Sources)
	}
	return formatted
}

// attemptBlockRepair tries to fix invalid blocks
func (wa *WritingAgent) attemptBlockRepair(ctx context.Context, snapshot *ResearchSnapshot, blocks []models.BlogBlock) ([]models.BlogBlock, error) {
	log.Printf("[blog] Attempting block repair for %d blocks", len(blocks))

	// Re-call the writing agent with repair instructions
	prompt := fmt.Sprintf(`Previous block generation failed validation. Please fix the blocks.

Original blocks:
%s

Validation errors need to be fixed:
- Ensure exactly one "title" block first
- Ensure images appear between text blocks
- Ensure proper heading hierarchy
- Ensure correct image count based on word count

Return corrected blocks in the same JSON format.`, formatBlocks(blocks))

	output, err := wa.openRouter.CallWithSchema(ctx, prompt, writingOutputSchema())
	if err != nil {
		return nil, err
	}

	var repaired WritingResult
	if err := parseBSONToStruct(output, &repaired); err != nil {
		return nil, err
	}

	return repaired.Blocks, nil
}

// formatBlocks formats blocks for error messages
func formatBlocks(blocks []models.BlogBlock) string {
	jsonBytes, err := json.MarshalIndent(blocks, "", "  ")
	if err != nil {
		return fmt.Sprintf("%v", blocks)
	}
	return string(jsonBytes)
}

// calculateContentHash calculates SHA256 hash of blocks
func (wa *WritingAgent) calculateContentHash(blocks []models.BlogBlock) string {
	jsonBytes, err := json.Marshal(blocks)
	if err != nil {
		return ""
	}
	hash := sha256.Sum256(jsonBytes)
	return fmt.Sprintf("%x", hash)
}

// extractTitle extracts the title from blocks
func (wa *WritingAgent) extractTitle(blocks []models.BlogBlock) string {
	for _, block := range blocks {
		if block.Type == "title" {
			return block.Text
		}
	}
	return "Untitled"
}

// calculateReadTime estimates read time in minutes
func (wa *WritingAgent) calculateReadTime(blocks []models.BlogBlock) int {
	wordCount := 0
	for _, block := range blocks {
		if block.Type == "text" || block.Type == "title" || block.Type == "header" || block.Type == "section" || block.Type == "subsection" {
			words := strings.Fields(block.Text)
			wordCount += len(words)
		}
	}

	// Average reading speed: 200 words per minute
	readTime := wordCount / 200
	if readTime < 1 {
		readTime = 1
	}
	return readTime
}

// writingOutputSchema returns the JSON schema for writing output
func writingOutputSchema() map[string]interface{} {
	return map[string]interface{}{
		"name": "writing_output",
		"schema": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"blocks": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"type": map[string]interface{}{
								"type": "string",
								"enum": []string{"title", "header", "section", "subsection", "text", "image"},
							},
							"id":          map[string]interface{}{"type": "string"},
							"order":       map[string]interface{}{"type": "integer"},
							"text":        map[string]interface{}{"type": "string"},
							"imageSlotID": map[string]interface{}{"type": "string"},
							"imageID":     map[string]interface{}{"type": "string"},
							"alt":         map[string]interface{}{"type": "string"},
							"caption":     map[string]interface{}{"type": "string"},
						},
						"required": []string{"type", "order"},
					},
				},
				"excerpt": map[string]interface{}{"type": "string"},
				"recommended_category": map[string]interface{}{"type": "string"},
				"recommended_tags": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{"type": "string"},
				},
			},
			"required": []string{"blocks", "excerpt"},
		},
	}
}

// generateSlug creates a URL-safe slug from a Persian/English title.
func generateSlug(title string) string {
	if title == "" {
		return "untitled"
	}
	replacer := strings.NewReplacer(
		" ", "-",
		"‌", "-", // Persian ZWNJ
		"،", "-",
		"؟", "",
		"!", "",
		"?", "",
		":", "",
		";", "",
		",", "",
		".", "",
		"(", "",
		")", "",
		"/", "-",
	)
	s := replacer.Replace(strings.ToLower(strings.TrimSpace(title)))
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, s)
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	if s == "" {
		return "untitled"
	}
	return s
}
