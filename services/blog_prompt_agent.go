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
	articleStructure := pa.extractArticleStructure(post.Blocks)
	researchContext := pa.fetchResearchContext(ctx, run)

	coverPrompt, err := pa.generateCoverPrompt(ctx, run, post, contentSummary, articleStructure, researchContext)
	if err != nil {
		return nil, fmt.Errorf("failed to generate cover prompt: %w", err)
	}

	inlinePrompts, err := pa.generateInlinePrompts(ctx, run, post, contentSummary, articleStructure, researchContext)
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
				sb.WriteString("- " + item)
				sb.WriteString("\n")
			}
			sb.WriteString("\n")
		case models.BlockTypeProduct:
			if block.ProductDescription != "" {
				sb.WriteString("[Product recommendation: " + block.ProductDescription + "]\n\n")
			}
		}
		if block.Type == models.BlockTypeQuote && block.Attribution != "" {
			sb.WriteString("— " + block.Attribution + "\n\n")
		}
	}

	return sb.String()
}

// extractArticleStructure returns a compact outline of headers, lists and product intents
// so the prompt model sees the narrative arc, not just a wall of prose.
func (pa *PromptAgent) extractArticleStructure(blocks []models.BlogBlock) string {
	var sb strings.Builder
	order := 0
	for _, b := range blocks {
		switch b.Type {
		case models.BlockTypeTitle:
			fmt.Fprintf(&sb, "%d. [TITLE] %s\n", order+1, b.Text)
			order++
		case models.BlockTypeHeader:
			fmt.Fprintf(&sb, "%d. [SECTION] %s\n", order+1, b.Text)
			order++
		case models.BlockTypeList:
			preview := strings.Join(b.Items, " | ")
			if len(preview) > 200 {
				preview = preview[:200] + "..."
			}
			fmt.Fprintf(&sb, "%d. [LIST] %s\n", order+1, preview)
			order++
		case models.BlockTypeQuote:
			q := b.Text
			if len(q) > 150 {
				q = q[:150] + "..."
			}
			fmt.Fprintf(&sb, "%d. [QUOTE] \"%s\"\n", order+1, q)
			order++
		case models.BlockTypeProduct:
			if b.ProductDescription != "" {
				fmt.Fprintf(&sb, "%d. [PRODUCT-BLOCK] %s\n", order+1, b.ProductDescription)
				order++
			}
		case models.BlockTypeImage:
			fmt.Fprintf(&sb, "%d. [IMAGE slot=%s]\n", order+1, b.ImageSlotID)
			order++
		}
	}
	if sb.Len() == 0 {
		return "(no structural blocks)"
	}
	return sb.String()
}

// fetchResearchContext pulls the research findings + source snippets that grounded this article,
// so prompts can reference the same specifics (fibres, garment types, care stats, style history)
// instead of inventing generic fashion filler. Best-effort — returns "" if nothing is stored yet.
func (pa *PromptAgent) fetchResearchContext(ctx context.Context, run *models.BlogPipelineRun) string {
	// 1) Completed research execution (contains the structured ResearchOutput snapshot)
	var findingsBlock string
	if exec, err := pa.repository.FindCompletedExecution(ctx, run.ID, models.StageResearch); err == nil && exec != nil && exec.ParsedOutput != nil {
		converted := convertBSONToMap(exec.ParsedOutput)
		if raw, err := json.Marshal(converted); err == nil {
			// Try snapshot wrapper first {output: ResearchOutput}
			var wrapper struct {
				Output ResearchOutput `json:"output"`
			}
			if err := json.Unmarshal(raw, &wrapper); err == nil && len(wrapper.Output.Findings) > 0 {
				findingsBlock = formatFindingsForPrompt(wrapper.Output.Findings, wrapper.Output.Outline, 6)
			} else {
				var direct ResearchOutput
				if err := json.Unmarshal(raw, &direct); err == nil && len(direct.Findings) > 0 {
					findingsBlock = formatFindingsForPrompt(direct.Findings, direct.Outline, 6)
				}
			}
		}
	}

	// 2) Raw research sources (titles + snippets + claims) — most grounded detail lives here
	var sourcesBlock string
	if sources, err := pa.repository.FindSourcesByRunID(ctx, run.ID); err == nil && len(sources) > 0 {
		var sb strings.Builder
		limit := 4
		if len(sources) < limit {
			limit = len(sources)
		}
		for i := 0; i < limit; i++ {
			s := sources[i]
			title := truncateString(s.Title, 120)
			snippet := s.ExtractedContent
			if snippet == "" {
				snippet = s.Snippet
			}
			snippet = truncateString(strings.TrimSpace(snippet), 350)
			if snippet == "" {
				continue
			}
			fmt.Fprintf(&sb, "• %s — %s\n", title, snippet)
			if len(s.Claims) > 0 {
				claim := truncateString(s.Claims[0].Claim, 160)
				fmt.Fprintf(&sb, "  ↳ claim: %s\n", claim)
			}
		}
		sourcesBlock = strings.TrimSpace(sb.String())
	}

	var out strings.Builder
	if findingsBlock != "" {
		out.WriteString(findingsBlock)
		out.WriteString("\n")
	}
	if sourcesBlock != "" {
		out.WriteString("\n[Source snippets]\n")
		out.WriteString(sourcesBlock)
	}
	return strings.TrimSpace(out.String())
}

