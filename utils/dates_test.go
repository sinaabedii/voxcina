package utils

import (
	"testing"
	"time"
)

// Golden values cross-checked against the ICU Persian calendar
// (Intl.DateTimeFormat with the "persian" calendar), which follows the
// astronomical Solar Hijri calendar.
func TestGregorianToJalaliGolden(t *testing.T) {
	cases := []struct {
		gregorian           string
		jYear, jMonth, jDay int
	}{
		{"2023-01-01", 1401, 10, 11},
		{"2023-03-20", 1401, 12, 29},
		{"2023-03-21", 1402, 1, 1}, // Nowruz 1402
		{"2024-02-10", 1402, 11, 21},
		{"2024-03-19", 1402, 12, 29},
		{"2024-03-20", 1403, 1, 1}, // Nowruz 1403
		{"2024-08-22", 1403, 6, 1},
		{"2024-12-31", 1403, 10, 11},
		{"2025-03-19", 1403, 12, 29},
		{"2025-03-20", 1403, 12, 30}, // leap day of 1403
		{"2025-03-21", 1404, 1, 1},   // Nowruz 1404
		{"2026-03-20", 1404, 12, 29},
		{"2026-03-21", 1405, 1, 1}, // Nowruz 1405
		{"2026-08-22", 1405, 5, 31},
		{"2026-12-31", 1405, 10, 10},
		{"2027-03-21", 1406, 1, 1}, // Nowruz 1406
	}

	for _, c := range cases {
		g, err := time.Parse(time.DateOnly, c.gregorian)
		if err != nil {
			t.Fatalf("bad test input %q: %v", c.gregorian, err)
		}
		got := GregorianToJalali(g.UTC())
		if got.Year != c.jYear || got.Month != c.jMonth || got.Day != c.jDay {
			t.Errorf("GregorianToJalali(%s) = %d/%d/%d, want %d/%d/%d",
				c.gregorian, got.Year, got.Month, got.Day, c.jYear, c.jMonth, c.jDay)
		}
	}
}

// Every Jalali date must convert back to the exact Gregorian date it came from,
// and the Jalali day must advance by exactly one between consecutive days.
func TestJalaliRoundTripSweep(t *testing.T) {
	start := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)
	end := time.Date(2027, 12, 31, 12, 0, 0, 0, time.UTC)

	prev := JalaliDate{}
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		j := GregorianToJalali(d)
		if j == prev {
			t.Fatalf("date did not advance at %s -> %d/%d/%d", d.Format(time.DateOnly), j.Year, j.Month, j.Day)
		}

		g, err := JalaliToGregorian(j.Year, j.Month, j.Day)
		if err != nil {
			t.Fatalf("JalaliToGregorian(%d/%d/%d) failed: %v", j.Year, j.Month, j.Day, err)
		}
		want := d.Format(time.DateOnly)
		if got := g.Format(time.DateOnly); got != want {
			t.Fatalf("round trip %s -> %d/%d/%d -> %s, want %s", want, j.Year, j.Month, j.Day, got, want)
		}
		prev = j
	}
}

func TestJalaliToGregorianValidation(t *testing.T) {
	if g, err := JalaliToGregorian(1403, 12, 30); err != nil { // 1403 is a leap year
		t.Errorf("expected 1403/12/30 to be valid, got err=%v g=%v", err, g)
	} else if got, want := g.Format(time.DateOnly), "2025-03-20"; got != want {
		t.Errorf("JalaliToGregorian(1403,12,30) = %s, want %s", got, want)
	}

	for _, c := range []struct{ y, m, d int }{
		{1404, 12, 30}, // Esfand 30 in a non-leap year
		{1405, 13, 1},  // month out of range
		{1405, 0, 1},
		{1405, 1, 0},
		{1405, 1, 32},
	} {
		if _, err := JalaliToGregorian(c.y, c.m, c.d); err == nil {
			t.Errorf("expected %d/%d/%d to be rejected", c.y, c.m, c.d)
		}
	}

	if _, err := JalaliToGregorian(1370, 1, 1); err != nil {
		t.Errorf("expected 1370/01/01 to be valid, got %v", err)
	} else if g, _ := JalaliToGregorian(1370, 1, 1); g.Format(time.DateOnly) != "1991-03-21" {
		t.Errorf("JalaliToGregorian(1370,1,1) = %s, want 1991-03-21", g.Format(time.DateOnly))
	}
}

// An order created shortly after local midnight (21:00 UTC = 00:30 next day in
// Tehran) must display the Tehran calendar date, not the UTC one.
func TestToJalaliDateStringUsesTehranTime(t *testing.T) {
	utcEvening := time.Date(2026, 8, 21, 21, 0, 0, 0, time.UTC)
	if got, want := ToJalaliDateString(utcEvening), "31 مرداد 1405"; got != want {
		t.Errorf("ToJalaliDateString(2026-08-21T21:00Z) = %q, want %q", got, want)
	}

	beforeMidnight := time.Date(2026, 8, 21, 20, 29, 0, 0, time.UTC)
	if got, want := ToJalaliDateString(beforeMidnight), "30 مرداد 1405"; got != want {
		t.Errorf("ToJalaliDateString(2026-08-21T20:29Z) = %q, want %q", got, want)
	}
}

func TestFormatJalaliDateGuardsInvalidInput(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("FormatJalaliDate panicked on zero value: %v", r)
		}
	}()
	if got := FormatJalaliDate(JalaliDate{}); got != "" {
		t.Errorf("FormatJalaliDate(zero) = %q, want empty", got)
	}
	if got := FormatJalaliDate(JalaliDate{Year: 1405, Month: 5, Day: 31}); got != "31 مرداد 1405" {
		t.Errorf("FormatJalaliDate = %q", got)
	}
}
