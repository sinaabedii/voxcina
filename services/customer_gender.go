package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"unicode"
)

// Customer gender resolution for the conversational agents.
//
// The fitting-room agent kept calling female customers "داداش" because it had
// no fact about the customer's sex — with nothing to go on, the model
// defaults to masculine address. Resolution runs once per user, cheapest
// source first:
//
//  1. Persian first-name dictionary (GenderFromFirstName) — deterministic,
//     free, no latency. Persian names are strongly gendered, so this covers
//     the large majority of accounts.
//  2. LLM classification (ClassifyCustomerGenderLLM) — fallback for names
//     the dictionary does not know (foreign, rare, genuinely unisex).
//
// The caller persists the outcome on the user document (see
// models.User.Gender) so classification happens once per user, never per
// turn. Anything unresolvable stays "" (unknown) and the prompt's voice rule
// then requires strictly neutral address — never a masculine default.

// genderClassifyModel is the cheap tier used for the one-shot name
// classification. It never touches the main agent models.
const genderClassifyModel = "qwen/qwen3.5-flash-02-23"

// NormalizePersianName canonicalises a name for dictionary lookup: trims and
// collapses whitespace, folds Arabic-script variants onto their Persian forms
// (ي→ی, ك→ک, ة→ه), strips diacritics and tatweel, drops zero-width joiners,
// and lowercases Latin input so "Sara" and "sara" hit the same entry.
func NormalizePersianName(name string) string {
	s := strings.TrimSpace(name)
	s = strings.Join(strings.Fields(s), " ")
	var b strings.Builder
	for _, r := range s {
		switch r {
		case 'ي', 'ى':
			r = 'ی'
		case 'ك':
			r = 'ک'
		case 'ة':
			r = 'ه'
		case 'ـ', '\u200c', '\u200d':
			continue
		}
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		b.WriteRune(unicode.ToLower(r))
	}
	return b.String()
}

// GenderFromFirstName resolves "male" or "female" from a first name using the
// built-in dictionaries, or "" when no dictionary knows it. Compound names
// ("امیر حسین", "فاطمه زهرا") are checked token by token — the first token
// any dictionary recognises decides, since every token of a Persian compound
// given name almost always agrees in gender.
func GenderFromFirstName(firstName string) string {
	normalized := NormalizePersianName(firstName)
	if normalized == "" {
		return ""
	}
	if g, ok := lookupFirstNameGender(normalized); ok {
		return g
	}
	for _, token := range strings.Fields(normalized) {
		if g, ok := lookupFirstNameGender(token); ok {
			return g
		}
	}
	return ""
}

// lookupFirstNameGender checks the female, male and Latin dictionaries in
// turn. Split across customer_gender_names_{female,male,latin}.go so each
// list stays a small, reviewable data file instead of one giant literal.
func lookupFirstNameGender(normalized string) (string, bool) {
	if _, ok := femaleFirstNames[normalized]; ok {
		return "female", true
	}
	if _, ok := maleFirstNames[normalized]; ok {
		return "male", true
	}
	if g, ok := latinFirstNames[normalized]; ok {
		return g, true
	}
	return "", false
}

// formatCustomerGender states the customer's sex for the address rule in
// the prompt. Unknown is explicit rather than empty: with nothing to go on
// the model defaults to masculine address (داداش to women), so the prompt
// must be able to tell "unknown" apart from "field missing".
func formatCustomerGender(gender string) string {
	switch gender {
	case "male":
		return "male — address him with masculine forms; never use feminine address terms for him."
	case "female":
		return "female — address her with feminine forms; never call her داداش or use masculine address terms for her."
	default:
		return "unknown — use strictly neutral address terms; never default to masculine forms."
	}
}

// ClassifyCustomerGenderLLM asks a cheap model for the sex of a first name
// the dictionary does not know. It returns "male", "female" or "unknown" —
// never an error for a well-formed model answer (an unparseable answer is
// "unknown"); transport failures are returned as errors so the caller can
// retry on a later turn instead of persisting a guess.
func ClassifyCustomerGenderLLM(ctx context.Context, firstName string) (string, error) {
	name := strings.TrimSpace(firstName)
	if name == "" {
		return "", nil
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	client := NewOpenRouterStructuredClient()
	prompt := fmt.Sprintf("What is the sex of a person with the Persian/Iranian first name %q? "+
		"Consider Iranian naming conventions. If the name is genuinely unisex, ambiguous, or not a recognizable "+
		"given name, answer unknown. Reply with JSON only.", name)
	schema := map[string]interface{}{
		"name":   "first_name_gender",
		"strict": true,
		"schema": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"gender": map[string]interface{}{"type": "string", "enum": []string{"male", "female", "unknown"}},
			},
			"required":             []string{"gender"},
			"additionalProperties": false,
		},
	}
	resp, err := client.CallWithSchemaModelAndTokens(ctx, prompt, schema, genderClassifyModel, 64, "none")
	if err != nil {
		return "", err
	}
	var parsed struct {
		Gender string `json:"gender"`
	}
	if err := json.Unmarshal([]byte(resp.Content), &parsed); err != nil {
		return "", nil
	}
	switch parsed.Gender {
	case "male", "female", "unknown":
		return parsed.Gender, nil
	default:
		return "", nil
	}
}
