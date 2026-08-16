package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

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
	Claim      string   `json:"claim"`
	Evidence   string   `json:"evidence"`
	Confidence float64  `json:"confidence"`
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
	Findings            []ResearchFinding `json:"findings"`
	Outline             ResearchOutline   `json:"outline"`
	Uncertainties       []string          `json:"uncertainties"`
	ProhibitedClaims    []string          `json:"prohibited_claims"`
	RecommendedCategory string            `json:"recommended_category"`
	RecommendedTags     []string          `json:"recommended_tags"`
}

// ResearchSnapshot is what gets passed to the writing agent
type ResearchSnapshot struct {
	Output          ResearchOutput              `json:"output"`
	Sources         []models.BlogResearchSource `json:"sources"`
	GeneratedAt     time.Time                   `json:"generated_at"`
	GenerationBrief models.GenerationBrief      `json:"generation_brief"`
}

// RunResearch executes the research stage
func (ra *ResearchAgent) RunResearch(ctx context.Context, run *models.BlogPipelineRun, brief *models.GenerationBrief) (*ResearchSnapshot, error) {
	log.Printf("[blog] Starting research for run %s, topic: %s", run.ID.Hex(), brief.Topic)
	now := time.Now()

	queries := ra.generateQueries(brief)
	log.Printf("[blog] Generated %d search queries", len(queries))

	allSources := make([]models.BlogResearchSource, 0)
	seenURLs := make(map[string]bool)

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
				time.Sleep(2 * time.Second)
			}
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}

			var rawSources []braveResult

			webResults, werr := ra.braveClient.SearchWeb(ctx, query, SearchOptions{Count: 3})
			if werr != nil {
				if strings.Contains(werr.Error(), "429") {
					log.Printf("[blog] Rate limited for query '%s', waiting 15s and skipping", query)
					time.Sleep(15 * time.Second)
				} else {
					log.Printf("[blog] Web search failed for query '%s': %v", query, werr)
				}
				continue
			}
			for _, r := range webResults {
				if seenURLs[r.URL] {
					continue
				}
				seenURLs[r.URL] = true
				rawSources = append(rawSources, braveResult{URL: r.URL, Title: r.Title, Snippet: r.Snippet, ExtractedContent: r.Snippet})
			}

			for j, src := range rawSources {
				if j > 0 {
					time.Sleep(3 * time.Second)
				}
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				default:
				}

				fetchedContent := ""
				fetchErr := fetchPageContent(ctx, src.URL, &fetchedContent)
				if fetchErr != nil {
					log.Printf("[blog] Failed to fetch content from %s: %v", src.URL, fetchErr)
				} else if fetchedContent != "" {
					log.Printf("[blog] Fetched %d chars from %s", len(fetchedContent), src.URL)
				}

				contentToUse := fetchedContent
				if contentToUse == "" {
					contentToUse = src.Snippet
				}

				relevantContent := extractRelevantSections(contentToUse, brief.Topic, brief.Keywords)
				if relevantContent == "" {
					relevantContent = contentToUse
				}

				source := models.BlogResearchSource{
					PipelineRunID:    run.ID,
					Query:            query,
					Provider:         "brave_web_search",
					URL:              src.URL,
					Title:            src.Title,
					Snippet:          src.Snippet,
					ExtractedContent: relevantContent,
					SourceIndex:      j,
					FetchedAt:        time.Now(),
					CreatedAt:        time.Now(),
				}

				claims := ra.extractClaims(relevantContent, src.URL)
				source.Claims = claims

				allSources = append(allSources, source)
			}
		}
	}

	researchOutput, err := ra.generateResearchOutput(ctx, brief, allSources, run.Model)
	if err != nil {
		return nil, fmt.Errorf("failed to generate research output: %w", err)
	}

	for _, source := range allSources {
		if err := ra.repository.InsertResearchSource(ctx, &source); err != nil {
			log.Printf("[blog] Warning: failed to save source %s: %v", source.URL, err)
		}
	}

	snapshot := &ResearchSnapshot{
		Output:          *researchOutput,
		Sources:         allSources,
		GeneratedAt:     time.Now(),
		GenerationBrief: *brief,
	}

	run.Status = "research_approved"
	run.ApprovedAt = &now
	if err := ra.repository.UpdatePipelineRun(ctx, run); err != nil {
		return nil, fmt.Errorf("failed to update run status: %w", err)
	}

	log.Printf("[blog] Research completed: %d sources, %d findings", len(allSources), len(researchOutput.Findings))
	return snapshot, nil
}

