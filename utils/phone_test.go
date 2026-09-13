package utils

import "testing"

func TestNormalizeIRPhone(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"already canonical", "09123456789", "09123456789"},
		{"trunk prefix lost", "9123456789", "09123456789"},
		{"plus 98", "+989123456789", "09123456789"},
		{"double zero 98", "00989123456789", "09123456789"},
		{"bare 98 copy paste", "989123456789", "09123456789"},
		{"98 with trunk zero", "9809123456789", "09123456789"},
		{"persian digits", "۰۹۱۲۳۴۵۶۷۸۹", "09123456789"},
		{"arabic digits", "٠٩١٢٣٤٥٦٧٨٩", "09123456789"},
		{"separators", "+98 912 345-6789", "09123456789"},
		{"parentheses and dashes", "(0912) 345 6789", "09123456789"},
		{"plus and separators", "+98-912-3456789", "09123456789"},
		{"mixed persian and separators", "+۹۸ ۹۱۲ ۳۴۵ ۶۷۸۹", "09123456789"},
		{"too short untouched", "12345", "12345"},
		{"garbage mostly stripped", "abc09123456789def", "09123456789"},
		{"empty", "", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := NormalizeIRPhone(tc.in); got != tc.want {
				t.Errorf("NormalizeIRPhone(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestNormalizeIRPhoneStaysValidAfterRegexShape(t *testing.T) {
	// Every canonical spelling must normalize to exactly 11 digits starting 09.
	for _, in := range []string{"09123456789", "9123456789", "+989123456789", "00989123456789", "989123456789"} {
		got := NormalizeIRPhone(in)
		if len(got) != 11 || got[:2] != "09" {
			t.Errorf("NormalizeIRPhone(%q) = %q, want 11 digits starting 09", in, got)
		}
	}
}
