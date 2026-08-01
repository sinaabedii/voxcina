package utils

import (
	"fmt"
	"time"
)

// JalaliDate represents a date in the Jalali (Persian) calendar
type JalaliDate struct {
	Year  int `json:"year"`
	Month int `json:"month"`
	Day   int `json:"day"`
}

// GregorianToJalali converts a Gregorian date (time.Time) to a Jalali date
func GregorianToJalali(date time.Time) JalaliDate {
	// Adjust to UTC for consistency
	date = date.UTC()

	// Gregorian date constants
	gregorianYear := date.Year()
	gregorianMonth := int(date.Month())
	gregorianDay := date.Day()

	// Convert to days since the Gregorian epoch
	days := gregorianToDays(gregorianYear, gregorianMonth, gregorianDay)

	// Convert to Jalali
	jalaliYear, jalaliMonth, jalaliDay := daysToJalali(days)

	return JalaliDate{
		Year:  jalaliYear,
		Month: jalaliMonth,
		Day:   jalaliDay,
	}
}

// gregorianToDays converts a Gregorian date to days since epoch
func gregorianToDays(year, month, day int) int {
	// This is a simplified algorithm - for production use,
	// consider using a dedicated library with more complete calculations

	// Adjust month number for calculations
	if month <= 2 {
		month += 12
		year--
	}

	// Calculate days since epoch
	a := year / 100
	b := a / 4
	c := 2 - a + b
	e := int(365.25 * float64(year+4716))
	f := int(30.6001 * float64(month+1))

	return c + day + e + f - 1524
}

// daysToJalali converts days since epoch to Jalali date
func daysToJalali(days int) (year, month, day int) {
	// This is a simplified algorithm - for production use,
	// consider using a dedicated library with more complete calculations

	// Constants for Jalali calendar
	jalaliEpoch := 1948320

	// Convert days since Gregorian epoch to days since Jalali epoch
	jDays := days - jalaliEpoch

	// Calculate Jalali year
	jCycle := jDays / 1029983
	jRemaining := jDays % 1029983
	jYearFloat := 2820.0*float64(jCycle) + float64(jRemaining)/365.24219
	jYear := int(jYearFloat)

	// Calculate days in the Jalali year
	jDaysInYear := jRemaining - int(365.24219*float64(jYear))

	// Calculate Jalali month and day
	if jDaysInYear < 186 {
		jMonth := jDaysInYear/31 + 1
		jDay := jDaysInYear%31 + 1
		return jYear, jMonth, jDay
	} else {
		jMonth := (jDaysInYear-186)/30 + 7
		jDay := (jDaysInYear-186)%30 + 1
		return jYear, jMonth, jDay
	}
}

// FormatJalaliDate formats a Jalali date as a string
func FormatJalaliDate(date JalaliDate) string {
	// Map of Persian month names
	persianMonths := []string{
		"فروردین", "اردیبهشت", "خرداد",
		"تیر", "مرداد", "شهریور",
		"مهر", "آبان", "آذر",
		"دی", "بهمن", "اسفند",
	}

	// Format as Persian date string
	monthName := persianMonths[date.Month-1]
	return fmt.Sprintf("%d %s %d", date.Day, monthName, date.Year)
}

// ToJalaliDateString converts a time.Time to a formatted Jalali date string
func ToJalaliDateString(t time.Time) string {
	jalali := GregorianToJalali(t)
	return FormatJalaliDate(jalali)
}

// JalaliToGregorian converts a Jalali (year, month, day) to a Gregorian time.Time
func JalaliToGregorian(year, month, day int) (time.Time, error) {
	if month < 1 || month > 12 {
		return time.Time{}, fmt.Errorf("invalid Jalali month: %d", month)
	}
	if day < 1 || day > 31 {
		return time.Time{}, fmt.Errorf("invalid Jalali day: %d", day)
	}

	jDays := jalaliToDays(year, month, day)
	gYear, gMonth, gDay := daysToGregorian(jDays)

	return time.Date(gYear, time.Month(gMonth), gDay, 0, 0, 0, 0, time.UTC), nil
}

// jalaliToDays converts a Jalali date to days since epoch
func jalaliToDays(jYear, jMonth, jDay int) int {
	jCycle := (jYear - 1) / 2820
	jRemaining := (jYear - 1) % 2820

	jDayOfYear := 0
	if jMonth <= 6 {
		jDayOfYear = (jMonth - 1) * 31
	} else {
		jDayOfYear = 6*31 + (jMonth-7)*30
	}
	jDayOfYear += jDay

	totalDays := jCycle*1029983 + jRemaining*365 + jDayOfYear

	leapOffset := 0
	if jRemaining > 0 {
		leapOffset = (jRemaining*8 + 21) / 33
	}
	totalDays += leapOffset

	return totalDays + 1948320 + 1
}

// daysToGregorian converts days since epoch to Gregorian (year, month, day)
func daysToGregorian(days int) (year, month, day int) {
	l := days + 68569 + 2400001
	n := 4 * l / 146097
	l = l - (146097*n+3)/4
	i := 4000 * (l + 1) / 1461001
	l = l - 1461*i/4 + 31
	j := 80 * l / 2447
	day = l - 2447*j/80
	l = j / 11
	month = j + 2 - 12*l
	year = 100*(n-49) + i + l
	return year, month, day
}
