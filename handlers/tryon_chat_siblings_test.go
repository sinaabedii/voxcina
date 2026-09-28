package handlers

import (
	"strings"
	"testing"

	"backEnd/models"
)

// The sibling-colors block is the only grounded source for "رنگ دیگه‌ای
// ازش هست؟": it must list the tried garment's own other colors with real
// stock, never the tried variant itself, and never invent availability.
func TestSiblingColorLineListsInStockSiblingsWithSizes(t *testing.T) {
	variants := []models.ColorVariant{
		{Color: "green", ColorName: "سبز", Sizes: []models.SizeVariant{{Size: "M", Quantity: 1}}},
		{Color: "black", ColorName: "مشکی", Sizes: []models.SizeVariant{{Size: "S", Quantity: 2}, {Size: "L", Quantity: 0}}},
		{Color: "navy", ColorName: "سرمه‌ای", Sizes: []models.SizeVariant{{Size: "M", Quantity: 3}}},
	}

	line := siblingColorLine(variants, "green")
	if !strings.Contains(line, "رنگ‌های دیگر همین مدل") {
		t.Errorf("sibling line missing header:\n%s", line)
	}
	for _, want := range []string{"مشکی (سایزهای S)", "سرمه‌ای (سایزهای M)"} {
		if !strings.Contains(line, want) {
			t.Errorf("sibling line missing %q:\n%s", want, line)
		}
	}
	// The zero-quantity L must not leak into the size list.
	if strings.Contains(line, "L") {
		t.Errorf("sibling line lists an out-of-stock size:\n%s", line)
	}
}

// The tried variant is excluded whether the request named its Color value or
// its ColorName — both are how findColorVariant can match it.
func TestSiblingColorLineExcludesTriedVariant(t *testing.T) {
	variants := []models.ColorVariant{
		{Color: "green", ColorName: "سبز", Sizes: []models.SizeVariant{{Size: "M", Quantity: 1}}},
		{Color: "black", ColorName: "مشکی", Sizes: []models.SizeVariant{{Size: "S", Quantity: 2}}},
	}

	for _, tried := range []string{"green", "سبز"} {
		line := siblingColorLine(variants, tried)
		if strings.Contains(line, "سبز") {
			t.Errorf("tried variant leaked into sibling line for tried=%q:\n%s", tried, line)
		}
		if !strings.Contains(line, "مشکی") {
			t.Errorf("sibling missing for tried=%q:\n%s", tried, line)
		}
	}
}

// Out-of-stock siblings are marked ناموجود so the agent says "تمام شده"
// instead of denying the color exists.
func TestSiblingColorLineMarksOutOfStockSiblings(t *testing.T) {
	variants := []models.ColorVariant{
		{Color: "green", ColorName: "سبز", Sizes: []models.SizeVariant{{Size: "M", Quantity: 1}}},
		{Color: "cream", ColorName: "کرمی", Sizes: []models.SizeVariant{{Size: "M", Quantity: 0}}},
		{Color: "red", ColorName: "قرمز"},
	}

	line := siblingColorLine(variants, "green")
	for _, want := range []string{"کرمی (ناموجود)", "قرمز (ناموجود)", "ناموجود:"} {
		if !strings.Contains(line, want) {
			t.Errorf("sibling line missing %q:\n%s", want, line)
		}
	}
}

// A lone variant (or none at all) yields no block — there is nothing truthful
// to say about "other colors".
func TestSiblingColorLineEmptyWhenNoSiblings(t *testing.T) {
	only := []models.ColorVariant{
		{Color: "green", ColorName: "سبز", Sizes: []models.SizeVariant{{Size: "M", Quantity: 1}}},
	}
	if got := siblingColorLine(only, "green"); got != "" {
		t.Errorf("single variant produced a sibling line:\n%s", got)
	}
	if got := siblingColorLine(nil, "green"); got != "" {
		t.Errorf("nil variants produced a sibling line:\n%s", got)
	}
	if got := siblingColorLine([]models.ColorVariant{}, "green"); got != "" {
		t.Errorf("empty variants produced a sibling line:\n%s", got)
	}
}

// Nameless variants carry no color word the agent could speak, so they are
// skipped rather than rendered as empty entries.
func TestSiblingColorLineSkipsNamelessVariants(t *testing.T) {
	variants := []models.ColorVariant{
		{Color: "green", ColorName: "سبز", Sizes: []models.SizeVariant{{Size: "M", Quantity: 1}}},
		{Sizes: []models.SizeVariant{{Size: "M", Quantity: 5}}},
	}
	if got := siblingColorLine(variants, "green"); got != "" {
		t.Errorf("nameless variant produced a sibling line:\n%s", got)
	}
}
