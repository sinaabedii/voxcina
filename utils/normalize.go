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
