package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestNormalizeCareerPhone(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  string
		ok    bool
	}{
		{"plain mobile", "09123456789", "09123456789", true},
		{"persian digits", "۰۹۱۲۳۴۵۶۷۸۹", "09123456789", true},
		{"arabic-indic digits", "٠٩١٢٣٤٥٦٧٨٩", "09123456789", true},
		{"spaces and dashes", " 0912-345 6789 ", "09123456789", true},
		{"plus 98", "+989123456789", "09123456789", true},
		{"double zero 98", "00989123456789", "09123456789", true},
		{"bare without leading zero", "9123456789", "09123456789", true},
		{"landline rejected", "02188776655", "", false},
		{"too short", "0912345678", "", false},
		{"too long", "091234567890", "", false},
		{"empty", "", "", false},
		{"letters only", "not-a-phone", "", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := normalizeCareerPhone(tc.input)
			if ok != tc.ok {
				t.Fatalf("normalizeCareerPhone(%q) ok = %v, want %v", tc.input, ok, tc.ok)
			}
			if got != tc.want {
				t.Errorf("normalizeCareerPhone(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestValidCareerEmail(t *testing.T) {
	valid := []string{"a@b.co", "erfan.norozi+jobs@voxcina.com", "hr_team@sub.domain.ir"}
	for _, email := range valid {
		if !validCareerEmail(email) {
			t.Errorf("validCareerEmail(%q) = false, want true", email)
		}
	}

	invalid := []string{"", "no-at-sign", "a@b", "@voxcina.com", "user@.com", "user@domain."}
	for _, email := range invalid {
		if validCareerEmail(email) {
			t.Errorf("validCareerEmail(%q) = true, want false", email)
		}
	}
}

func TestIsPDFChecksMagicBytes(t *testing.T) {
	if !isPDF([]byte("%PDF-1.7\n...")) {
		t.Error("a real PDF header was rejected")
	}
	// A file renamed to .pdf must not pass: the extension is attacker-controlled,
	// the magic bytes are not.
	if isPDF([]byte("<html><body>not a pdf</body></html>")) {
		t.Error("HTML disguised as a PDF was accepted")
	}
	if isPDF([]byte("%PDF")) {
		t.Error("a truncated header was accepted")
	}
	if isPDF(nil) {
		t.Error("empty data was accepted")
	}
}

func TestSanitizeResumeFileName(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  string
	}{
		{"keeps a normal name", "erfan-cv.pdf", "erfan-cv.pdf"},
		{"adds the extension", "resume", "resume.pdf"},
		{"strips traversal", "../../etc/passwd.pdf", "..-..-etc-passwd.pdf"},
		{"strips windows separators", `dir\cv.pdf`, "dir-cv.pdf"},
		{"strips quotes used to break the header", `cv";x.pdf`, "cvx.pdf"},
		{"falls back on an empty name", "   ", "resume.pdf"},
		{"keeps persian names", "رزومه-من.pdf", "رزومه-من.pdf"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := sanitizeResumeFileName(tc.input); got != tc.want {
				t.Errorf("sanitizeResumeFileName(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestContentDispositionAttachmentEncodesPersianNames(t *testing.T) {
	header := contentDispositionAttachment("رزومه.pdf")

	if !strings.HasPrefix(header, "attachment; ") {
		t.Fatalf("header does not force a download: %q", header)
	}
	// The ASCII fallback must stay inside quotes and carry no raw UTF-8, or a
	// legacy client mangles the header.
	for _, r := range header[:strings.Index(header, "filename*")] {
		if r > 126 {
			t.Fatalf("ASCII fallback contains a non-ASCII rune: %q", header)
		}
	}
	if !strings.Contains(header, "filename*=UTF-8''") {
		t.Errorf("header is missing the RFC 5987 parameter: %q", header)
	}
}

func TestCleanCareerTextStripsControlCharsAndTruncates(t *testing.T) {
	got := cleanCareerText("  سلام\x00 دنیا\r\n  ", 100)
	if strings.ContainsRune(got, 0) || strings.ContainsRune(got, '\r') {
		t.Errorf("control characters survived: %q", got)
	}
	if !strings.HasPrefix(got, "سلام") {
		t.Errorf("text was mangled: %q", got)
	}

	// Truncation counts runes, so Persian text is never cut mid-character.
	long := strings.Repeat("م", 50)
	truncated := cleanCareerText(long, 10)
	if runes := []rune(truncated); len(runes) != 10 {
		t.Errorf("truncated to %d runes, want 10", len(runes))
	}
}

func TestCareerRateLimiterBlocksBurstsPerKey(t *testing.T) {
	limiter := newCareerRateLimiter(2, time.Hour)

	for i := 0; i < 2; i++ {
		if !limiter.allowed("1.2.3.4") {
			t.Fatalf("attempt %d should be inside the budget", i+1)
		}
		limiter.record("1.2.3.4")
	}
	if limiter.allowed("1.2.3.4") {
		t.Error("the third attempt should be rejected")
	}
	// The budget is per key: another visitor is unaffected.
	if !limiter.allowed("5.6.7.8") {
		t.Error("a different IP should not inherit the block")
	}
	// An unknown IP (header stripped) must never be blocked wholesale.
	if !limiter.allowed("") {
		t.Error("an empty key should be allowed through")
	}
}

func TestCareerRateLimiterOnlyChargesRecordedSubmissions(t *testing.T) {
	limiter := newCareerRateLimiter(1, time.Hour)

	// A rejected submission checks the budget but never records, so a visitor
	// correcting a validation error keeps their whole allowance.
	for i := 0; i < 5; i++ {
		if !limiter.allowed("1.2.3.4") {
			t.Fatalf("check %d spent budget it should not have", i+1)
		}
	}

	limiter.record("1.2.3.4")
	if limiter.allowed("1.2.3.4") {
		t.Error("the budget should be spent after one recorded submission")
	}
}

func TestCareerRateLimiterForgetsExpiredHits(t *testing.T) {
	limiter := newCareerRateLimiter(1, 10*time.Millisecond)

	limiter.record("1.2.3.4")
	if limiter.allowed("1.2.3.4") {
		t.Fatal("a second attempt inside the window should be blocked")
	}

	time.Sleep(15 * time.Millisecond)
	if !limiter.allowed("1.2.3.4") {
		t.Error("the window should have rolled over")
	}
}
