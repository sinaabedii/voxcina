package services

import (
	"strings"
	"testing"
)

func TestGenderFromFirstNameDictionary(t *testing.T) {
	cases := []struct {
		name  string
		want  string
		label string
	}{
		{"ارغوان", "female", "persian female"},
		{"توحید", "male", "persian male"},
		{"سارا", "female", "common female"},
		{"سینا", "male", "common male"},
		{"فاطمه زهرا", "female", "compound female (first token wins)"},
		{"امیر حسین", "male", "compound male (first token wins)"},
		{"محمد رضا", "male", "compound religious male"},
		{"  سارا  ", "female", "surrounding whitespace"},
		{"سارا\n", "female", "trailing newline"},
		{"Sara", "female", "latin transliteration"},
		{"MOHAMMAD", "male", "uppercase latin"},
		{"خانم محمدی", "female", "honorific token decides"},
		{"آقای رضایی", "male", "honorific token decides"},
		{"آریا", "", "ambiguous name stays unknown"},
		{"مانا", "", "unisex name stays unknown"},
		{"یارا", "", "unisex name stays unknown"},
		{"X Æ A-12", "", "nonsense stays unknown"},
		{"", "", "empty stays unknown"},
	}
	for _, tc := range cases {
		if got := GenderFromFirstName(tc.name); got != tc.want {
			t.Errorf("%s: GenderFromFirstName(%q) = %q, want %q", tc.label, tc.name, got, tc.want)
		}
	}
}

func TestNormalizePersianNameFoldsVariants(t *testing.T) {
	// Arabic-script variants must hit the same dictionary entries.
	withArabicYeh := "سي" + "نا" // سینا with Arabic ي instead of ی
	if got := GenderFromFirstName(withArabicYeh); got != "male" {
		t.Errorf("arabic yeh variant of سینا = %q, want male", got)
	}
	// "نیلوفر" with Arabic ك/ي instead of ک/ی — build explicitly.
	runes := []rune("نیلوفر")
	for i, r := range runes {
		if r == 'ک' {
			runes[i] = 'ك'
		}
		if r == 'ی' {
			runes[i] = 'ي'
		}
	}
	if got := GenderFromFirstName(string(runes)); got != "female" {
		t.Errorf("arabic-script variant of نیلوفر = %q, want female", got)
	}
	// Zero-width non-joiner inside a name must not break the lookup.
	if got := GenderFromFirstName("سا\u200cرا"); got != "female" {
		t.Errorf("ZWNJ variant of سارا = %q, want female", got)
	}
}

func TestSystemPromptStatesCustomerGenderForAddress(t *testing.T) {
	base := SellerAgentInput{
		Request:      SellerChatRequest{Message: "سلام"},
		TryonContext: "مانتو مشکی - مشکی - 2500000 تومان",
		State:        ResolveNegotiationState(0, 0, ""),
	}

	female := base
	female.CustomerGender = "female"
	femalePrompt := systemPromptOf(t, female)
	if !strings.Contains(femalePrompt, "never call her داداش") {
		t.Errorf("female prompt does not forbid masculine address:\n%s", femalePrompt)
	}

	male := base
	male.CustomerGender = "male"
	if malePrompt := systemPromptOf(t, male); !strings.Contains(malePrompt, "never use feminine address terms for him") {
		t.Errorf("male prompt does not forbid feminine address:\n%s", malePrompt)
	}

	// Unknown (or unset) must render the neutral rule explicitly: an empty
	// gender line is what let the model default to masculine before.
	prompt := systemPromptOf(t, base)
	if !strings.Contains(prompt, "never default to masculine forms") {
		t.Errorf("unset gender: prompt lacks the neutral-address rule:\n%s", prompt)
	}
	if strings.Contains(prompt, "{{CUSTOMER_GENDER}}") {
		t.Error("unset gender: placeholder leaked into the prompt unsubstituted")
	}
}
