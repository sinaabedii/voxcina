package services

import "testing"

func TestValidateModelNameAcceptsOpenRouterIDs(t *testing.T) {
	valid := []string{
		"",
		"google/gemini-3.7-flash",
		"openai/gpt-oss-20b:free",
		"x-ai/grok-4.5",
		"qwen/qwen3.5-flash-02-23",
		"google/gemini-2.5-flash-image",
		"z-ai/glm-5.3",
	}
	for _, name := range valid {
		if err := ValidateModelName(name); err != nil {
			t.Errorf("expected %q to be accepted: %v", name, err)
		}
	}
}

func TestValidateModelNameRejectsMalformedIDs(t *testing.T) {
	// A model name that never routes would fail on every customer message with
	// nothing in the dashboard to explain it, so the typo has to be caught here.
	invalid := []string{
		"gpt-4o",                    // no owner
		"openai/",                   // no model
		"/gpt-4o",                   // no owner
		"openai/gpt 4o",             // space
		"openai/gpt-4o/extra",       // too many segments
		"https://openrouter.ai/gpt", // a URL, not an id
		"openai/gpt-4o:",            // empty variant
	}
	for _, name := range invalid {
		if err := ValidateModelName(name); err == nil {
			t.Errorf("expected %q to be rejected", name)
		}
	}
}

func TestResolveModelPrefersOverride(t *testing.T) {
	if got := ResolveModel("z-ai/glm-5.3", "google/gemini-3.7-flash"); got != "z-ai/glm-5.3" {
		t.Fatalf("expected the admin override to win, got %q", got)
	}
	if got := ResolveModel("", "google/gemini-3.7-flash"); got != "google/gemini-3.7-flash" {
		t.Fatalf("an unset override must keep the built-in default, got %q", got)
	}
	if got := ResolveModel("   ", "google/gemini-3.7-flash"); got != "google/gemini-3.7-flash" {
		t.Fatalf("a blank override must keep the built-in default, got %q", got)
	}
	if got := ResolveModel("  z-ai/glm-5.3  ", "google/gemini-3.7-flash"); got != "z-ai/glm-5.3" {
		t.Fatalf("expected the override to be trimmed, got %q", got)
	}
}

func TestDefaultSupportChatModelFollowsEnvironment(t *testing.T) {
	t.Setenv("OPENROUTER_MODEL", "")
	if got := DefaultSupportChatModel(); got != "openai/gpt-oss-20b:free" {
		t.Fatalf("expected the built-in default, got %q", got)
	}

	t.Setenv("OPENROUTER_MODEL", "deepseek/deepseek-r1:free")
	if got := DefaultSupportChatModel(); got != "deepseek/deepseek-r1:free" {
		t.Fatalf("expected the environment value, got %q", got)
	}
}

func TestSaveAISettingsRejectsMalformedModelBeforeTouchingTheDatabase(t *testing.T) {
	if _, err := SaveAISettings(t.Context(), AISettings{ChatModel: "not a model"}); err == nil {
		t.Fatal("expected a malformed chat model to be rejected")
	}
	if _, err := SaveAISettings(t.Context(), AISettings{TryOnImageModel: "nope"}); err == nil {
		t.Fatal("expected a malformed try-on image model to be rejected")
	}
}
