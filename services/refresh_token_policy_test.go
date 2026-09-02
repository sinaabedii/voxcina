package services

import (
	"testing"
	"time"

	"backEnd/services/authjwt"
)

func TestNormalizeClient(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"android kept", authjwt.ClientAndroid, authjwt.ClientAndroid},
		{"web kept", authjwt.ClientWeb, authjwt.ClientWeb},
		{"legacy empty row is web", "", authjwt.ClientWeb},
		{"unknown is web", "ios", authjwt.ClientWeb},
		{"case is exact at this layer", "Android", authjwt.ClientWeb},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := normalizeClient(tc.in); got != tc.want {
				t.Errorf("normalizeClient(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestRefreshExpiryForAndroidIsPopulatedFarFuture(t *testing.T) {
	now := time.Date(2026, 9, 3, 12, 0, 0, 0, time.UTC)
	got := authjwt.RefreshExpiryFor(now, authjwt.ClientAndroid)

	// A 100-year time.Duration would overflow int64 nanoseconds; AddDate is
	// what keeps this representable. Pin the intended value explicitly.
	want := time.Date(2126, 9, 3, 12, 0, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("android expiry = %v, want %v", got, want)
	}
	if got.Before(now.AddDate(50, 0, 0)) {
		t.Fatalf("android expiry %v is not effectively permanent", got)
	}
	// Every expiry consumer (ParseToken's exp check, Rotate's record check, the
	// TTL index) compares a populated date — a zero value would be the bug.
	if got.IsZero() {
		t.Fatal("android expiry must be populated, not zero")
	}
}

func TestRefreshExpiryForWebClients(t *testing.T) {
	now := time.Now()
	for _, client := range []string{authjwt.ClientWeb, "", "ios"} {
		got := authjwt.RefreshExpiryFor(now, client)
		want := now.Add(authjwt.RefreshTokenTTL)
		if !got.Equal(want) {
			t.Errorf("RefreshExpiryFor(now, %q) = %v, want now+RefreshTokenTTL (%v)", client, got, want)
		}
	}
}
