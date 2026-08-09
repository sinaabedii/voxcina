package services

import (
	"net/http"
	"time"
)

// newDirectPaymentHTTPClient isolates payment traffic from the process-wide
// HTTP proxy. Other backend services and Docker build steps continue to use
// HTTP_PROXY/HTTPS_PROXY normally.
func newDirectPaymentHTTPClient(timeout time.Duration) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}
}
