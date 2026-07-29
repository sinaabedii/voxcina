package services

import (
	"fmt"
	"strings"

	"backEnd/models"
)

// ValidationError represents a validation failure with field and message.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("%s: %s", e.Field, e.Message)
	}
	return e.Message
}

// ValidationResult collects all validation errors.
type ValidationResult struct {
	Errors []ValidationError
}

func (r *ValidationResult) Add(field, message string) {
	r.Errors = append(r.Errors, ValidationError{Field: field, Message: message})
}

func (r *ValidationResult) IsValid() bool {
	return len(r.Errors) == 0
}

func (r *ValidationResult) Error() string {
	var msgs []string
	for _, e := range r.Errors {
		msgs = append(msgs, e.Error())
	}
	return strings.Join(msgs, "; ")
}

// ValidateBlockOrder checks: title first, max 1 title, no consecutive headers,
// and images not first/last or adjacent to another image.
func ValidateBlockOrder(blocks []models.BlogBlock) *ValidationResult {
	vr := &ValidationResult{}
	if len(blocks) == 0 {
		vr.Add("blocks", "at least one block is required")
		return vr
	}

	titleCount := 0
	hasTitleFirst := blocks[0].Type == models.BlockTypeTitle
	if !hasTitleFirst {
		vr.Add("blocks[0]", "first block must be a title")
	}

	for i, b := range blocks {
		switch b.Type {
		case models.BlockTypeTitle:
			titleCount++
			if titleCount > 1 {
				vr.Add(fmt.Sprintf("blocks[%d]", i), "only one title block is allowed")
			}
		case models.BlockTypeHeader:
			if i > 0 && blocks[i-1].Type == b.Type {
				vr.Add(fmt.Sprintf("blocks[%d]", i), "consecutive header blocks are not allowed")
			}
		case models.BlockTypeText, models.BlockTypeList, models.BlockTypeQuote, models.BlockTypeProduct:
			// No adjacency constraint for these content blocks.
		case models.BlockTypeImage:
			if i == 0 || i == len(blocks)-1 {
				vr.Add(fmt.Sprintf("blocks[%d]", i), "image block must not be first or last")
			}
			if i > 0 && blocks[i-1].Type == models.BlockTypeImage {
				vr.Add(fmt.Sprintf("blocks[%d]", i), "image block must not be directly adjacent to another image block")
			}
		default:
			vr.Add(fmt.Sprintf("blocks[%d]", i), fmt.Sprintf("unknown block type: %s", b.Type))
		}
	}

	return vr
}

// ValidateImageCountPolicy enforces max image count based on text word count.
// Excess images are trimmed by trimExcessImages post-validation, so we only
// fail if there are far too many (more than 2x the allowed max).
func ValidateImageCountPolicy(blocks []models.BlogBlock) *ValidationResult {
	vr := &ValidationResult{}
	textWordCount := 0
	imageCount := 0

	for _, b := range blocks {
		switch b.Type {
		case models.BlockTypeText, models.BlockTypeQuote:
			textWordCount += CountWords(b.Text)
		case models.BlockTypeList:
			for _, item := range b.Items {
				textWordCount += CountWords(item)
			}
		case models.BlockTypeImage:
			imageCount++
		}
	}

	_, expectedMax := imagePolicy(textWordCount)
	if imageCount > expectedMax*2 {
		vr.Add("blocks", fmt.Sprintf("too many images (%d) for %d words of text (max %d)", imageCount, textWordCount, expectedMax))
	}

	return vr
}

// imagePolicy returns (min, max) image count based on text word count.
func imagePolicy(wordCount int) (int, int) {
	if wordCount < 800 {
		return 1, 1
	}
	if wordCount <= 1400 {
		return 2, 2
	}
	return 3, 3
}

// HeadingLevel represents the nesting level of a heading block.
type HeadingLevel int

const (
	LevelH1 HeadingLevel = 1
	LevelH2 HeadingLevel = 2
)

// blockTypeToLevel maps block types to heading levels.
func blockTypeToLevel(blockType string) (HeadingLevel, bool) {
	switch blockType {
	case models.BlockTypeTitle:
		return LevelH1, true
	case models.BlockTypeHeader:
		return LevelH2, true
	default:
		return 0, false
	}
}

