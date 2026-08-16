package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"backEnd/models"
)

// PromptAgent handles the prompt generation stage
type PromptAgent struct {
	openRouter *OpenRouterStructuredClient
	repository *BlogRepository
}

// NewPromptAgent creates a new prompt agent
func NewPromptAgent(openRouter *OpenRouterStructuredClient, repository *BlogRepository) *PromptAgent {
	return &PromptAgent{
		openRouter: openRouter,
		repository: repository,
	}
}

// PromptOutput represents generated prompts
type PromptOutput struct {
	CoverPrompt   ImagePrompt   `json:"cover_prompt"`
	InlinePrompts []ImagePrompt `json:"inline_prompts"`
}

// ImagePrompt represents a prompt for image generation
type ImagePrompt struct {
	Prompt          string `json:"prompt"`
	AltText         string `json:"alt_text"`
	Caption         string `json:"caption"`
	AspectRatio     string `json:"aspect_ratio"` // "16:9", "4:3", "1:1"
	Composition     string `json:"composition"`  // "hero", "lifestyle", "product", "flat-lay"
	SuggestedSlotID string `json:"suggested_slot_id"`
}

// RunPromptGeneration executes the prompt generation stage
func (pa *PromptAgent) RunPromptGeneration(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost) (*PromptOutput, error) {
	log.Printf("[blog] Starting prompt generation for post %s", post.ID.Hex())
	now := time.Now()

	contentSummary := pa.extractContentSummary(post.Blocks)

	coverPrompt, err := pa.generateCoverPrompt(ctx, run, post, contentSummary)
	if err != nil {
		return nil, fmt.Errorf("failed to generate cover prompt: %w", err)
	}

	inlinePrompts, err := pa.generateInlinePrompts(ctx, run, post, contentSummary)
	if err != nil {
		return nil, fmt.Errorf("failed to generate inline prompts: %w", err)
	}

	output := &PromptOutput{
		CoverPrompt:   *coverPrompt,
		InlinePrompts: inlinePrompts,
	}

	// Update run status
	run.Status = "prompts_approved"
	run.ApprovedAt = &now
	if err := pa.repository.UpdatePipelineRun(ctx, run); err != nil {
		return nil, fmt.Errorf("failed to update run status: %w", err)
	}

	log.Printf("[blog] Prompt generation completed: 1 cover, %d inline", len(inlinePrompts))
	return output, nil
}

