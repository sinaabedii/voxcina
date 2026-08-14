package services

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// The fitting room lets a customer talk to Sara before trying anything on, so
// the prompt has to say which of the two situations it is. It previously
// labelled the garment "Just tried on" unconditionally and the model duly told
// a customer who had worn nothing how the shirt looked on them.
func TestSystemPromptReportsFittingRoomStatus(t *testing.T) {
	base := SellerAgentInput{
		Request:      NegotiateRequest{Message: "سلام خوبی؟"},
		TryonContext: "پیراهن آبی - آبی - 1200000 تومان",
		State:        ResolveNegotiationState(0, 0, ""),
	}

	notTriedOn := systemPromptOf(t, base)
	if !strings.Contains(notTriedOn, "has NOT tried anything on yet") {
		t.Errorf("prompt for an untried garment does not say so:\n%s", notTriedOn)
	}
	if strings.Contains(notTriedOn, "Just tried on") {
		t.Error("prompt still claims a try-on happened when none did")
	}

	tried := base
	tried.TryonDone = true
	triedOn := systemPromptOf(t, tried)
	if !strings.Contains(triedOn, "HAS just tried this on") {
		t.Errorf("prompt for a completed try-on does not say so:\n%s", triedOn)
	}

	// The garment itself is named either way — only the claim about wearing it
	// changes.
	for name, prompt := range map[string]string{"not tried on": notTriedOn, "tried on": triedOn} {
		if !strings.Contains(prompt, base.TryonContext) {
			t.Errorf("%s: prompt dropped the garment context", name)
		}
	}
}

func systemPromptOf(t *testing.T, in SellerAgentInput) string {
	t.Helper()
	messages := buildSellerMessages(in)
	if len(messages) == 0 {
		t.Fatal("buildSellerMessages returned no messages")
	}
	content, ok := messages[0]["content"].(string)
	if !ok {
		t.Fatalf("first message has no string content: %#v", messages[0])
	}
	return content
}

// config/ai_prompts.json overrides the built-in template wholesale, so a
// placeholder the shipped file forgets is a placeholder that never renders in
// production no matter what the Go default says.
func TestShippedPromptTemplateCarriesEveryPlaceholder(t *testing.T) {
	data, err := os.ReadFile("../" + sellerAgentConfigPath)
	if err != nil {
		t.Skipf("%s unreadable from the package dir: %v", sellerAgentConfigPath, err)
	}

	var root struct {
		Seller *SellerAgentConfig `json:"seller_negotiation_agent"`
	}
	if err := json.Unmarshal(data, &root); err != nil {
		t.Fatalf("%s is not valid JSON: %v", sellerAgentConfigPath, err)
	}
	if root.Seller == nil || root.Seller.SystemPromptTemplate == "" {
		t.Skip("shipped config supplies no seller template; the built-in default applies")
	}

	for _, placeholder := range []string{
		"{{TRYON_CONTEXT}}",
		"{{TRYON_STATUS}}",
		"{{SUGGESTED}}",
		"{{CART}}",
		"{{COMPLEMENTARY}}",
		"{{NEGOTIATION_STATE}}",
		"{{FLOOR}}",
		"{{NEXT_STEP}}",
		"{{MAX_DISCOUNT}}",
	} {
		if !strings.Contains(root.Seller.SystemPromptTemplate, placeholder) {
			t.Errorf("shipped system_prompt_template is missing %s", placeholder)
		}
	}
}
