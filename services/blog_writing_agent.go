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

	prompt := wa.buildWritingPrompt(snapshot)

	maxTokens := writingMaxTokens(snapshot.GenerationBrief.DesiredLength)
	output, err := wa.openRouter.CallWithSchemaModelAndTokens(ctx, prompt, writingOutputSchema(), run.Model, maxTokens)
	if err != nil {
		return nil, fmt.Errorf("failed to generate writing output: %w", err)
	}

	log.Printf("[blog] Writing response content (first 500 chars): %s", output.Content[:min(len(output.Content), 500)])

	// Parse output
	var writingResult WritingResult
	if err := parseBSONToStruct(output, &writingResult); err != nil {
		return nil, fmt.Errorf("failed to parse writing output: %w", err)
	}

	log.Printf("[blog] Writing parsed: %d blocks, title: %s, excerpt: %s", len(writingResult.Blocks), wa.extractTitle(writingResult.Blocks), writingResult.Excerpt[:min(len(writingResult.Excerpt), 100)])

	// Fail immediately if no blocks were parsed — repair with empty blocks produces garbage
	if len(writingResult.Blocks) == 0 {
		return nil, fmt.Errorf("writing output contains no blocks (LLM returned invalid schema)")
	}

	// Validate blocks
	if err := wa.validator.ValidateBlocks(writingResult.Blocks); err != nil {
		log.Printf("[blog] Block validation failed, attempting repair: %v", err)
		
		// Attempt one repair retry
		repairedBlocks, repairErr := wa.attemptBlockRepair(ctx, snapshot, writingResult.Blocks, run.Model)
		if repairErr != nil {
			return nil, fmt.Errorf("block validation and repair failed: %w", repairErr)
		}
		writingResult.Blocks = repairedBlocks
	}

	// Trim excess images if model still generated too many
	writingResult.Blocks = trimExcessImages(writingResult.Blocks)

	// Ensure we have a valid title
	title := wa.extractTitle(writingResult.Blocks)
	if title == "" || title == "Untitled" {
		return nil, fmt.Errorf("writing output missing a valid title block")
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
		Title:           title,
		Slug:            generateSlug(title),
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
			Avatar: "",
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

	// Build source material section from raw sources
	sourceMaterial := formatSourceMaterial(snapshot.Sources)

	prompt := fmt.Sprintf(`You are a Persian fashion and lifestyle blogger for Voxcina, an Iranian e-commerce platform. Write engaging, native Persian content that feels authentic and conversational.

**Assignment:**
- Topic: %s
- Audience: %s
- Target length: %d words
- Tone: %s
- Category: %s
- Keywords: %s

**Research Findings:**
%s

**Outline:**
- Title: %s
- Sections: %s
- Key points: %s

%s

**Constraints:**
- Avoid: %s
- Address uncertainties: %s

**Content Structure Rules:**
You have these block types available:

1. "title" - Main article title (H1, exactly one, always first)
2. "header" - Section heading (H2)
3. "txt" - Paragraph content (plain prose only, no HTML/Markdown)
4. "image" - Image placeholder with imageSlotID (e.g., "img-1", "img-2", "img-3")
5. "list" - A real bullet or numbered list, for genuinely enumerable content
   (tips, steps, materials). Fields: "items" (array of strings), "ordered"
   (true for a numbered list, false/omitted for bullets). Do NOT fake a list
   by writing "1. ..." lines inside a "txt" block — use this type instead.
6. "quote" - A short pull-quote/callout highlighting one tip or remark, for
   visual variety. Fields: "text" (the quote body), "attribution" (optional,
   e.g. a name or "تیم وکسینا" — omit if there's no one to attribute it to).
7. "product" - OPTIONAL. Recommends a specific kind of product from the store
   at a contextually natural point. See "Product Block Rule" below.

**Image Placement:**
- Insert exactly %d image block(s) BETWEEN other content blocks
- Images must never be first or last, and never directly next to another image
- Space images evenly throughout the article
- Each image block needs: type="image", imageSlotID="img-N", alt="descriptive text"

**Heading Structure:**
- Start with title (H1)
- Use header (H2) for section breaks — that's the only heading level below
  the title, so don't try to nest deeper headings

**Writing Guidelines — IMPORTANT: USE YOUR RESEARCH DATA:**
- Write naturally in Persian, not translated-sounding
- Be conversational and friendly, like talking to a friend
- Use short paragraphs (2-4 sentences)
- Break up text with headings every 200-300 words
- Use "list"/"quote" blocks where they genuinely fit better than prose
- End with a conclusion or call-to-action

**Source Data Usage (CRITICAL):**
- The "Research Findings" above contain facts extracted from real web sources.
  USE THESE SPECIFIC FACTS, numbers, and details in your article.
- The "Source Material" section contains actual content fetched from those
  web pages. Reference the details, examples, and insights from this content.
- Do NOT write generic filler. Instead, weave the research data into your
  article naturally — include specific numbers, named studies, concrete
  examples, and expert advice mentioned in the sources.
- When a finding mentions a specific statistic or fact, include it in the
  relevant section of the article.
- You can rephrase and adapt the source content to match the tone, but do NOT
  discard the specific details.

**Text Block Content Rule (CRITICAL):**
- A "txt" block must contain ONLY flowing prose. NEVER start it with a label,
  prefix, or heading-like phrase such as "مقدمه:", "نتیجه‌گیری:", or a
  rhetorical question formatted as a title (e.g. "موضوع چیست؟" on its own line
  followed by a blank line).
- The article's opening "txt" block (right after "title") must jump straight
  into the hook sentence — no "مقدمه" label of any kind, since the reader
  already sees the article title above it.
- If a section genuinely needs a heading, use a "header" block for it — never
  simulate a heading by writing it as the first line of a "txt" block.

**Product Block Rule (CRITICAL):**
- Use at most 1-2 "product" blocks in the whole article, only where recommending
  a specific kind of item is genuinely natural (e.g. "یک پیراهن رسمی مناسب
  مصاحبه شغلی"). Never first, last, or directly adjacent to another product block.
- Write ONLY a short "productDescription" (1-2 Persian sentences describing what
  kind of product to recommend). Do NOT invent a product name, price, brand, or
  link — a human picks the actual product afterward from the real catalog.
- If nothing in the article genuinely calls for a product recommendation, omit
  this block type entirely — it is optional, never forced.

**Output Format:**
Return JSON with this exact structure:
{
  "blocks": [
    {"type": "title", "text": "عنوان مقاله", "order": 0},
    {"type": "txt", "text": "شاید شما هم متوجه شده‌اید که...", "order": 1},
    {"type": "image", "imageSlotID": "img-1", "alt": "توضیح تصویر", "order": 2},
    {"type": "header", "text": "بخش اول", "order": 3},
    {"type": "txt", "text": "محتوای بخش...", "order": 4},
    {"type": "list", "items": ["نکته اول", "نکته دوم", "نکته سوم"], "ordered": false, "order": 5},
    {"type": "quote", "text": "یک نقل‌قول کوتاه و کاربردی", "attribution": "تیم وکسینا", "order": 6},
    {"type": "product", "productDescription": "یک پیراهن رسمی سرمه‌ای مناسب مصاحبه شغلی", "order": 7},
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
		sourceMaterial,
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

// formatSourceMaterial formats raw research sources for the writing prompt.
// It includes the most relevant content from each source, up to a total limit.
func formatSourceMaterial(sources []models.BlogResearchSource) string {
	if len(sources) == 0 {
		return ""
	}

	const maxTotalChars = 6000
	const maxPerSource = 1200

	var result strings.Builder
	result.WriteString("**Source Material (fetched web content — use these details in your article):**\n\n")

	totalChars := 0
	sourceCount := 0

	for _, src := range sources {
		if totalChars >= maxTotalChars {
			break
		}

		content := src.ExtractedContent
		if content == "" {
			content = src.Snippet
		}
		if content == "" {
			continue
		}

		if len(content) > maxPerSource {
			content = content[:maxPerSource] + "..."
		}

		entry := fmt.Sprintf("Source: %s\n%s\n\n", src.Title, content)

		if totalChars+len(entry) > maxTotalChars && sourceCount > 0 {
			break
		}

		result.WriteString(entry)
		totalChars += len(entry)
		sourceCount++
	}

	return result.String()
}

// attemptBlockRepair tries to fix invalid blocks
func (wa *WritingAgent) attemptBlockRepair(ctx context.Context, snapshot *ResearchSnapshot, blocks []models.BlogBlock, model string) ([]models.BlogBlock, error) {
	log.Printf("[blog] Attempting block repair for %d blocks", len(blocks))

	// Count current images and text words for the prompt
	imageCount := 0
	textWords := 0
	for _, b := range blocks {
		if b.Type == models.BlockTypeImage {
			imageCount++
		}
		textWords += countBlockWords(b)
	}
	maxImages := 1
	if textWords >= 1400 {
		maxImages = 3
	} else if textWords >= 800 {
		maxImages = 2
	}

	// When blocks are empty, the repair has no context. Re-generate from brief + research.
	brief := snapshot.GenerationBrief
	research := snapshot.Output
	sourceMaterial := formatSourceMaterial(snapshot.Sources)

	var prompt string
	if len(blocks) == 0 {
		prompt = fmt.Sprintf(`The previous writing attempt produced no valid blocks. Please write the article from scratch.

**Topic:** %s
**Audience:** %s
**Target length:** %d words
**Tone:** %s
**Category:** %s
**Keywords:** %s

**Research findings:**
%s

**Outline:**
- Title: %s
- Sections: %s

%s

Write a complete Persian blog post. Return JSON with this structure:
{
  "blocks": [
    {"type": "title", "text": "عنوان مقاله", "order": 0},
    {"type": "txt", "text": "شاید شما هم متوجه شده‌اید که...", "order": 1},
    {"type": "header", "text": "بخش اول", "order": 2},
    {"type": "txt", "text": "محتوا...", "order": 3}
  ],
  "excerpt": "خلاصه مقاله",
  "recommended_category": "دستهبندی",
  "recommended_tags": ["برچسب1"]
}

Rules:
- Write ONLY in Persian (Farsi)
- Exactly one title block first
- Max %d image(s) for %d words
- No HTML or Markdown in txt blocks
- A "txt" block must be pure prose only — never start it with a label like
  "مقدمه:" or a standalone heading-style question. Use a "header" block if a
  heading is actually needed
- "list"/"quote"/"product" blocks may be used but are optional; a "product"
  block must contain only a short "productDescription", never an invented
  product name/price
- USE the research findings and source material to write content with specific
  details, facts, and examples — not generic filler text
- Return ONLY valid JSON`, brief.Topic, brief.TargetAudience, brief.DesiredLength, brief.Tone, brief.Category, strings.Join(brief.Keywords, ", "), formatFindings(research.Findings), research.Outline.Title, strings.Join(research.Outline.Sections, ", "), sourceMaterial, maxImages, textWords)
	} else {
		prompt = fmt.Sprintf(`Previous block generation failed validation. Please fix the blocks.

Original blocks:
%s

CRITICAL Validation errors to fix:
- You have %d image blocks but only %d are allowed for %d words of text content (max %d images for <800 words, 2 for 800-1400 words, 3 for >1400 words)
- REMOVE excess image blocks to match the allowed count
- Ensure exactly one "title" block first
- Ensure images are never first, last, or directly adjacent to another image
- Ensure heading structure is just title→header (no deeper heading levels exist)
- Write ONLY in Persian (Farsi)

Return corrected blocks in the same JSON format with the correct number of images.`, formatBlocks(blocks), imageCount, maxImages, textWords, maxImages)
	}

	maxTokens := writingMaxTokens(snapshot.GenerationBrief.DesiredLength)
	output, err := wa.openRouter.CallWithSchemaModelAndTokens(ctx, prompt, writingOutputSchema(), model, maxTokens)
	if err != nil {
		return nil, err
	}

	log.Printf("[blog] Repair response content (first 500 chars): %s", output.Content[:min(len(output.Content), 500)])

	var repaired WritingResult
	if err := parseBSONToStruct(output, &repaired); err != nil {
		return nil, err
	}

	log.Printf("[blog] Repair parsed: %d blocks, excerpt: %s", len(repaired.Blocks), repaired.Excerpt[:min(len(repaired.Excerpt), 100)])

	if len(repaired.Blocks) == 0 {
		return nil, fmt.Errorf("repair produced no blocks")
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
		if block.Type == models.BlockTypeTitle {
			return block.Text
		}
	}
	return "Untitled"
}

// writingMaxTokens sizes the completion budget for a writing/repair call
// based on the requested article length. Persian text runs several tokens
// per word in BPE tokenizers, and the JSON block structure (types, keys,
// per-block overhead) adds on top of that — a flat 4096-token budget was
// silently truncating anything beyond a short article. Clamped to a floor
// (short articles still need room for the JSON wrapper) and a ceiling (stay
// within typical provider completion limits).
func writingMaxTokens(desiredWords int) int {
	tokens := desiredWords*4 + 2000
	if tokens < 6000 {
		tokens = 6000
	}
	if tokens > 16000 {
		tokens = 16000
	}
	return tokens
}

// countBlockWords counts readable words in a block, covering plain Text
// (title/header/txt/quote) as well as list Items.
func countBlockWords(b models.BlogBlock) int {
	count := len(strings.Fields(b.Text))
	for _, item := range b.Items {
		count += len(strings.Fields(item))
	}
	return count
}

// calculateReadTime estimates read time in minutes
func (wa *WritingAgent) calculateReadTime(blocks []models.BlogBlock) int {
	wordCount := 0
	for _, block := range blocks {
		wordCount += countBlockWords(block)
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
								"enum": []string{"title", "header", "txt", "image", "list", "quote", "product"},
							},
							"id":                 map[string]interface{}{"type": "string"},
							"order":              map[string]interface{}{"type": "integer"},
							"text":               map[string]interface{}{"type": "string"},
							"imageSlotID":        map[string]interface{}{"type": "string"},
							"imageID":            map[string]interface{}{"type": "string"},
							"alt":                map[string]interface{}{"type": "string"},
							"caption":            map[string]interface{}{"type": "string"},
							"items":              map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
							"ordered":            map[string]interface{}{"type": "boolean"},
							"attribution":        map[string]interface{}{"type": "string"},
							"productDescription": map[string]interface{}{"type": "string"},
						},
						"allOf": []map[string]interface{}{
							{
								"if": map[string]interface{}{
									"properties": map[string]interface{}{
										"type": map[string]interface{}{
											"enum": []string{"title", "header", "txt", "quote"},
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
							{
								"if": map[string]interface{}{
									"properties": map[string]interface{}{
										"type": map[string]interface{}{
											"const": "list",
										},
									},
								},
								"then": map[string]interface{}{
									"required": []string{"type", "order", "items"},
								},
							},
							{
								"if": map[string]interface{}{
									"properties": map[string]interface{}{
										"type": map[string]interface{}{
											"const": "product",
										},
									},
								},
								"then": map[string]interface{}{
									"required": []string{"type", "order", "productDescription"},
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

// persianToLatin maps Persian/Arabic letters and digits to Latin equivalents so
// slugs generated from Persian titles (the norm for this blog) stay meaningful
// instead of being stripped down to nothing.
var persianToLatin = map[rune]string{
	'آ': "a", 'ا': "a", 'ب': "b", 'پ': "p", 'ت': "t", 'ث': "s",
	'ج': "j", 'چ': "ch", 'ح': "h", 'خ': "kh", 'د': "d", 'ذ': "z",
	'ر': "r", 'ز': "z", 'ژ': "zh", 'س': "s", 'ش': "sh", 'ص': "s",
	'ض': "z", 'ط': "t", 'ظ': "z", 'ع': "a", 'غ': "gh", 'ف': "f",
	'ق': "gh", 'ک': "k", 'ك': "k", 'گ': "g", 'ل': "l", 'م': "m",
	'ن': "n", 'و': "v", 'ه': "h", 'ی': "y", 'ي': "y", 'ة': "h",
	'ء': "", 'أ': "a", 'إ': "e", 'ئ': "y",
	'۰': "0", '۱': "1", '۲': "2", '۳': "3", '۴': "4",
	'۵': "5", '۶': "6", '۷': "7", '۸': "8", '۹': "9",
}

// transliterate converts Persian/Arabic letters in s to their Latin equivalents.
func transliterate(s string) string {
	var sb strings.Builder
	for _, r := range s {
		if latin, ok := persianToLatin[r]; ok {
			sb.WriteString(latin)
		} else {
			sb.WriteRune(r)
		}
	}
	return sb.String()
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
	s = transliterate(s)
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

// trimExcessImages removes extra image blocks beyond the allowed count.
func trimExcessImages(blocks []models.BlogBlock) []models.BlogBlock {
	textWords := 0
	for _, b := range blocks {
		textWords += countBlockWords(b)
	}
	maxImages := 1
	if textWords >= 1400 {
		maxImages = 3
	} else if textWords >= 800 {
		maxImages = 2
	}

	imageCount := 0
	var result []models.BlogBlock
	for _, b := range blocks {
		if b.Type == models.BlockTypeImage {
			imageCount++
			if imageCount > maxImages {
				continue // skip excess images
			}
		}
		result = append(result, b)
	}

	if imageCount > maxImages {
		log.Printf("[blog] Trimmed %d excess images (%d → %d for %d words)", imageCount-maxImages, imageCount, maxImages, textWords)
	}
	return result
}
