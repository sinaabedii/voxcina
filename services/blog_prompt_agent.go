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
	CoverPrompt    ImagePrompt `json:"cover_prompt"`
	InlinePrompts  []ImagePrompt `json:"inline_prompts"`
}

// ImagePrompt represents a prompt for image generation
type ImagePrompt struct {
	Prompt          string `json:"prompt"`
	AltText         string `json:"alt_text"`
	Caption         string `json:"caption"`
	AspectRatio     string `json:"aspect_ratio"`     // "16:9", "4:3", "1:1"
	Composition     string `json:"composition"`      // "hero", "lifestyle", "product", "flat-lay"
	SuggestedSlotID string `json:"suggested_slot_id"`
}

// RunPromptGeneration executes the prompt generation stage
func (pa *PromptAgent) RunPromptGeneration(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost) (*PromptOutput, error) {
	log.Printf("[blog] Starting prompt generation for post %s", post.ID.Hex())
	now := time.Now()

	// Extract content from blocks
	contentSummary := pa.extractContentSummary(post.Blocks)

	// Generate cover prompt
	coverPrompt, err := pa.generateCoverPrompt(ctx, run, post, contentSummary)
	if err != nil {
		return nil, fmt.Errorf("failed to generate cover prompt: %w", err)
	}

	// Generate inline image prompts
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

// generateCoverPrompt creates a prompt for the cover image
func (pa *PromptAgent) generateCoverPrompt(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost, contentSummary string) (*ImagePrompt, error) {
	prompt := fmt.Sprintf(`You are an expert at creating image generation prompts for a Persian fashion e-commerce blog.

**Article Context:**
- Title: %s
- Category: %s
- Content Summary: %s

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
		truncateString(contentSummary, 1000),
	)

	output, err := pa.openRouter.CallWithSchema(ctx, prompt, imagePromptSchema())
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

	prompts := make([]ImagePrompt, 0, len(imageSlots))

	for i, slotId := range imageSlots {
		// Get surrounding context for this image
		contextWindow := pa.getContextWindow(post.Blocks, i, len(imageSlots))

		prompt := fmt.Sprintf(`You are an expert at creating image generation prompts for inline images in a Persian fashion blog.

**Article Title:** %s
**Surrounding Content:** %s

**Voxcina Brand Colors:**
- Deep Blue: #1A3C69
- Warm Cream: #F4F1EC
- Dark Blue: #0A1B3C
- Light Cream: #FCFAF8

**Instructions:**
1. Create an image prompt that complements the surrounding text
2. Use Voxcina brand colors
3. Suggest fashion-related imagery relevant to the context
4. Specify composition and mood
5. Aspect ratio: 16:10 (1600x1000 pixels)

**Realism & Authenticity Requirements (critical):**
- The prompt must describe a scene that reads as a real photograph someone took themselves — never as AI-generated, CGI, or a render.
- Set the scene in a modern, contemporary Persian/Iranian context: modern Iranian interior or street/lifestyle setting, contemporary Tehran-style architecture or decor, modern Persian fashion sensibility — not a generic or Western-default backdrop.
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
  "prompt": "detailed image generation prompt in English",
  "alt_text": "Persian alt text for accessibility",
  "caption": "Persian caption for the image",
  "aspect_ratio": "16:10",
  "composition": "hero|lifestyle|flat-lay|product|detail"
}

Write the prompt in English, but alt_text and caption in Persian.`,
		post.Title,
		contextWindow,
	)

		output, err := pa.openRouter.CallWithSchema(ctx, prompt, imagePromptSchema())
		if err != nil {
			return nil, err
		}

		var result ImagePrompt
		if err := parseBSONToStruct(output, &result); err != nil {
			return nil, err
		}

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

// imagePromptSchema returns the JSON schema for image prompts
func imagePromptSchema() map[string]interface{} {
	return map[string]interface{}{
		"name": "image_prompt",
		"schema": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"prompt":       map[string]interface{}{"type": "string"},
				"alt_text":     map[string]interface{}{"type": "string"},
				"caption":      map[string]interface{}{"type": "string"},
				"aspect_ratio": map[string]interface{}{
					"type": "string",
					"enum": []string{"16:9", "16:10", "4:3", "1:1"},
				},
				"composition": map[string]interface{}{
					"type": "string",
					"enum": []string{"hero", "lifestyle", "flat-lay", "product", "detail"},
				},
			},
			"required": []string{"prompt", "alt_text", "caption", "aspect_ratio", "composition"},
		},
	}
}
