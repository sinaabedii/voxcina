package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

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
	startTime := time.Now()
	now := time.Now()
	completedAt := &now

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

	// Save execution record
	execution := models.BlogAgentExecution{
		PipelineRunID: run.ID,
		Stage:         "prompts",
		Attempt:       1,
		InputSnapshot: bson.M{
			"post_id": post.ID,
			"blocks":  post.Blocks,
		},
		ParsedOutput: bson.M{
			"cover_prompt":  coverPrompt,
			"inline_prompts": inlinePrompts,
		},
		PromptKey:     "blog_image_prompts",
		PromptVersion: "1.0",
		RenderedPrompt: output.CoverPrompt.Prompt,
		Provider:      "openrouter",
		Model:         "google/gemini-2.5-flash-image",
		DurationMs:    int64(time.Since(startTime).Milliseconds()),
		Status:        "completed",
		CreatedAt:     time.Now(),
		StartedAt:     &startTime,
		CompletedAt:   completedAt,
	}

	if err := pa.repository.InsertAgentExecution(ctx, &execution); err != nil {
		log.Printf("[blog] Warning: failed to save execution record: %v", err)
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
		if block.Type == "text" || block.Type == "title" || block.Type == "header" || block.Type == "section" || block.Type == "subsection" {
			sb.WriteString(block.Text)
			sb.WriteString("\n\n")
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

**Prohibited:**
- Embedded text or typography
- Logos or watermarks
- Unrelated colors outside the palette
- Distorted garments or anatomy
- Culturally inappropriate styling

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
	// Count text blocks to determine image count
	textBlockCount := 0
	for _, block := range post.Blocks {
		if block.Type == "text" {
			textBlockCount++
		}
	}

	// Determine image count based on word count
	wordCount := estimateWordCount(contentSummary)
	var imageCount int

	if wordCount < 800 {
		imageCount = 1
	} else if wordCount <= 1400 {
		imageCount = 2
	} else {
		imageCount = 3
	}

	prompts := make([]ImagePrompt, 0, imageCount)

	for i := 0; i < imageCount; i++ {
		// Get surrounding context for this image
		contextWindow := pa.getContextWindow(post.Blocks, i, imageCount)

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

**Prohibited:**
- Embedded text or typography
- Logos or watermarks
- Unrelated colors
- Distorted garments or anatomy
- Culturally inappropriate styling

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

		result.SuggestedSlotID = fmt.Sprintf("img-%d", i+1)
		prompts = append(prompts, result)
	}

	return prompts, nil
}

// getContextWindow extracts text surrounding the image position
func (pa *PromptAgent) getContextWindow(blocks []models.BlogBlock, imageIndex, totalImages int) string {
	if len(blocks) == 0 {
		return ""
	}

	// Calculate text block index for this image
	textBlockIndex := imageIndex * (len(blocks) / (totalImages + 1))

	// Get surrounding blocks
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
		if blocks[i].Type == "text" || blocks[i].Type == "header" || blocks[i].Type == "section" || blocks[i].Type == "subsection" {
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
