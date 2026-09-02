package handlers

import (
	"net/http/httptest"
	"testing"

	"backEnd/services/authjwt"
)

func TestClientPlatformFromRequest(t *testing.T) {
	cases := []struct {
		name   string
		header string // "" = header absent
		want   string
	}{
		{"android", "android", authjwt.ClientAndroid},
		{"android uppercase from a future build", "ANDROID", authjwt.ClientAndroid},
		{"android padded", "  android ", authjwt.ClientAndroid},
		{"absent header is web", "", authjwt.ClientWeb},
		{"explicit web", "web", authjwt.ClientWeb},
		{"unknown platform falls back to web", "ios", authjwt.ClientWeb},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/api/users/login", nil)
			if tc.header != "" {
				r.Header.Set("X-Client-Platform", tc.header)
			}
			if got := clientPlatformFromRequest(r); got != tc.want {
				t.Errorf("clientPlatformFromRequest(X-Client-Platform=%q) = %q, want %q", tc.header, got, tc.want)
			}
		})
	}
}
