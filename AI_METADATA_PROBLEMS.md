# AI Product Metadata Generation - Problem Analysis

## Overview
The system generates AI-powered Persian metadata for products at `/api/admin/ai/generate-metadata` using OpenRouter API. The generated fields (`ProductSearchMetadata`) are used by the chat agent to search and recommend products.

## Current Architecture

### Flow
1. Admin fills product form (name, description, price, category, brand, gender, images)
2. Clicks "تکمیل خودکار با AI" button
3. Frontend sends request to `/api/admin/ai/generate-metadata` with product info + **empty images array**
4. Backend (`AIMetadataService.GenerateMetadata`) builds prompt with vocabulary options
5. Calls OpenRouter API (default: `anthropic/claude-3.5-sonnet`)
6. Parses JSON response, validates against vocabulary, returns metadata
7. Admin reviews/edits and saves with product

### Key Files
- `services/ai_metadata_service.go` - Core AI generation logic
- `config/ai_prompts.json` - System prompt & user prompt template
- `scripts/seed_vocabulary.go` - Vocabulary data (color, material, style, product_type, occasion)
- `handlers/ai_metadata_handler.go` - HTTP endpoint
- `front_end/src/app/(admin)/admin/products/add/page.tsx` - Frontend integration

---

## Identified Problems

### 1. CRITICAL: No Product Images Sent to AI
**Location:** `front_end/src/app/(admin)/admin/products/add/page.tsx:281`

```typescript
images: [] as string[],  // Always empty!
```

**Impact:** 
- The system prompt explicitly says: "Analyze product images to identify material, style, colors, and design details"
- The code supports vision models (`buildVisionMessage` function exists)
- But **zero images are sent** - AI only sees text fields
- AI cannot visually identify: fabric texture, pattern, fit, actual colors, design details
- Results in generic/broad guesses based only on text description

### 2. System Prompt Too Generic
**Location:** `config/ai_prompts.json:3`

Current prompt:
```
"You are a professional Persian e-commerce product metadata specialist..."
```

**Issues:**
- No specific instructions for visual analysis
- No guidance on distinguishing similar materials (cotton vs polyester blend)
- No examples of good vs bad outputs
- Doesn't instruct AI to be conservative when uncertain
- "Be specific and descriptive but concise" is contradictory

### 3. Vocabulary Validation Too Strict
**Location:** `services/ai_metadata_service.go:315-366`

```go
func (s *AIMetadataService) validateMetadata(...) error {
    // Must EXACTLY match vocabulary terms
    if !s.isValidVocabularyTerm(metadata.MaterialPersian, vocabularies["material"]) {
        return fmt.Errorf("invalid material: %s", metadata.MaterialPersian)
    }
    // ...
}
```

**Issues:**
- AI might generate "پنبه ۱۰۰٪" but vocabulary has "پنبه"
- AI might generate "کژوال/اسپرت" but vocabulary has separate entries
- Validation fails → entire generation fails → no metadata returned
- No fallback or partial acceptance

### 4. Hardcoded to OpenRouter (Cannot Use Local Models)
**Location:** `services/ai_metadata_service.go:138-140`

```go
if req.Model == "" {
    req.Model = "anthropic/claude-3.5-sonnet"
}
```

**Issues:**
- Cannot use local Ollama models (user has vision-capable models)
- OpenRouter requires internet (VPS has no direct access, needs proxy)
- No model selection UI in frontend
- Cost per generation on OpenRouter

### 5. User Prompt Missing Critical Context
**Location:** `config/ai_prompts.json:5`

Missing from prompt:
- Product images (as discussed in #1)
- Color variant images (each color may have different material/pattern)
- Swatch/pattern images (uploaded via PatternPicker)
- Try-on images
- Existing product examples for few-shot learning

### 6. Temperature & Token Limits May Be Suboptimal
**Location:** `services/ai_metadata_service.go:146-148`

```go
MaxTokens:   2000,
Temperature: 0.3,
```

**Issues:**
- 2000 tokens may truncate detailed Persian descriptions + reasoning
- 0.3 temperature is good for consistency but may reduce creativity for edge cases
- No dynamic adjustment based on input complexity

### 7. No Feedback Loop for Continuous Improvement
**Missing:**
- No logging of generated vs manually corrected metadata
- No A/B testing of prompts
- No tracking of which vocabulary terms AI struggles with
- SearchLog exists but not linked to generation quality

---

## Available Local Models (Vision-Capable)

From user's Ollama server (`http://194.60.230.210:8181`):

| Model | Params | Vision | Notes |
|-------|--------|--------|-------|
| `qwen3.5:9b` | 9.7B | ✅ | Good multilingual, fast |
| `gemma4:31b` | 31.3B | ✅ | Strong reasoning, larger |
| `qwen3.6.1-27b-4b` | 27.8B | ✅ | Latest Qwen, MoE architecture |
| `qwen3.6:27b-q4_K_M` | 27.8B | ✅ | Quantized, good balance |

**Recommendation:** Use `qwen3.5:9b` or `qwen3.6.1-27b-4b` for best Persian + vision balance.

---

## Root Cause Summary

The **primary problem** is **Problem #1**: Product images are uploaded to the server but **never sent to the AI**. The AI is forced to guess material, style, colors, and fit from text description alone, leading to:
- Generic/broad values (e.g., "پنبه" for everything)
- Wrong style classification
- Missed pattern/texture details
- Inaccurate season/occasion tags

**Secondary problem**: The system is architected for vision (has `buildVisionMessage`, supports vision models) but the frontend integration doesn't pass images.

---

## Proposed Solutions

### Immediate (High Impact, Low Effort)
1. **Send uploaded images to AI** - Modify frontend to include `mainImageItems` URLs in the generate-metadata request
2. **Update system prompt** - Add explicit visual analysis instructions
3. **Relax vocabulary validation** - Allow partial matches, synonyms, or fallback to "closest match"

### Medium Term
4. **Add model selection** - Allow choosing between OpenRouter and local Ollama models
5. **Integrate local Ollama** - Add HTTP client for local models (no proxy needed)
6. **Add few-shot examples** - Include good/bad examples in prompt

### Long Term
7. **Feedback collection** - Log AI output vs admin corrections
8. **Prompt optimization** - Use DSPy or similar for automatic prompt tuning
9. **Fine-tuning** - Fine-tune a small model on Persian fashion metadata

---

## Files to Modify

| File | Change |
|------|--------|
| `front_end/src/app/(admin)/admin/products/add/page.tsx` | Send image URLs in `images` field |
| `config/ai_prompts.json` | Improve system prompt with visual analysis guide |
| `services/ai_metadata_service.go` | Relax validation, add local model support |
| `handlers/ai_metadata_handler.go` | Add model selection parameter |
| `config/ai_prompts.json` | Add recommended local models to list |