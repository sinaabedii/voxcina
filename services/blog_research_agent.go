package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"backEnd/models"
)

// ResearchAgent handles the research stage of blog generation
type ResearchAgent struct {
	braveClient *BraveSearchClient
	openRouter  *OpenRouterStructuredClient
	repository  *BlogRepository
}

// NewResearchAgent creates a new research agent
func NewResearchAgent(braveClient *BraveSearchClient, openRouter *OpenRouterStructuredClient, repository *BlogRepository) *ResearchAgent {
	return &ResearchAgent{
		braveClient: braveClient,
		openRouter:  openRouter,
		repository:  repository,
	}
}

// ResearchFinding represents a finding from research
type ResearchFinding struct {
	Claim      string  `json:"claim"`
	Evidence   string  `json:"evidence"`
	Confidence float64 `json:"confidence"`
	Sources    []string `json:"sources"` // source IDs
}

// ResearchOutline represents the recommended article structure
type ResearchOutline struct {
	Title       string   `json:"title"`
	Sections    []string `json:"sections"`
	Subsections []string `json:"subsections"`
	KeyPoints   []string `json:"key_points"`
}

// ResearchOutput is the structured output from the research agent
type ResearchOutput struct {
	Findings         []ResearchFinding `json:"findings"`
	Outline          ResearchOutline   `json:"outline"`
	Uncertainties    []string          `json:"uncertainties"`
	ProhibitedClaims []string          `json:"prohibited_claims"`
	RecommendedCategory string         `json:"recommended_category"`
	RecommendedTags    []string         `json:"recommended_tags"`
}

// ResearchSnapshot is what gets passed to the writing agent
type ResearchSnapshot struct {
	Output          ResearchOutput           `json:"output"`
	Sources         []models.BlogResearchSource `json:"sources"`
	GeneratedAt     time.Time                `json:"generated_at"`
	GenerationBrief models.GenerationBrief   `json:"generation_brief"`
}

// RunResearch executes the research stage
func (ra *ResearchAgent) RunResearch(ctx context.Context, run *models.BlogPipelineRun, brief *models.GenerationBrief) (*ResearchSnapshot, error) {
	log.Printf("[blog] Starting research for run %s, topic: %s", run.ID.Hex(), brief.Topic)
	startTime := time.Now()
	now := time.Now()
	completedAt := &now

	// Generate search queries
	queries := ra.generateQueries(brief)
	log.Printf("[blog] Generated %d search queries", len(queries))

	// Fetch research from Brave
	allSources := make([]models.BlogResearchSource, 0)

	type braveResult struct {
		URL              string
		Title            string
		Snippet          string
		ExtractedContent string
	}

	if !ra.braveClient.IsAvailable() {
		log.Printf("[blog] BRAVE_SEARCH_API_KEY not set, skipping web search - will generate research from LLM knowledge only")
	} else {
		for i, query := range queries {
			if i > 0 {
				time.Sleep(1500 * time.Millisecond) // Rate limit: free plan allows 1 req/sec
			}
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}

			// Use Web Search API (LLM Context requires paid plan)
			var rawSources []braveResult

			webResults, werr := ra.braveClient.SearchWeb(ctx, query, SearchOptions{Count: 5})
			if werr != nil {
				if strings.Contains(werr.Error(), "429") {
					log.Printf("[blog] Rate limited for query '%s', skipping", query)
				} else {
					log.Printf("[blog] Web search failed for query '%s': %v", query, werr)
				}
				continue
			}
			for _, r := range webResults {
				rawSources = append(rawSources, braveResult{URL: r.URL, Title: r.Title, Snippet: r.Snippet, ExtractedContent: r.Snippet})
			}

			// Process sources
			for i, src := range rawSources {
				source := models.BlogResearchSource{
					PipelineRunID:    run.ID,
					Query:            query,
					Provider:         "brave_llm_context",
					URL:              src.URL,
					Title:            src.Title,
					Snippet:          src.Snippet,
					ExtractedContent: src.ExtractedContent,
					SourceIndex:      i,
					FetchedAt:        time.Now(),
					CreatedAt:        time.Now(),
				}

				// Extract claims from content
				claims := ra.extractClaims(src.ExtractedContent, src.URL)
				source.Claims = claims

				allSources = append(allSources, source)
			}
		}
	}

	// Generate research output using OpenRouter
	researchOutput, err := ra.generateResearchOutput(ctx, brief, allSources)
	if err != nil {
		return nil, fmt.Errorf("failed to generate research output: %w", err)
	}

	// Save sources to database
	for _, source := range allSources {
		if err := ra.repository.InsertResearchSource(ctx, &source); err != nil {
			log.Printf("[blog] Warning: failed to save source %s: %v", source.URL, err)
		}
	}

	// Save execution record
	execution := models.BlogAgentExecution{
		PipelineRunID: run.ID,
		Stage:         "research",
		Attempt:       1,
		InputSnapshot: bson.M{
			"brief":   brief,
			"queries": queries,
		},
		ParsedOutput: bson.M{
			"findings":            researchOutput.Findings,
			"outline":             researchOutput.Outline,
			"uncertainties":       researchOutput.Uncertainties,
			"prohibited_claims":   researchOutput.ProhibitedClaims,
			"recommended_category": researchOutput.RecommendedCategory,
			"recommended_tags":    researchOutput.RecommendedTags,
		},
		Provider:    "openrouter",
		Model:       "qwen/qwen3.7-plus",
		TokenUsage:  0,
		DurationMs:  int64(time.Since(startTime).Milliseconds()),
		Status:      "completed",
		CreatedAt:   time.Now(),
		StartedAt:   &startTime,
		CompletedAt: completedAt,
	}

	if err := ra.repository.InsertAgentExecution(ctx, &execution); err != nil {
		log.Printf("[blog] Warning: failed to save execution record: %v", err)
	}

	snapshot := &ResearchSnapshot{
		Output:          *researchOutput,
		Sources:         allSources,
		GeneratedAt:     time.Now(),
		GenerationBrief: *brief,
	}

	// Update run status
	run.Status = "research_approved"
	run.ApprovedAt = &now
	if err := ra.repository.UpdatePipelineRun(ctx, run); err != nil {
		return nil, fmt.Errorf("failed to update run status: %w", err)
	}

	log.Printf("[blog] Research completed: %d sources, %d findings", len(allSources), len(researchOutput.Findings))
	return snapshot, nil
}