func formatFindingsForPrompt(findings []ResearchFinding, outline ResearchOutline, maxFindings int) string {
	if len(findings) == 0 && len(outline.KeyPoints) == 0 {
		return ""
	}
	var sb strings.Builder
	if len(outline.Title) > 0 {
		fmt.Fprintf(&sb, "[Research outline] Title: %s | Sections: %s | Key points: %s\n",
			truncateString(outline.Title, 120),
			truncateString(strings.Join(outline.Sections, " / "), 200),
			truncateString(strings.Join(outline.KeyPoints, " / "), 200))
	}
	n := len(findings)
	if n > maxFindings {
		n = maxFindings
	}
	for i := 0; i < n; i++ {
		f := findings[i]
		fmt.Fprintf(&sb, "%d. %s — evidence: %s\n", i+1, truncateString(f.Claim, 180), truncateString(f.Evidence, 140))
	}
	return strings.TrimSpace(sb.String())
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
	writeIf("Category", post.Category)
	if len(run.Keywords) > 0 {
		writeIf("Keywords", strings.Join(run.Keywords, ", "))
	}
	if len(post.Tags) > 0 {
		writeIf("Tags", strings.Join(post.Tags, ", "))
	}
	writeIf("Additional Notes", run.AdditionalNotes)
	if run.DesiredLength > 0 {
		writeIf("Target Length", fmt.Sprintf("%d words", run.DesiredLength))
	}

	if sb.Len() == 0 {
		return ""
	}
	return "\n**Campaign Brief:**\n" + sb.String()
}

func toneVisualGuidance(tone, audience string) string {
	tone = strings.ToLower(strings.TrimSpace(tone))
	audience = strings.ToLower(strings.TrimSpace(audience))
	var hints []string
	switch tone {
	case "professional", "formal":
		hints = append(hints, "tailored silhouettes, structured fabrics (wool, poplin), office / atelier backdrop, clean diffused studio or bright window light, restrained poses")
	case "friendly", "conversational", "warm":
		hints = append(hints, "relaxed candid moments, soft natural light, lived-in interiors (modern Tehran apartment, café), genuine smiles, movement")
	case "playful", "trendy", "energetic":
		hints = append(hints, "bold colour pops, street-style energy, dynamic angles, urban Tehran backdrop, accessories as hero")
	case "minimal", "minimalist":
		hints = append(hints, "negative space, flat-lay or single-garment hero, muted palette, hard shadows, gallery-like composition")
	case "luxury", "elegant", "luxe":
		hints = append(hints, "rich textures (silk, cashmere, velvet), low-key dramatic light, shallow depth of field, refined interior")
	default:
		if tone != "" {
			hints = append(hints, fmt.Sprintf("tone \"%s\" — reflect its mood in lighting/pose rather than default studio glam", tone))
		}
	}
	if strings.Contains(audience, "young") || strings.Contains(audience, "gen z") || strings.Contains(audience, "student") {
		hints = append(hints, "youthful casting (20s), campus / street / dorm context, contemporary Iranian youth style")
	}
	if strings.Contains(audience, "office") || strings.Contains(audience, "professional") {
		hints = append(hints, "work-appropriate styling, office / co-working context")
	}
	if len(hints) == 0 {
		return "Translate the brief's tone + audience into lighting, setting and casting choices — do not default to generic studio glamour."
	}
	return strings.Join(hints, " | ")
}

