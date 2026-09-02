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
		Request:      SellerChatRequest{Message: "سلام خوبی؟"},
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

// config/ai_prompts.json overrides the built-in templates wholesale, so a
// placeholder the shipped file forgets is a placeholder that never renders in
// production no matter what the Go default says. The tryon assistant and the
// checkout negotiator are separate agents with separate placeholder sets —
// see services/coupon_negotiation_service.go's defaultTryonAgentConfig and
// defaultSellerAgentConfig.
func TestShippedTryonPromptTemplateCarriesEveryPlaceholder(t *testing.T) {
	tmpl := shippedTemplate(t, "tryon_assistant_agent")
	if tmpl == "" {
		t.Skip("shipped config supplies no tryon template; the built-in default applies")
	}
	for _, placeholder := range []string{
		"{{TRYON_CONTEXT}}",
		"{{TRYON_STATUS}}",
		"{{SUGGESTED}}",
		"{{CART}}",
		"{{COMPLEMENTARY}}",
	} {
		if !strings.Contains(tmpl, placeholder) {
			t.Errorf("shipped tryon_assistant_agent system_prompt_template is missing %s", placeholder)
		}
	}
}

func TestShippedCheckoutPromptTemplateCarriesEveryPlaceholder(t *testing.T) {
	tmpl := shippedTemplate(t, "checkout_negotiation_agent")
	if tmpl == "" {
		t.Skip("shipped config supplies no checkout template; the built-in default applies")
	}
	for _, placeholder := range []string{
		"{{CART}}",
		"{{NEGOTIATION_STATE}}",
		"{{FLOOR}}",
		"{{NEXT_STEP}}",
		"{{MAX_DISCOUNT}}",
	} {
		if !strings.Contains(tmpl, placeholder) {
			t.Errorf("shipped checkout_negotiation_agent system_prompt_template is missing %s", placeholder)
		}
	}
}

func shippedTemplate(t *testing.T, key string) string {
	t.Helper()
	data, err := os.ReadFile("../" + sellerAgentConfigPath)
	if err != nil {
		t.Skipf("%s unreadable from the package dir: %v", sellerAgentConfigPath, err)
	}

	var root map[string]json.RawMessage
	if err := json.Unmarshal(data, &root); err != nil {
		t.Fatalf("%s is not valid JSON: %v", sellerAgentConfigPath, err)
	}
	raw, ok := root[key]
	if !ok {
		return ""
	}
	var cfg SellerAgentConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		t.Fatalf("%s.%s is not a valid agent config: %v", sellerAgentConfigPath, key, err)
	}
	return cfg.SystemPromptTemplate
}
