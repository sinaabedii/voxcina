package services

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

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
	now := time.Now()

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

	// Determine target image count based on desired length
	targetImages := 1
	if brief.DesiredLength >= 1400 {
		targetImages = 3
	} else if brief.DesiredLength >= 800 {
		targetImages = 2
	}

	prompt := fmt.Sprintf(`You are a Persian fashion and lifestyle blogger for Voxcina, an Iranian e-commerce platform. Write engaging, native Persian content that feels authentic and conversational.

**Assignment:**
- Topic: %s
- Audience: %s
- Target length: %d words
- Tone: %s
- Category: %s
- Keywords: %s

**Research Summary:**
%s

**Outline:**
- Title: %s
- Sections: %s
- Key points: %s

**Constraints:**
- Avoid: %s
- Address uncertainties: %s

**Content Structure Rules:**
You MUST use exactly these 6 block types in order:

1. "title" - Main article title (H1, exactly one, always first)
2. "header" - Major section heading (H2)
3. "section" - Subsection heading (H3)
4. "subsection" - Minor heading (H4)
5. "text" - Paragraph content (plain text only, no HTML/Markdown)
6. "image" - Image placeholder with imageSlotID (e.g., "img-1", "img-2", "img-3")

**Image Placement:**
- Insert exactly %d image block(s) BETWEEN text blocks
- Images must never be first or last
- Space images evenly throughout the article
- Each image block needs: type="image", imageSlotID="img-N", alt="descriptive text"

**Heading Hierarchy:**
- Start with title (H1)
- Use header (H2) for main sections
- Use section (H3) for subsections under headers
- Use subsection (H4) sparingly for deeper nesting
- Never skip levels (no H4 directly after H2)

**Writing Guidelines:**
- Write naturally in Persian, not translated-sounding
- Be conversational and friendly, like talking to a friend
- Include practical tips and actionable advice
- Use short paragraphs (2-4 sentences)
- Break up text with headings every 200-300 words
- End with a conclusion or call-to-action

**Output Format:**
Return JSON with this exact structure:
{
  "blocks": [
    {"type": "title", "text": "عنوان مقاله", "order": 0},
    {"type": "text", "text": "مقدمه...", "order": 1},
    {"type": "image", "imageSlotID": "img-1", "alt": "توضیح تصویر", "order": 2},
    {"type": "header", "text": "بخش اول", "order": 3},
    {"type": "text", "text": "محتوای بخش...", "order": 4},
    ...
  ],
  "excerpt": "خلاصه 50-100 کلمه‌ای مقاله",
  "recommended_category": "دسته‌بندی پیشنهادی",
  "recommended_tags": ["برچسب1", "برچسب2", "برچسب3"]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, no code blocks.`,
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
		strings.Join(research.ProhibitedClaims, ", "),
		strings.Join(research.Uncertainties, ", "),
		targetImages,
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
						"allOf": []map[string]interface{}{
							{
								"if": map[string]interface{}{
									"properties": map[string]interface{}{
										"type": map[string]interface{}{
											"enum": []string{"title", "header", "section", "subsection", "text"},
										},
									},
								},
								"then": map[string]interface{}{
									"required": []string{"type", "order", "text"},
								},
							},
							{
								"if": map[string]interface{}{
									"properties": map[string]interface{}{
										"type": map[string]interface{}{
											"const": "image",
										},
									},
								},
								"then": map[string]interface{}{
									"required": []string{"type", "order", "imageSlotID", "alt"},
								},
							},
						},
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
