package services

import (
	"context"
	"net"
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

// newDirectPaymentHTTPClientForHost optionally replaces DNS resolution for a
// payment host while preserving the original hostname in the URL. This keeps
// TLS SNI/certificate validation correct when the deployment DNS resolver is
// unavailable, without routing the request through an HTTP proxy.
func newDirectPaymentHTTPClientForHost(timeout time.Duration, hostname, addressIP string) *http.Client {
	client := newDirectPaymentHTTPClient(timeout)
	if hostname == "" || net.ParseIP(addressIP) == nil {
		return client
	}

	transport := client.Transport.(*http.Transport)
	dialer := &net.Dialer{Timeout: timeout, KeepAlive: 30 * time.Second}
	transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		requestedHost, port, err := net.SplitHostPort(address)
		if err == nil && requestedHost == hostname {
			address = net.JoinHostPort(addressIP, port)
		}
		return dialer.DialContext(ctx, network, address)
	}
	return client
}