// generateQueries creates search queries from the generation brief
// Keeps query count low for Brave free tier rate limits (1 QPS, 15/min)
func (ra *ResearchAgent) generateQueries(brief *models.GenerationBrief) []string {
	queries := []string{
		brief.Topic,
	}

	// Add one Persian query if locale is Persian
	if brief.Locale == "fa" || brief.Locale == "fa-IR" {
		queries = append(queries, brief.Topic+" راهنما نکات")
	}

	// Add one keyword-based query if keywords exist
	if len(brief.Keywords) > 0 {
		queries = append(queries, brief.Keywords[0]+" "+brief.Topic)
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
func (ra *ResearchAgent) generateResearchOutput(ctx context.Context, brief *models.GenerationBrief, sources []models.BlogResearchSource, model string) (*ResearchOutput, error) {
	// Build context from sources
	contextText := ra.buildResearchContext(sources)

	// Prepare prompt
	prompt := fmt.Sprintf(`You are a research agent for a Persian fashion e-commerce blog.

Generate comprehensive, source-based research for the following topic.

**Topic:** %s
**Audience:** %s
**Desired Length:** %d
**Tone:** %s
**Keywords:** %s
**Category:** %s

**SOURCES (extracted web content):**
%s

**Instructions:**
1. CAREFULLY READ all the source content above. Each source contains real web content that was fetched from search results.
2. Extract factual findings DIRECTLY FROM THE SOURCES. Your findings must be grounded in the provided source content, not your general knowledge.
3. For each finding, include the exact source URL(s) it came from.
4. Preserve specific numbers, statistics, quotes, and details from the sources — do not paraphrase away the specifics.
5. Identify gaps where the sources don't provide enough information.
6. Flag any claims that contradict each other or need verification.
7. Recommend article structure based on what the sources cover.

IMPORTANT: Your findings MUST be derived from the source content. If a source says "X is 45%% according to study Y", include that exact detail. Do not invent facts or use vague generalizations.

Return a JSON object with this structure:
{
  "findings": [
    {
      "claim": "specific factual statement from sources",
      "evidence": "quote or reference to source content",
      "confidence": 0.85,
      "sources": ["url1", "url2"]
    }
  ],
  "outline": {
    "title": "recommended article title",
    "sections": ["section 1", "section 2"],
    "subsections": ["subsection 1.1", "subsection 1.2"],
    "key_points": ["point 1", "point 2"]
  },
  "uncertainties": ["what we're not sure about based on sources"],
  "prohibited_claims": ["claims contradicted by sources or not supported"],
  "recommended_category": "category name",
  "recommended_tags": ["tag1", "tag2"]
}

Write the response in Persian for the article content, but keep the JSON structure keys in English.`,
		brief.Topic,
		brief.TargetAudience,
		brief.DesiredLength,
		brief.Tone,
		strings.Join(brief.Keywords, ", "),
		brief.Category,
		contextText,
	)

	// Call OpenRouter with structured output
	output, err := ra.openRouter.CallWithSchemaAndModel(ctx, prompt, researchOutputSchema(), model)
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
		context += fmt.Sprintf("\n\n--- Source %d ---\nTitle: %s\nURL: %s\n", i+1, src.Title, src.URL)

		if src.Snippet != "" {
			context += fmt.Sprintf("Summary: %s\n", src.Snippet)
		}

		if src.ExtractedContent != "" {
			context += fmt.Sprintf("\nFull Content:\n%s\n", truncateString(src.ExtractedContent, 2000))
		}

		if len(src.Claims) > 0 {
			context += "\nKey Facts:\n"
			for _, claim := range src.Claims {
				context += fmt.Sprintf("  • %s\n", claim.Claim)
			}
		}
	}

	return context
}

// researchOutputSchema returns the JSON schema for research output.
// Strict-compatible: every object has additionalProperties:false and required
// lists every property. Required for OpenAI strict structured outputs
// (gpt-5, gpt-4o) while remaining compatible with permissive models
// (qwen, deepseek) — no search quality or richness is reduced.
func researchOutputSchema() map[string]interface{} {
	return map[string]interface{}{
		"name":   "research_output",
		"strict": true,
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
						"required":             []string{"claim", "evidence", "confidence", "sources"},
						"additionalProperties": false,
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
					"required":             []string{"title", "sections", "subsections", "key_points"},
					"additionalProperties": false,
				},
				"uncertainties":        map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"prohibited_claims":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"recommended_category": map[string]interface{}{"type": "string"},
				"recommended_tags":     map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
			"required":             []string{"findings", "outline", "uncertainties", "prohibited_claims", "recommended_category", "recommended_tags"},
			"additionalProperties": false,
		},
	}
}

