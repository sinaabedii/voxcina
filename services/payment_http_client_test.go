package services

import (
	"net/http"
	"testing"
)

func TestNewDirectPaymentHTTPClientDoesNotUseProcessProxy(t *testing.T) {
	t.Setenv("HTTP_PROXY", "http://proxy.example.test:8080")
	t.Setenv("HTTPS_PROXY", "http://proxy.example.test:8080")

	client := newDirectPaymentHTTPClient(1)
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("expected *http.Transport, got %T", client.Transport)
	}
	if transport.Proxy != nil {
		t.Fatal("payment transport must bypass process proxy settings")
	}
}
