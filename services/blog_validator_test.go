package handlers

import (
	"context"
	"net/http"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
	"backEnd/services"
)

// TestBlogValidator_BlockOrder tests block ordering validation.
func TestBlogValidator_BlockOrder(t *testing.T) {
	tests := []struct {
		name    string
		blocks  []models.BlogBlock
		wantErr bool
	}{
		{
			name:    "empty blocks",
			blocks:  []models.BlogBlock{},
			wantErr: true,
		},
		{
			name: "valid: title first, text, image, text",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeTitle, Text: "Title"},
				{Type: models.BlockTypeText, Text: "Some text"},
				{Type: models.BlockTypeImage, ImageSlotID: "img1"},
				{Type: models.BlockTypeText, Text: "More text"},
			},
			wantErr: false,
		},
		{
			name: "invalid: no title first",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeText, Text: "Text"},
				{Type: models.BlockTypeTitle, Text: "Title"},
			},
			wantErr: true,
		},
		{
			name: "invalid: two titles",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeTitle, Text: "Title 1"},
				{Type: models.BlockTypeTitle, Text: "Title 2"},
			},
			wantErr: true,
		},
		{
			name: "invalid: consecutive same heading",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeTitle, Text: "Title"},
				{Type: models.BlockTypeHeader, Text: "Header 1"},
				{Type: models.BlockTypeHeader, Text: "Header 2"},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vr := services.ValidateBlockOrder(tt.blocks)
			if (vr.IsValid() == false) != tt.wantErr {
				t.Errorf("ValidateBlockOrder() validity = %v, wantErr %v, errors: %v", vr.IsValid(), tt.wantErr, vr.Error())
			}
		})
	}
}

// TestBlogValidator_ImageCountPolicy tests image count based on word count.
func TestBlogValidator_ImageCountPolicy(t *testing.T) {
	tests := []struct {
		name       string
		textWords  int
		imageCount int
		wantErr    bool
	}{
		{"under 800 words, 1 image", 500, 1, false},
		{"under 800 words, 2 images", 500, 2, true},
		{"800-1400 words, 2 images", 1000, 2, false},
		{"800-1400 words, 1 image", 1000, 1, true},
		{"above 1400 words, 3 images", 2000, 3, false},
		{"above 1400 words, 2 images", 2000, 2, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			blocks := make([]models.BlogBlock, 0, tt.textWords/100+tt.imageCount)
			blocks = append(blocks, models.BlogBlock{Type: models.BlockTypeTitle, Text: "Title"})

			// Add text blocks to reach target word count
			wordsPerBlock := 100
			if wordsPerBlock == 0 {
				wordsPerBlock = 1
			}
			numTextBlocks := tt.textWords / wordsPerBlock
			for i := 0; i < numTextBlocks; i++ {
				words := make([]string, wordsPerBlock)
				for j := range words {
					words[j] = "word"
				}
				blocks = append(blocks, models.BlogBlock{Type: models.BlockTypeText, Text: joinWords(words)})
			}

			// Add image blocks
			for i := 0; i < tt.imageCount; i++ {
				blocks = append(blocks, models.BlogBlock{Type: models.BlockTypeImage, ImageSlotID: "img" + string(rune('0'+i))})
			}

			vr := services.ValidateImageCountPolicy(blocks)
			if (vr.IsValid() == false) != tt.wantErr {
				t.Errorf("ValidateImageCountPolicy() validity = %v, wantErr %v, errors: %v", vr.IsValid(), tt.wantErr, vr.Error())
			}
		})
	}
}

// TestBlogValidator_HeadingHierarchy tests heading level validation.
func TestBlogValidator_HeadingHierarchy(t *testing.T) {
	tests := []struct {
		name    string
		blocks  []models.BlogBlock
		wantErr bool
	}{
		{
			name: "valid: H1 -> H2 -> H3",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeTitle, Text: "Title"},
				{Type: models.BlockTypeHeader, Text: "Header"},
				{Type: models.BlockTypeSection, Text: "Section"},
			},
			wantErr: false,
		},
		{
			name: "invalid: H1 -> H3 (skip H2)",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeTitle, Text: "Title"},
				{Type: models.BlockTypeSection, Text: "Section"},
			},
			wantErr: true,
		},
		{
			name: "invalid: first heading not H1",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeHeader, Text: "Header"},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vr := services.ValidateHeadingHierarchy(tt.blocks)
			if (vr.IsValid() == false) != tt.wantErr {
				t.Errorf("ValidateHeadingHierarchy() validity = %v, wantErr %v, errors: %v", vr.IsValid(), tt.wantErr, vr.Error())
			}
		})
	}
}

// TestBlogValidator_PublicationReadiness tests publication readiness.
func TestBlogValidator_PublicationReadiness(t *testing.T) {
	post := &models.BlogPost{
		CoverImageID: "cover-123",
		Blocks: []models.BlogBlock{
			{Type: models.BlockTypeTitle, Text: "Title"},
			{Type: models.BlockTypeImage, ImageSlotID: "img-1"},
		},
	}

	tests := []struct {
		name     string
		mediaMap map[string]bool
		wantErr  bool
	}{
		{"all media resolved", map[string]bool{"cover": true, "img-1": true}, false},
		{"missing cover", map[string]bool{"img-1": true}, true},
		{"missing image slot", map[string]bool{"cover": true}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vr := services.ValidatePublicationReadiness(post, tt.mediaMap)
			if (vr.IsValid() == false) != tt.wantErr {
				t.Errorf("ValidatePublicationReadiness() validity = %v, wantErr %v, errors: %v", vr.IsValid(), tt.wantErr, vr.Error())
			}
		})
	}
}

