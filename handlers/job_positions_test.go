package handlers

import (
	"strings"
	"testing"

	"backEnd/models"
)

func strPtr(v string) *string { return &v }

// validPayload is a complete, valid create body; each test tweaks one field.
func validPayload() jobPositionPayload {
	return jobPositionPayload{
		Title:          strPtr("توسعه‌دهنده بک‌اند"),
		Department:     strPtr("فناوری"),
		EmploymentType: strPtr("تمام‌وقت"),
		Location:       strPtr("تهران"),
		Summary:        strPtr("توسعه سرویس‌های Go و طراحی API برای فروشگاه."),
	}
}

func TestJobPositionPayloadAcceptsCompletePosting(t *testing.T) {
	var position models.JobPosition
	if msg := validPayload().apply(&position); msg != "" {
		t.Fatalf("a valid posting was rejected: %s", msg)
	}
	if position.Title != "توسعه‌دهنده بک‌اند" {
		t.Errorf("title = %q", position.Title)
	}
	if position.EmploymentType != "تمام‌وقت" {
		t.Errorf("employment type = %q", position.EmploymentType)
	}
}

func TestJobPositionPayloadRejectsIncompletePostings(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*jobPositionPayload)
	}{
		{"missing title", func(p *jobPositionPayload) { p.Title = strPtr("") }},
		{"one-character title", func(p *jobPositionPayload) { p.Title = strPtr("ا") }},
		{"missing department", func(p *jobPositionPayload) { p.Department = strPtr("  ") }},
		{"missing location", func(p *jobPositionPayload) { p.Location = strPtr("") }},
		{"short summary", func(p *jobPositionPayload) { p.Summary = strPtr("کوتاه") }},
		{"unknown employment type", func(p *jobPositionPayload) { p.EmploymentType = strPtr("full-time") }},
		{"empty employment type", func(p *jobPositionPayload) { p.EmploymentType = strPtr("") }},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			payload := validPayload()
			tc.mutate(&payload)

			var position models.JobPosition
			if msg := payload.apply(&position); msg == "" {
				t.Error("an invalid posting was accepted")
			}
		})
	}
}

func TestJobPositionPayloadPatchesOnlySentFields(t *testing.T) {
	// An update that only flips the publish toggle must keep everything else,
	// which is what lets the admin list deactivate a posting without resending
	// the whole form.
	stored := models.JobPosition{
		Title:          "مدیر محصول",
		Department:     "محصول",
		EmploymentType: "تمام‌وقت",
		Location:       "تهران",
		Summary:        "هدایت نقشه راه محصول و اولویت‌بندی قابلیت‌ها.",
		IsActive:       true,
		DisplayOrder:   20,
	}

	inactive := false
	payload := jobPositionPayload{IsActive: &inactive}
	if msg := payload.apply(&stored); msg != "" {
		t.Fatalf("a partial update was rejected: %s", msg)
	}

	if stored.IsActive {
		t.Error("is_active was not applied")
	}
	if stored.Title != "مدیر محصول" || stored.Department != "محصول" {
		t.Errorf("stored fields were clobbered: %+v", stored)
	}
	if stored.DisplayOrder != 20 {
		t.Errorf("display order = %d, want 20", stored.DisplayOrder)
	}
}

func TestJobPositionPayloadCleansRequirements(t *testing.T) {
	requirements := []string{
		"  تسلط بر Go  ",
		"", // a blank row left behind in the admin form
		"   ",
		"آشنایی با MongoDB",
	}
	payload := validPayload()
	payload.Requirements = &requirements

	var position models.JobPosition
	if msg := payload.apply(&position); msg != "" {
		t.Fatalf("valid requirements were rejected: %s", msg)
	}
	if len(position.Requirements) != 2 {
		t.Fatalf("requirements = %#v, want the two non-empty rows", position.Requirements)
	}
	if position.Requirements[0] != "تسلط بر Go" {
		t.Errorf("requirement was not trimmed: %q", position.Requirements[0])
	}
}

func TestJobPositionPayloadCapsRequirementCount(t *testing.T) {
	requirements := make([]string, models.JobPositionMaxRequirements+5)
	for i := range requirements {
		requirements[i] = "شرط"
	}
	payload := validPayload()
	payload.Requirements = &requirements

	var position models.JobPosition
	if msg := payload.apply(&position); msg != "" {
		t.Fatalf("apply failed: %s", msg)
	}
	if len(position.Requirements) != models.JobPositionMaxRequirements {
		t.Errorf("kept %d requirements, want the cap of %d",
			len(position.Requirements), models.JobPositionMaxRequirements)
	}
}

func TestJobPositionPayloadTruncatesLongText(t *testing.T) {
	payload := validPayload()
	payload.Title = strPtr(strings.Repeat("ط", models.JobPositionTitleMaxLength+50))

	var position models.JobPosition
	if msg := payload.apply(&position); msg != "" {
		t.Fatalf("apply failed: %s", msg)
	}
	if runes := []rune(position.Title); len(runes) != models.JobPositionTitleMaxLength {
		t.Errorf("title kept %d runes, want %d", len(runes), models.JobPositionTitleMaxLength)
	}
}

func TestJobPositionPayloadRejectsOutOfRangeOrder(t *testing.T) {
	negative := -1
	payload := validPayload()
	payload.DisplayOrder = &negative

	var position models.JobPosition
	if msg := payload.apply(&position); msg == "" {
		t.Error("a negative display order was accepted")
	}
}

func TestValidJobPositionEmploymentType(t *testing.T) {
	for _, allowed := range models.JobPositionEmploymentTypes {
		if !models.ValidJobPositionEmploymentType(allowed) {
			t.Errorf("%q is offered by the admin form but rejected by validation", allowed)
		}
	}
	if models.ValidJobPositionEmploymentType("تمام وقت") {
		t.Error("a spacing variant was accepted; the closed set must stay exact")
	}
}
