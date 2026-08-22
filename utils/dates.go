package utils

import (
	"fmt"
	"time"

	// Embed the tz database so Asia/Tehran resolves inside minimal containers.
	_ "time/tzdata"

	pc "github.com/yaa110/go-persian-calendar"
)

// tehran is the timezone used for all Jalali (Persian calendar) rendering so
// that dates are consistent with what users in Iran expect, including for
// events that fall between 00:00 and 03:30 local time.
var tehran = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Tehran")
	if err != nil {
		// Iran Standard Time is fixed at UTC+03:30 (no DST since 2022).
		return time.FixedZone("Asia/Tehran", 3*3600+30*60)
	}
	return loc
}()

// JalaliDate represents a date in the Jalali (Persian) calendar
type JalaliDate struct {
	Year  int `json:"year"`
	Month int `json:"month"`
	Day   int `json:"day"`
}

// GregorianToJalali converts a Gregorian date (time.Time) to a Jalali date,
// evaluated in the Asia/Tehran timezone.
func GregorianToJalali(date time.Time) JalaliDate {
	p := pc.New(date.In(tehran))
	return JalaliDate{
		Year:  p.Year(),
		Month: int(p.Month()),
		Day:   p.Day(),
	}
}

// FormatJalaliDate formats a Jalali date as a string
func FormatJalaliDate(date JalaliDate) string {
	if date.Month < 1 || date.Month > 12 || date.Day < 1 || date.Day > 31 {
		return ""
	}
	return fmt.Sprintf("%d %s %d", date.Day, pc.Month(date.Month).String(), date.Year)
}

// ToJalaliDateString converts a time.Time to a formatted Jalali date string
func ToJalaliDateString(t time.Time) string {
	jalali := GregorianToJalali(t)
	return FormatJalaliDate(jalali)
}

// JalaliToGregorian converts a Jalali (year, month, day) to a Gregorian time.Time
// at midnight UTC. Invalid days (e.g. Esfand 30 in a non-leap year) are rejected
// instead of being normalized into the next month.
func JalaliToGregorian(year, month, day int) (time.Time, error) {
	if month < 1 || month > 12 {
		return time.Time{}, fmt.Errorf("invalid Jalali month: %d", month)
	}
	lastDay := pc.Date(year, pc.Month(month), 1, 0, 0, 0, 0, time.UTC).LastMonthDay().Day()
	if day < 1 || day > lastDay {
		return time.Time{}, fmt.Errorf("invalid Jalali day %d of month %d in year %d", day, month, year)
	}

	g := pc.Date(year, pc.Month(month), day, 0, 0, 0, 0, time.UTC).Time().UTC()
	return time.Date(g.Year(), g.Month(), g.Day(), 0, 0, 0, 0, time.UTC), nil
}