// TestBlogValidator_ContentHash tests content hash computation.
func TestBlogValidator_ContentHash(t *testing.T) {
	blocks1 := []models.BlogBlock{
		{Type: models.BlockTypeTitle, Text: "Title"},
		{Type: models.BlockTypeText, Text: "Content"},
	}
	blocks2 := []models.BlogBlock{
		{Type: models.BlockTypeTitle, Text: "Title"},
		{Type: models.BlockTypeText, Text: "Content"},
	}
	blocks3 := []models.BlogBlock{
		{Type: models.BlockTypeTitle, Text: "Different"},
	}

	hash1 := services.ComputeContentHash(blocks1)
	hash2 := services.ComputeContentHash(blocks2)
	hash3 := services.ComputeContentHash(blocks3)

	if hash1 != hash2 {
		t.Errorf("identical blocks should produce identical hashes: %s != %s", hash1, hash2)
	}
	if hash1 == hash3 {
		t.Errorf("different blocks should produce different hashes")
	}
}

// TestBlogValidator_TextBlockNoHTML tests HTML/Markdown rejection.
func TestBlogValidator_TextBlockNoHTML(t *testing.T) {
	tests := []struct {
		name    string
		blocks  []models.BlogBlock
		wantErr bool
	}{
		{
			name: "clean text",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeText, Text: "Plain text without HTML"},
			},
			wantErr: false,
		},
		{
			name: "HTML tags",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeText, Text: "<p>HTML content</p>"},
			},
			wantErr: true,
		},
		{
			name: "Markdown formatting",
			blocks: []models.BlogBlock{
				{Type: models.BlockTypeText, Text: "**bold** and *italic*"},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vr := services.ValidateTextBlockNoHTML(tt.blocks)
			if (vr.IsValid() == false) != tt.wantErr {
				t.Errorf("ValidateTextBlockNoHTML() validity = %v, wantErr %v, errors: %v", vr.IsValid(), tt.wantErr, vr.Error())
			}
		})
	}
}

// TestBlogRepository_StatusTransition tests atomic status transitions.
func TestBlogRepository_StatusTransition(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping DB-dependent test in short mode")
	}

	// This test requires a running MongoDB instance
	// For now, we just test the validation logic
	err := services.ValidateStatusTransition(models.StatusDraft, models.StatusReady)
	if err != nil {
		t.Errorf("expected valid transition draft->ready, got error: %v", err)
	}

	err = services.ValidateStatusTransition(models.StatusDraft, models.StatusPublished)
	if err == nil {
		t.Error("expected error for invalid transition draft->published")
	}
}

// TestBlogValidator_ValidationResult tests ValidationResult methods.
func TestBlogValidator_ValidationResult(t *testing.T) {
	vr := &services.ValidationResult{}

	if vr.IsValid() {
		t.Error("empty ValidationResult should be valid")
	}

	vr.Add("field1", "error1")
	vr.Add("field2", "error2")

	if vr.IsValid() {
		t.Error("ValidationResult with errors should be invalid")
	}

	errMsg := vr.Error()
	if errMsg == "" {
		t.Error("Error() should not be empty")
	}
}

// Helper to join words (avoid importing strings in test)
func joinWords(words []string) string {
	result := ""
	for i, w := range words {
		if i > 0 {
			result += " "
		}
		result += w
	}
	return result
}

// Mock implementations for testing without MongoDB
type mockBlogRepo struct {
	posts    map[primitive.ObjectID]*models.BlogPost
	executions map[primitive.ObjectID]*models.BlogAgentExecution
}

func newMockBlogRepo() *mockBlogRepo {
	return &mockBlogRepo{
		posts:      make(map[primitive.ObjectID]*models.BlogPost),
		executions: make(map[primitive.ObjectID]*models.BlogAgentExecution),
	}
}

func (m *mockBlogRepo) FindPostByID(ctx context.Context, id primitive.ObjectID) (*models.BlogPost, error) {
	post, ok := m.posts[id]
	if !ok {
		return nil, mongo.ErrNoDocuments
	}
	return post, nil
}

func (m *mockBlogRepo) UpdatePost(ctx context.Context, id primitive.ObjectID, set bson.M) error {
	post, ok := m.posts[id]
	if !ok {
		return mongo.ErrNoDocuments
	}
	if status, ok := set["status"].(string); ok {
		post.Status = status
	}
	if blocks, ok := set["blocks"].([]models.BlogBlock); ok {
		post.Blocks = blocks
	}
	return nil
}

func (m *mockBlogRepo) InsertPost(ctx context.Context, post *models.BlogPost) error {
	m.posts[post.ID] = post
	return nil
}