// generateCoverPrompt creates a prompt for the cover image
func (pa *PromptAgent) generateCoverPrompt(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost, contentSummary, articleStructure, researchContext string) (*ImagePrompt, error) {
	researchSection := ""
	if researchContext != "" {
		researchSection = fmt.Sprintf("\n**Research Insights (ground your visual concept in these facts — do not ignore them):**\n%s\n", truncateString(researchContext, 2500))
	}
	prompt := fmt.Sprintf(`You are Voxcina's senior creative director and expert image-prompt engineer for a Persian fashion e-commerce blog. Your job is to craft a single, best-in-class cover-image prompt that is unmistakably about THIS article — not interchangeable fashion filler.

**Article Identity:**
- Title: %s
- Category: %s
- Slug: %s
%s
**Article Structure (narrative arc):**
%s

**Article Body (full):**
%s
%s
**Visual Tone Guidance (from brief):**
%s

**Voxcina Brand Palette (use as accents and wardrobe/background, never as flat colour fills):**
- Deep Blue #1A3C69, Warm Cream #F4F1EC, Dark Blue #0A1B3C, Light Cream #FCFAF8

**Cover Task:**
Create ONE 16:9 cover image prompt (1200×630). This is the article's hero — it must be instantly readable as a thumbnail, emotionally aligned with the article's core promise, and rich enough that a reader can guess the topic from the image alone.

**Specificity & Innovation Requirements (critical — this is what you are being judged on):**
- ANCHOR EVERY PROMPT IN 2-3 CONCRETE DETAILS FROM THE ARTICLE: name the actual garments, fabrics, colours, care steps, or styling moves the article discusses. If the article is about "wool coat care," show a specific wool texture, a garment brush, cedar hanger — not a generic blonde in a coat. If it is about "office capsule wardrobe," show the 3-4 exact pieces named in the article laid out or worn, not "business attire."
- DO NOT REPEAT THE LAZY DEFAULT: "fashionable woman posing in studio wearing Voxcina colours, soft lighting." That is a failure. Instead invent a SPECIFIC SCENARIO with a point of view: e.g. "overhead flat-lay of a Tehran tailor's table with indigo wool swatches + cream silk blouse + handwritten care card," or "candid morning on a modern Tehran balcony — woman adjusting a camel wool coat, steam from a tea glass, deep-blue doorway behind her."
- BEFORE YOU COMMIT, silently brainstorm 3 distinct visual metaphors for this article and pick the most surprising one that still serves the brief. Let unexpected juxtapositions win over safe editorial clichés, as long as they stay on-brand and culturally grounded.
- Each prompt must explicitly state: (a) a precise Iranian-modern location/setting, (b) 2-3 garment/material/props details drawn from the article body, (c) lighting + lens + depth-of-field choice and why it supports the mood, (d) exactly where the palette appears (garment, props, wall, textile) — not "use brand colours" generically.
- Palette integration should feel natural: a deep-blue coat, warm-cream knit, dark-blue ceramic, light-cream linen backdrop — not a solid colour background in hex.

**Realism & Authenticity Requirements (critical):**
- The prompt must describe a scene that reads as a real photograph someone took themselves — never as AI-generated, CGI, or a render.
- Set the scene in a modern, contemporary Persian/Iranian context: modern Iranian interior or street/lifestyle setting, contemporary Tehran-style architecture or decor, modern Persian fashion sensibility — not a generic or Western-default backdrop.
- Explicitly describe camera-realistic qualities: natural or ambient lighting, authentic soft shadows, candid (not perfectly staged/centered) framing, shallow depth of field, real fabric/skin texture with natural imperfections — e.g. "shot on a mirrorless camera, 35-50mm lens, natural window light, candid moment, photojournalistic feel."
- Never describe glossy/plastic-smooth skin, unnatural symmetry, surreal/dreamlike elements, or hyper-saturated "AI art" rendering — these read as artificial and must be avoided.

**Anti-Repetition Guardrail:**
- Your output will be shown alongside other articles' covers — if every cover is "woman in studio, soft light, Voxcina palette," the blog looks AI-generated. Fight that by choosing an under-used composition from {editorial environmental portrait, candid lifestyle moment, detailed flat-lay/top-down, atelier/workshop detail, street-style motion} that best fits THIS article.

**Prohibited:**
- Embedded text or typography
- Logos or watermarks
- Unrelated colours outside the palette as dominant fills
- Distorted garments or anatomy
- Culturally inappropriate styling
- Any look that reads as AI-generated/CGI/render (overly smooth, plastic, symmetric, dreamlike, over-saturated)

Return a JSON object:
{
  "prompt": "detailed image generation prompt in English — 60-110 words, richly specific, every sentence earns its place; start with the scene and subject before palette/lighting",
  "alt_text": "Persian alt text for accessibility — concise but specific, mentioning key garments/setting",
  "caption": "Persian caption for the image — inviting, 1 sentence, tied to the article's hook",
  "aspect_ratio": "16:9",
  "composition": "hero|lifestyle|flat-lay|product|detail — choose the one you actually described"
}

Write the prompt in English for image model compatibility, but alt_text and caption in Persian.`,
		post.Title,
		post.Category,
		post.Slug,
		formatOptionalContext(run, post),
		articleStructure,
		truncateString(contentSummary, 5000),
		researchSection,
		toneVisualGuidance(run.Tone, run.TargetAudience),
	)

	// Higher temperature + a touch of reasoning lets the model be specific/innovative instead of collapsing to its safest generic prompt.
	req := StructuredRequest{
		Model:           run.Model,
		Messages:        []OpenRouterMessage{{Role: "user", Content: prompt}},
		Schema:          imagePromptSchema(),
		MaxTokens:       4096,
		Temperature:     0.78,
		ReasoningEffort: "low",
	}
	// Fill default model if empty
	if req.Model == "" {
		req.Model = defaultStructuredModel
	}

	output, err := pa.openRouter.CallStructured(ctx, req)
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
func (pa *PromptAgent) generateInlinePrompts(ctx context.Context, run *models.BlogPipelineRun, post *models.BlogPost, contentSummary, articleStructure, researchContext string) ([]ImagePrompt, error) {
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
		truncated := truncateString(strings.TrimSpace(contextWindow), 900)
		if truncated == "" {
			truncated = "(no surrounding text — infer from article structure and research)"
		}
		fmt.Fprintf(&slotsBlock, "\n— Slot %d (id: %s):\n%s\n", i+1, slotId, truncated)
	}

	researchSection := ""
	if researchContext != "" {
		researchSection = fmt.Sprintf("\n**Research Insights (use to ground prompts in real facts/materials):**\n%s\n", truncateString(researchContext, 2200))
	}

	prompt := fmt.Sprintf(`You are Voxcina's senior creative director and expert image-prompt engineer for inline images in a Persian fashion blog. You create the 1-3 images that live INSIDE an article — each one must earn its place by visualising the specific idea of the paragraph it sits in, not by repeating generic fashion stock.

**Article Identity:**
- Title: %s
- Category: %s
- Slug: %s
%s
**Article Structure (full outline):**
%s
%s
**Image Slots in article order — each slot's surrounding text (this is your primary brief per image):**
%s

**Visual Tone Guidance (from brief):**
%s

**Voxcina Brand Palette (accents, wardrobe, props, walls — not flat fills):**
- Deep Blue #1A3C69, Warm Cream #F4F1EC, Dark Blue #0A1B3C, Light Cream #FCFAF8

**Inline Task:**
Create exactly %d image prompts (16:10, 1600×1000 each), in the same order as the slots above. Each prompt must be a distinct photograph that could only belong next to THAT slot's paragraph.

**Specificity & Innovation Requirements (critical):**
- FOR EACH SLOT: anchor the image in 2-3 concrete nouns from THAT slot's text — the exact garments, fabrics, colours, steps, mistakes, or before/after described there. If slot 2 discusses "leather shoe polishing with horsehair brush," show that brush, that leather texture, that motion — not "shoes on a shelf." If slot 3 lists "3 office outfit formulas," visualise one of those formulas specifically.
- NEVER PRODUCE INTERCHANGEABLE PROMPTS. If you swap two prompts' slot labels and they still make sense, you have failed — rewrite them until each is slot-specific and unmistakably tied to its paragraph.
- Silently brainstorm 2-3 visual angles per slot (detail macro, environmental portrait, flat-lay, hands-in-action, before/after diptych implied as single frame) and pick the most illuminating one for that idea. Prefer showing PROCESS, TEXTURE and HUMAN GESTURE over static poses.
- Every prompt must state: (a) precise Iranian-modern setting for that slot, (b) 2-3 article-derived garment/material/prop details, (c) lighting + lens + framing choice and what it emphasises.
- Weave palette in naturally per image (e.g. "deep-blue suede loafer," "warm-cream knit texture," "dark-blue glazed tile in background") — don't just append "in Voxcina colours."

**Diversity Requirement (critical — the set must look like an art-directed editorial, not 3 stock photos):**
- Across the set, VARY: setting/location, composition (cycle through hero/lifestyle/flat-lay/product/detail — never repeat the same composition twice if you have 2+ slots), framing distance (macro vs. medium vs. wide), human presence (some with model, some hands-only, some object-only), lighting mood (soft window vs. directional vs. overcast street), and palette emphasis.
- Even when two slots discuss similar garments, differentiate by camera angle, crop, or focal subject so the finished article doesn't read as the same photo repeated.

**Realism & Authenticity Requirements (critical):**
- Each prompt must describe a scene that reads as a real photograph someone took themselves — never as AI-generated, CGI, or a render.
- Set each scene in a modern, contemporary Persian/Iranian context: modern Iranian interior or street/lifestyle setting, contemporary Tehran-style architecture or decor, modern Persian fashion sensibility — not a generic or Western-default backdrop.
- Explicitly describe camera-realistic qualities: natural or ambient lighting, authentic soft shadows, candid (not perfectly staged/centered) framing, shallow depth of field, real fabric/skin texture with natural imperfections — e.g. "shot on a mirrorless camera, 35-50mm lens, natural window light, candid moment, photojournalistic feel."
- Never describe glossy/plastic-smooth skin, unnatural symmetry, surreal/dreamlike elements, or hyper-saturated "AI art" rendering — these read as artificial and must be avoided.

**Anti-Generic Checklist — never do these:**
- "a fashionable woman/man posing and smiling at camera in a studio" as the whole concept
- "folded clothes on a white background" without naming which clothes and why they matter to the paragraph
- Repeating "soft lighting, Voxcina palette, stylish" without concrete garment/setting/lens details

**Prohibited:**
- Embedded text or typography
- Logos or watermarks
- Unrelated dominant colours
- Distorted garments or anatomy
- Culturally inappropriate styling
- Any look that reads as AI-generated/CGI/render (overly smooth, plastic, symmetric, dreamlike, over-saturated)

Return a JSON object:
{
  "prompts": [
    {
      "prompt": "detailed image generation prompt in English — 55-100 words, every sentence specific to its slot",
      "alt_text": "Persian alt text — specific to that image",
      "caption": "Persian caption — 1 sentence, adds value beyond the alt text",
      "aspect_ratio": "16:10",
      "composition": "hero|lifestyle|flat-lay|product|detail — the one you actually described"
    }
  ]
}

The "prompts" array must have exactly %d entries, in the same order as the slots listed above.
Write prompts in English, but alt_text and caption in Persian.`,
		post.Title,
		post.Category,
		post.Slug,
		formatOptionalContext(run, post),
		articleStructure,
		researchSection,
		slotsBlock.String(),
		toneVisualGuidance(run.Tone, run.TargetAudience),
		len(imageSlots),
		len(imageSlots),
	)

	req := StructuredRequest{
		Model:           run.Model,
		Messages:        []OpenRouterMessage{{Role: "user", Content: prompt}},
		Schema:          inlinePromptsSchema(len(imageSlots)),
		MaxTokens:       6144,
		Temperature:     0.78,
		ReasoningEffort: "low",
	}
	if req.Model == "" {
		req.Model = defaultStructuredModel
	}

	output, err := pa.openRouter.CallStructured(ctx, req)
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
			if blocks[i].Type == models.BlockTypeImage {
				continue
			}
			switch blocks[i].Type {
			case models.BlockTypeList:
				for _, it := range blocks[i].Items {
					sb.WriteString("• " + it + "\n")
				}
				sb.WriteString("\n")
			case models.BlockTypeQuote:
				sb.WriteString("\"" + blocks[i].Text + "\"\n")
				if blocks[i].Attribution != "" {
					sb.WriteString("— " + blocks[i].Attribution + "\n")
				}
				sb.WriteString("\n")
			case models.BlockTypeProduct:
				if blocks[i].ProductDescription != "" {
					sb.WriteString("[Product: " + blocks[i].ProductDescription + "]\n\n")
				}
			default:
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
		if blocks[i].Type == models.BlockTypeList {
			for _, it := range blocks[i].Items {
				sb.WriteString("• " + it + "\n")
			}
			sb.WriteString("\n")
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
