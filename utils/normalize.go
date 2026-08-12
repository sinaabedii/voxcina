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