// generateQueries creates search queries from the generation brief
func (ra *ResearchAgent) generateQueries(brief *models.GenerationBrief) []string {
	queries := []string{
		brief.Topic,
		brief.Topic + " guide",
		brief.Topic + " tips",
		brief.Topic + " trends 2026",
		brief.Topic + " how to",
	}

	// Add Persian queries if locale is Persian
	if brief.Locale == "fa" || brief.Locale == "fa-IR" {
		queries = append(queries,
			brief.Topic+" راهنما",
			brief.Topic+" نکات",
			brief.Topic+" ترندها",
		)
	}

	// Add keyword-based queries
	for _, keyword := range brief.Keywords {
		queries = append(queries, keyword+" "+brief.Topic)
	}

	return queries
}

// extractClaims extracts factual claims from content
func (ra *ResearchAgent) extractClaims(content, sourceURL string) []models.Claim {
	claims := make([]models.Claim, 0)

	// Simple claim extraction: look for sentences with facts
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) < 20 || len(line) > 500 {
			continue
		}

		// Heuristic: sentences with numbers, percentages, or specific terms
		if containsFactIndicators(line) {
			claim := models.Claim{
				Claim:      line,
				Evidence:   sourceURL,
				Confidence: 0.7,
			}
			claims = append(claims, claim)
		}
	}

	return claims
}

// containsFactIndicators checks if a line contains fact-like indicators
func containsFactIndicators(text string) bool {
	factors := []string{
		"%", "million", "billion", "thousand",
		"202", "2025", "2026", "2027",
		"increase", "decrease", "grow", "decline",
		"according to", "studies show", "research indicates",
	}

	textLower := strings.ToLower(text)
	for _, factor := range factors {
		if strings.Contains(textLower, factor) {
			return true
		}
	}

	return false
}