// ValidateHeadingHierarchy ensures the first heading in the post is the title (H1).
// With only title/header remaining, there's no deeper nesting to skip levels on.
func ValidateHeadingHierarchy(blocks []models.BlogBlock) *ValidationResult {
	vr := &ValidationResult{}
	sawHeading := false

	for i, b := range blocks {
		level, isHeading := blockTypeToLevel(b.Type)
		if !isHeading {
			continue
		}
		if !sawHeading && level != LevelH1 {
			vr.Add(fmt.Sprintf("blocks[%d]", i), fmt.Sprintf("first heading must be title (H1), got %s", b.Type))
		}
		sawHeading = true
	}

	return vr
}

// ValidatePublicationReadiness checks that a post is ready to be published.
func ValidatePublicationReadiness(post *models.BlogPost, mediaMap map[string]bool) *ValidationResult {
	vr := &ValidationResult{}

	if !mediaMap["cover"] {
		vr.Add("coverImageId", "cover image media is not resolved")
	}

	// Check all image slots referenced in blocks are resolved.
	for _, b := range post.Blocks {
		if b.Type == models.BlockTypeImage && b.ImageSlotID != "" {
			if !mediaMap[b.ImageSlotID] {
				vr.Add("blocks", fmt.Sprintf("image slot %s is not resolved", b.ImageSlotID))
			}
		}
	}

	// Check for stale prompts (placeholder text in text blocks).
	for i, b := range post.Blocks {
		if b.Type == models.BlockTypeText && strings.Contains(b.Text, "{{") {
			vr.Add(fmt.Sprintf("blocks[%d]", i), "text block contains unresolved prompt variables")
		}
	}

	// Check that any product recommendation block has been resolved to a real product.
	for i, b := range post.Blocks {
		if b.Type == models.BlockTypeProduct && b.ProductID == "" {
			vr.Add(fmt.Sprintf("blocks[%d]", i), "product block has not been resolved to a product yet")
		}
	}

	return vr
}

// ValidateTextBlockNoHTML ensures free-text block content doesn't contain HTML or Markdown.
func ValidateTextBlockNoHTML(blocks []models.BlogBlock) *ValidationResult {
	vr := &ValidationResult{}

	check := func(i int, label, text string) {
		if text == "" {
			return
		}
		if strings.ContainsAny(text, "<>") {
			vr.Add(fmt.Sprintf("blocks[%d]", i), fmt.Sprintf("%s must not contain HTML tags", label))
		}
		if strings.ContainsAny(text, "*_`") {
			vr.Add(fmt.Sprintf("blocks[%d]", i), fmt.Sprintf("%s must not contain Markdown formatting", label))
		}
	}

	for i, b := range blocks {
		switch b.Type {
		case models.BlockTypeTitle, models.BlockTypeHeader, models.BlockTypeText, models.BlockTypeQuote:
			check(i, "text", b.Text)
		case models.BlockTypeList:
			for _, item := range b.Items {
				check(i, "list item", item)
			}
		}
	}
	return vr
}

// BlogValidator validates blog blocks and orchestrates all block-level checks.
type BlogValidator struct{}

// NewBlogValidator creates a new BlogValidator.
func NewBlogValidator() *BlogValidator {
	return &BlogValidator{}
}

// ValidateBlocks runs all block validations and returns a combined error if invalid.
func (v *BlogValidator) ValidateBlocks(blocks []models.BlogBlock) error {
	combined := &ValidationResult{}
	combined.Errors = append(combined.Errors, ValidateBlockOrder(blocks).Errors...)
	combined.Errors = append(combined.Errors, ValidateHeadingHierarchy(blocks).Errors...)
	combined.Errors = append(combined.Errors, ValidateTextBlockNoHTML(blocks).Errors...)
	combined.Errors = append(combined.Errors, ValidateImageCountPolicy(blocks).Errors...)

	if !combined.IsValid() {
		return fmt.Errorf("block validation failed: %s", combined.Error())
	}
	return nil
}
