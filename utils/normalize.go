package utils

import "strings"

// NormalizePersianDigits converts Persian/Arabic digits to Latin (ASCII) digits
// and trims whitespace. This prevents data inconsistency when users type with
// Persian keyboard layouts.
func NormalizePersianDigits(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case r >= '\u06F0' && r <= '\u06F9': // Persian digits ۰-۹
			b.WriteRune(r - '\u06F0' + '0')
		case r >= '\u0660' && r <= '\u0669': // Arabic-Indic digits ٠-٩
			b.WriteRune(r - '\u0660' + '0')
		default:
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
}

// NormalizeIRPhone canonicalizes an Iranian mobile number to the 09xxxxxxxxx
// form stored on users.phone. It accepts the spellings users actually type:
//
//	09123456789   9123456789   +989123456789   00989123456789   989123456789
//
// Persian/Arabic-Indic digits are converted first (NormalizePersianDigits) and
// every separator character (spaces, dashes, parentheses, the WhatsApp-style
// zero-width junk) is stripped, keeping only digits and an optional leading +.
// The result is best-effort: a value that cannot be mapped still comes back
// trimmed so the caller can validate it against the 09xxxxxxxxx regex and show
// a precise error instead of a silent mis-store.
func NormalizeIRPhone(raw string) string {
	s := NormalizePersianDigits(raw)

	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '+':
			b.WriteRune(r)
		}
	}
	s = b.String()

	// Strip the international prefix variants of +98.
	switch {
	case strings.HasPrefix(s, "+98"):
		s = s[3:]
	case strings.HasPrefix(s, "0098"):
		s = s[4:]
	case len(s) == 12 && strings.HasPrefix(s, "98"):
		// 98 + 10 digits without a plus — the common copy-paste form.
		s = s[2:]
	case len(s) == 13 && strings.HasPrefix(s, "98") && s[2] == '0':
		// 98 + 09XXXXXXXXX — international prefix plus the kept trunk zero.
		s = s[2:]
	}

	// 9XXXXXXXXX (trunk prefix lost) → 09XXXXXXXXX.
	if len(s) == 10 && strings.HasPrefix(s, "9") {
		s = "0" + s
	}
	return s
}

// TruncateRunes shortens s to at most max runes. Unlike slicing a string by
// byte offset it never splits a multi-byte rune, so truncated Persian text
// stays valid UTF-8 — important for log lines built from user messages and
// upstream API bodies.
func TruncateRunes(s string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max])
}