// extractContentSummary creates a text summary of the article content
func (pa *PromptAgent) extractContentSummary(blocks []models.BlogBlock) string {
	var sb strings.Builder

	for _, block := range blocks {
		switch block.Type {
		case models.BlockTypeText, models.BlockTypeTitle, models.BlockTypeHeader, models.BlockTypeQuote:
			sb.WriteString(block.Text)
			sb.WriteString("\n\n")
		case models.BlockTypeList:
			for _, item := range block.Items {
				sb.WriteString(item)
				sb.WriteString("\n")
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// formatOptionalContext renders the pipeline run's and post's targeting
// fields (audience, tone, keywords, tags, excerpt, notes) as a bullet list,
// omitting any that are empty. Without this, the prompt model only ever sees
// the title and category, and defaults to generic "fashion imagery" instead
// of imagery grounded in what the article and campaign actually call for.
func formatOptionalContext(run *models.BlogPipelineRun, post *models.BlogPost) string {
	var sb strings.Builder
	writeIf := func(label, value string) {
		if value != "" {
			sb.WriteString(fmt.Sprintf("- %s: %s\n", label, value))
		}
	}
	writeIf("Excerpt", post.Excerpt)
	writeIf("Target Audience", run.TargetAudience)
	writeIf("Tone", run.Tone)
	if len(run.Keywords) > 0 {
		writeIf("Keywords", strings.Join(run.Keywords, ", "))
	}
	if len(post.Tags) > 0 {
		writeIf("Tags", strings.Join(post.Tags, ", "))
	}
	writeIf("Additional Notes", run.AdditionalNotes)

	if sb.Len() == 0 {
		return ""
	}
	return "\n**Additional Context:**\n" + sb.String()
}

// generateCoverPrompt creates a prompt for the cover image
func (pa *PromptAgent) generateCoverPrompt(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost, contentSummary string) (*ImagePrompt, error) {
	prompt := fmt.Sprintf(`You are an expert at creating image generation prompts for a Persian fashion e-commerce blog.

**Article Context:**
- Title: %s
- Category: %s
- Content Summary: %s
%s
**Voxcina Brand Colors:**
- Deep Blue: #1A3C69
- Warm Cream: #F4F1EC
- Dark Blue: #0A1B3C
- Light Cream: #FCFAF8

**Instructions:**
1. Create a visually stunning cover image prompt
2. Use Voxcina brand colors prominently
3. Suggest fashion-related imagery (clothing, accessories, style)
4. Include mood and atmosphere descriptors
5. Specify composition (hero shot, lifestyle, flat-lay, etc.)
6. Aspect ratio: 16:9 (1200x630 pixels)

**Realism & Authenticity Requirements (critical):**
- The prompt must describe a scene that reads as a real photograph someone took themselves — never as AI-generated, CGI, or a render.
- Set the scene in a modern, contemporary Persian/Iranian context: modern Iranian interior or street/lifestyle setting, contemporary Tehran-style architecture or decor, modern Persian fashion sensibility — not a generic or Western-default backdrop.
- Explicitly describe camera-realistic qualities: natural or ambient lighting, authentic soft shadows, candid (not perfectly staged/centered) framing, shallow depth of field, real fabric/skin texture with natural imperfections — e.g. "shot on a mirrorless camera, 35-50mm lens, natural window light, candid moment, photojournalistic feel."
- Never describe glossy/plastic-smooth skin, unnatural symmetry, surreal/dreamlike elements, or hyper-saturated "AI art" rendering — these read as artificial and must be avoided.

**Prohibited:**
- Embedded text or typography
- Logos or watermarks
- Unrelated colors outside the palette
- Distorted garments or anatomy
- Culturally inappropriate styling
- Any look that reads as AI-generated/CGI/render (overly smooth, plastic, symmetric, dreamlike, over-saturated)

Return a JSON object:
{
  "prompt": "detailed image generation prompt in English",
  "alt_text": "Persian alt text for accessibility",
  "caption": "Persian caption for the image",
  "aspect_ratio": "16:9",
  "composition": "hero|lifestyle|flat-lay|product"
}

Write the prompt in English for image model compatibility, but alt_text and caption in Persian.`,
		post.Title,
		post.Category,
		truncateString(contentSummary, 4000),
		formatOptionalContext(run, post),
	)

	output, err := pa.openRouter.CallWithSchemaAndModel(ctx, prompt, imagePromptSchema(), run.Model)
	if err != nil {
		return nil, err
	}

	var result ImagePrompt
	if err := parseBSONToStruct(output, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// generateInlinePrompts creates prompts for inline images
func (pa *PromptAgent) generateInlinePrompts(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost, contentSummary string) ([]ImagePrompt, error) {
	// Count actual image blocks in the post to match exactly
	var imageSlots []string
	for _, block := range post.Blocks {
		if block.Type == "image" && block.ImageSlotID != "" {
			imageSlots = append(imageSlots, block.ImageSlotID)
		}
	}

	// Fallback: if no image blocks found, use word count heuristic
	if len(imageSlots) == 0 {
		wordCount := estimateWordCount(contentSummary)
		if wordCount < 800 {
			imageSlots = []string{"img-1"}
		} else if wordCount < 1400 {
			imageSlots = []string{"img-1", "img-2"}
		} else {
			imageSlots = []string{"img-1", "img-2", "img-3"}
		}
	}

	// Build each slot's local surrounding text up front so the model sees
	// every slot's context in one call, rather than one slot at a time with
	// no idea what the other images in the article will look like.
	var slotsBlock strings.Builder
	for i, slotId := range imageSlots {
		contextWindow := pa.getContextWindow(post.Blocks, i, len(imageSlots))
		fmt.Fprintf(&slotsBlock, "\nSlot %d (id: %s):\n%s\n", i+1, slotId, contextWindow)
	}

	prompt := fmt.Sprintf(`You are an expert at creating image generation prompts for inline images in a Persian fashion blog.

**Article Title:** %s
**Category:** %s
%s
**Image Slots (in article order):**%s

**Voxcina Brand Colors:**
- Deep Blue: #1A3C69
- Warm Cream: #F4F1EC
- Dark Blue: #0A1B3C
- Light Cream: #FCFAF8

**Instructions:**
1. Create one image prompt per slot listed above, in the same order, that complements that slot's surrounding text
2. Use Voxcina brand colors
3. Suggest fashion-related imagery relevant to each slot's specific context — ground each prompt in the garments, styling, or scenario that slot's text actually discusses, not generic fashion filler
4. Aspect ratio: 16:10 (1600x1000 pixels) for every slot

**Diversity Requirement (critical):**
- Every slot's image must be visually distinct from every other slot's image in this set: vary the setting/location, composition (hero/lifestyle/flat-lay/product/detail — don't repeat the same one twice if there are 3+ slots and it can be avoided), framing, model pose or presence, and mood.
- Two slots covering similar text may still need to look different — differentiate by camera angle, distance, location, or focal subject so the finished set doesn't read as the same photo repeated.

**Realism & Authenticity Requirements (critical):**
- Each prompt must describe a scene that reads as a real photograph someone took themselves — never as AI-generated, CGI, or a render.
- Set each scene in a modern, contemporary Persian/Iranian context: modern Iranian interior or street/lifestyle setting, contemporary Tehran-style architecture or decor, modern Persian fashion sensibility — not a generic or Western-default backdrop.
- Explicitly describe camera-realistic qualities: natural or ambient lighting, authentic soft shadows, candid (not perfectly staged/centered) framing, shallow depth of field, real fabric/skin texture with natural imperfections — e.g. "shot on a mirrorless camera, 35-50mm lens, natural window light, candid moment, photojournalistic feel."
- Never describe glossy/plastic-smooth skin, unnatural symmetry, surreal/dreamlike elements, or hyper-saturated "AI art" rendering — these read as artificial and must be avoided.

**Prohibited:**
- Embedded text or typography
- Logos or watermarks
- Unrelated colors
- Distorted garments or anatomy
- Culturally inappropriate styling
- Any look that reads as AI-generated/CGI/render (overly smooth, plastic, symmetric, dreamlike, over-saturated)

Return a JSON object:
{
  "prompts": [
    {
      "prompt": "detailed image generation prompt in English",
      "alt_text": "Persian alt text for accessibility",
      "caption": "Persian caption for the image",
      "aspect_ratio": "16:10",
      "composition": "hero|lifestyle|flat-lay|product|detail"
    }
  ]
}

The "prompts" array must have exactly %d entries, in the same order as the slots listed above.
Write prompts in English, but alt_text and caption in Persian.`,
		post.Title,
		post.Category,
		formatOptionalContext(run, post),
		slotsBlock.String(),
		len(imageSlots),
	)

	output, err := pa.openRouter.CallWithSchemaAndModel(ctx, prompt, inlinePromptsSchema(len(imageSlots)), run.Model)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Prompts []ImagePrompt `json:"prompts"`
	}
	if err := parseBSONToStruct(output, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Prompts) != len(imageSlots) {
		return nil, fmt.Errorf("expected %d inline prompts, got %d", len(imageSlots), len(parsed.Prompts))
	}

	prompts := make([]ImagePrompt, 0, len(imageSlots))
	for i, slotId := range imageSlots {
		result := parsed.Prompts[i]
		result.SuggestedSlotID = slotId
		prompts = append(prompts, result)
	}

	return prompts, nil
}

// getContextWindow extracts text surrounding the image position
func (pa *PromptAgent) getContextWindow(blocks []models.BlogBlock, imageIndex, totalImages int) string {
	if len(blocks) == 0 {
		return ""
	}

	// Find actual positions of image blocks
	var imagePositions []int
	for i, b := range blocks {
		if b.Type == models.BlockTypeImage {
			imagePositions = append(imagePositions, i)
		}
	}

	// If we have actual image positions, use them
	if imageIndex < len(imagePositions) {
		pos := imagePositions[imageIndex]
		startIdx := pos - 2
		endIdx := pos + 2
		if startIdx < 0 {
			startIdx = 0
		}
		if endIdx >= len(blocks) {
			endIdx = len(blocks) - 1
		}

		var sb strings.Builder
		for i := startIdx; i <= endIdx; i++ {
			if blocks[i].Type != models.BlockTypeImage {
				if blocks[i].Text != "" {
					sb.WriteString(blocks[i].Text)
					sb.WriteString("\n\n")
				}
			}
		}
		return sb.String()
	}

	// Fallback: estimate position based on text blocks
	textBlockIndex := imageIndex * (len(blocks) / (totalImages + 1))
	startIdx := textBlockIndex - 2
	endIdx := textBlockIndex + 2
	if startIdx < 0 {
		startIdx = 0
	}
	if endIdx >= len(blocks) {
		endIdx = len(blocks) - 1
	}

	var sb strings.Builder
	for i := startIdx; i <= endIdx; i++ {
		if blocks[i].Type == models.BlockTypeText || blocks[i].Type == models.BlockTypeHeader || blocks[i].Type == models.BlockTypeQuote {
			sb.WriteString(blocks[i].Text)
			sb.WriteString("\n\n")
		}
	}

	return sb.String()
}

// estimateWordCount estimates word count from text
func estimateWordCount(text string) int {
	words := strings.Fields(text)
	return len(words)
}

// imagePromptItemProperties returns the shared property schema for a single
// image prompt, used both standalone (cover) and as an array item (inline).
// Strict-compatible shape; additionalProperties:false is added by callers.
func imagePromptItemProperties() map[string]interface{} {
	return map[string]interface{}{
		"prompt":   map[string]interface{}{"type": "string"},
		"alt_text": map[string]interface{}{"type": "string"},
		"caption":  map[string]interface{}{"type": "string"},
		"aspect_ratio": map[string]interface{}{
			"type": "string",
			"enum": []string{"16:9", "16:10", "4:3", "1:1"},
		},
		"composition": map[string]interface{}{
			"type": "string",
			"enum": []string{"hero", "lifestyle", "flat-lay", "product", "detail"},
		},
	}
}

// imagePromptSchema returns the JSON schema for a single image prompt (cover image)
// Strict-compatible for OpenAI strict models (gpt-5, gpt-4o) while still
// accepted by qwen/deepseek.
func imagePromptSchema() map[string]interface{} {
	return map[string]interface{}{
		"name":   "image_prompt",
		"strict": true,
		"schema": map[string]interface{}{
			"type":                 "object",
			"properties":           imagePromptItemProperties(),
			"required":             []string{"prompt", "alt_text", "caption", "aspect_ratio", "composition"},
			"additionalProperties": false,
		},
	}
}

// inlinePromptsSchema returns the JSON schema for a batch of inline image
// prompts generated together, so the model produces the whole set — and can
// diversify across it — in a single structured response instead of one
// context-blind call per slot. Strict-compatible.
func inlinePromptsSchema(count int) map[string]interface{} {
	return map[string]interface{}{
		"name":   "inline_image_prompts",
		"strict": true,
		"schema": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"prompts": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type":                 "object",
						"properties":           imagePromptItemProperties(),
						"required":             []string{"prompt", "alt_text", "caption", "aspect_ratio", "composition"},
						"additionalProperties": false,
					},
					"minItems": count,
					"maxItems": count,
				},
			},
			"required":             []string{"prompts"},
			"additionalProperties": false,
		},
	}
}