// fetchPageContent safely fetches page content with a timeout.
// Returns empty string and nil error if fetch fails (graceful degradation).
func fetchPageContent(ctx context.Context, targetURL string, content *string) error {
	fetchCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()

	result, err := FetchURLContent(fetchCtx, targetURL)
	if err != nil {
		*content = ""
		return err
	}

	// Clean up excessive whitespace
	result = strings.TrimSpace(result)
	lines := strings.Split(result, "\n")
	var cleaned []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			cleaned = append(cleaned, line)
		}
	}
	*content = strings.Join(cleaned, "\n")
	return nil
}

// extractRelevantSections extracts paragraphs from content that are relevant to the topic/keywords.
// Returns up to maxChars characters of the most relevant content.
func extractRelevantSections(content, topic string, keywords []string) string {
	if content == "" {
		return ""
	}

	paragraphs := splitIntoParagraphs(content)
	if len(paragraphs) == 0 {
		return content
	}

	searchTerms := buildSearchTerms(topic, keywords)

	scored := make([]scoredParagraph, 0, len(paragraphs))
	for _, p := range paragraphs {
		if len(p) < 30 {
			continue
		}
		score := scoreParagraphRelevance(p, searchTerms)
		if score > 0 {
			scored = append(scored, scoredParagraph{text: p, score: score})
		}
	}

	// If nothing scored well, return the first few paragraphs as fallback
	if len(scored) == 0 {
		return truncateToLimit(paragraphs, 1500)
	}

	// Sort by score descending
	sortParagraphsByScore(scored)

	maxChars := 3000
	var result []string
	totalChars := 0
	for _, sp := range scored {
		if totalChars+len(sp.text) > maxChars {
			break
		}
		result = append(result, sp.text)
		totalChars += len(sp.text)
	}

	if len(result) == 0 {
		return truncateToLimit(paragraphs, 1500)
	}

	return strings.Join(result, "\n\n")
}

// splitIntoParagraphs splits text into paragraphs by double newlines or single newlines.
func splitIntoParagraphs(text string) []string {
	// First try double newlines
	paragraphs := strings.Split(text, "\n\n")
	if len(paragraphs) > 1 {
		var result []string
		for _, p := range paragraphs {
			p = strings.TrimSpace(p)
			if len(p) >= 30 {
				result = append(result, p)
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	// Fall back to single newlines
	paragraphs = strings.Split(text, "\n")
	var result []string
	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if len(p) >= 30 {
			result = append(result, p)
		}
	}
	return result
}

// buildSearchTerms creates a list of search terms from topic and keywords.
func buildSearchTerms(topic string, keywords []string) []string {
	terms := []string{strings.ToLower(topic)}
	for _, kw := range keywords {
		terms = append(terms, strings.ToLower(kw))
	}

	// Add word-level terms from topic
	words := strings.Fields(strings.ToLower(topic))
	for _, w := range words {
		if len(w) > 3 {
			terms = append(terms, w)
		}
	}

	return terms
}

// scoreParagraphRelevance scores how relevant a paragraph is to the search terms.
func scoreParagraphRelevance(paragraph string, terms []string) int {
	lower := strings.ToLower(paragraph)
	score := 0
	for _, term := range terms {
		count := strings.Count(lower, term)
		score += count
	}

	// Bonus for containing specific content indicators
	if strings.Contains(lower, "statistics") || strings.Contains(lower, "study") ||
		strings.Contains(lower, "research") || strings.Contains(lower, "according") {
		score += 2
	}
	if strings.Contains(lower, "tips") || strings.Contains(lower, "guide") ||
		strings.Contains(lower, "how to") || strings.Contains(lower, "step") {
		score += 2
	}

	// Penalty for very short paragraphs
	if len(paragraph) < 50 {
		score -= 2
	}

	return score
}

type scoredParagraph struct {
	text  string
	score int
}

// sortParagraphsByScore sorts scored paragraphs by score in descending order.
func sortParagraphsByScore(scored []scoredParagraph) {
	for i := 1; i < len(scored); i++ {
		for j := i; j > 0 && scored[j].score > scored[j-1].score; j-- {
			scored[j], scored[j-1] = scored[j-1], scored[j]
		}
	}
}

// truncateToLimit joins paragraphs up to maxChars.
func truncateToLimit(paragraphs []string, maxChars int) string {
	var result []string
	total := 0
	for _, p := range paragraphs {
		if total+len(p) > maxChars {
			break
		}
		result = append(result, p)
		total += len(p)
	}
	return strings.Join(result, "\n\n")
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