// generateResearchOutput uses OpenRouter to synthesize research
func (ra *ResearchAgent) generateResearchOutput(ctx context.Context, brief *models.GenerationBrief, sources []models.BlogResearchSource) (*ResearchOutput, error) {
	// Build context from sources
	contextText := ra.buildResearchContext(sources)

	// Prepare prompt
	prompt := fmt.Sprintf(`You are a research agent for a Persian fashion e-commerce blog.

Generate comprehensive research for the following topic:

**Topic:** %s
**Audience:** %s
**Desired Length:** %d
**Tone:** %s
**Keywords:** %s
**Category:** %s

**Available Sources:**
%s

**Instructions:**
1. Extract key findings with source citations
2. Identify uncertainties and gaps in knowledge
3. Flag any claims that need verification or are prohibited
4. Recommend article structure (outline)
5. Suggest category and tags

Return a JSON object with this structure:
{
  "findings": [
    {
      "claim": "factual statement",
      "evidence": "source URL or description",
      "confidence": 0.8,
      "sources": ["source_id_1", "source_id_2"]
    }
  ],
  "outline": {
    "title": "recommended article title",
    "sections": ["section 1", "section 2"],
    "subsections": ["subsection 1.1", "subsection 1.2"],
    "key_points": ["point 1", "point 2"]
  },
  "uncertainties": ["what we're not sure about"],
  "prohibited_claims": ["claims that should not be made"],
  "recommended_category": "category name",
  "recommended_tags": ["tag1", "tag2"]
}

Write the response in Persian for the article content, but keep the JSON structure in English.`,
		brief.Topic,
		brief.TargetAudience,
		brief.DesiredLength,
		brief.Tone,
		strings.Join(brief.Keywords, ", "),
		brief.Category,
		contextText,
	)

	// Call OpenRouter with structured output
	output, err := ra.openRouter.CallWithSchema(ctx, prompt, researchOutputSchema())
	if err != nil {
		return nil, err
	}

	// Parse output
	var result ResearchOutput
	if err := parseBSONToStruct(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse research output: %w", err)
	}

	return &result, nil
}

// buildResearchContext creates a text summary of all sources
func (ra *ResearchAgent) buildResearchContext(sources []models.BlogResearchSource) string {
	if len(sources) == 0 {
		return "No sources available."
	}

	context := ""
	for i, src := range sources {
		context += fmt.Sprintf("\n\nSource %d: %s\nTitle: %s\nURL: %s\nSnippet: %s\n",
			i+1, src.Provider, src.Title, src.URL, src.Snippet)

		if src.ExtractedContent != "" {
			context += fmt.Sprintf("Content: %s\n", truncateString(src.ExtractedContent, 500))
		}

		if len(src.Claims) > 0 {
			context += "Claims:\n"
			for _, claim := range src.Claims {
				context += fmt.Sprintf("  - %s (confidence: %.2f)\n", claim.Claim, claim.Confidence)
			}
		}
	}

	return context
}

// researchOutputSchema returns the JSON schema for research output
func researchOutputSchema() map[string]interface{} {
	return map[string]interface{}{
		"name": "research_output",
		"schema": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"findings": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"claim":      map[string]interface{}{"type": "string"},
							"evidence":   map[string]interface{}{"type": "string"},
							"confidence": map[string]interface{}{"type": "number"},
							"sources":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
						},
						"required": []string{"claim", "evidence", "confidence"},
					},
				},
				"outline": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"title":       map[string]interface{}{"type": "string"},
						"sections":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
						"subsections": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
						"key_points":  map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
					},
					"required": []string{"title", "sections"},
				},
				"uncertainties":      map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"prohibited_claims":  map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"recommended_category": map[string]interface{}{"type": "string"},
				"recommended_tags":   map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
			"required": []string{"findings", "outline"},
		},
	}
}

// truncateString truncates a string to maxLen characters
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// parseBSONToStruct converts a structured response or JSON string into the target struct.
func parseBSONToStruct(bsonData interface{}, target interface{}) error {
	switch v := bsonData.(type) {
	case *StructuredResponse:
		if v == nil || v.Content == "" {
			return fmt.Errorf("empty structured response")
		}
		return json.Unmarshal([]byte(v.Content), target)
	case string:
		return json.Unmarshal([]byte(v), target)
	default:
		return fmt.Errorf("unsupported parse type %T", bsonData)
	}
}
