package services

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"testing"
	"time"

	"backEnd/models"
)

func TestNewEmailServiceDefaultsAndProxyFallback(t *testing.T) {
	t.Setenv("SMTP_HOST", "")
	t.Setenv("SMTP_PORT", "")
	t.Setenv("SMTP_USERNAME", "")
	t.Setenv("SMTP_PASSWORD", "")
	t.Setenv("MAIL_FROM", "")
	t.Setenv("MAIL_FROM_NAME", "")
	t.Setenv("SMTP_PROXY", "")
	t.Setenv("HTTPS_PROXY", "")
	t.Setenv("HTTP_PROXY", "")

	service := NewEmailService()
	if service.host != smtpDefaultHost {
		t.Fatalf("expected default host %q, got %q", smtpDefaultHost, service.host)
	}
	if service.port != smtpDefaultPort {
		t.Fatalf("expected default port %d, got %d", smtpDefaultPort, service.port)
	}
	if service.fromName != "وکسینا" {
		t.Fatalf("expected default from name, got %q", service.fromName)
	}
	if service.proxyURL != "" {
		t.Fatalf("expected no proxy, got %q", service.proxyURL)
	}
	if service.IsConfigured() {
		t.Fatal("service must not be configured without credentials")
	}

	t.Setenv("SMTP_USERNAME", "sender@gmail.com")
	t.Setenv("SMTP_PASSWORD", "app-password")
	t.Setenv("HTTPS_PROXY", "http://host.docker.internal:10809")
	service = NewEmailService()
	if !service.IsConfigured() {
		t.Fatal("service must be configured once credentials are set")
	}
	if service.from != "sender@gmail.com" {
		t.Fatalf("MAIL_FROM must default to SMTP_USERNAME, got %q", service.from)
	}
	if service.proxyURL != "http://host.docker.internal:10809" {
		t.Fatalf("expected HTTPS_PROXY fallback, got %q", service.proxyURL)
	}

	t.Setenv("SMTP_PROXY", "http://smtp-proxy.example.test:8080")
	if service = NewEmailService(); service.proxyURL != "http://smtp-proxy.example.test:8080" {
		t.Fatalf("SMTP_PROXY must win over HTTPS_PROXY, got %q", service.proxyURL)
	}
}

func TestCareerConfirmationContentJob(t *testing.T) {
	submission := models.CareerSubmission{
		Type:          models.CareerSubmissionTypeJob,
		FullName:      "علی رضایی",
		Email:         "ali@example.com",
		Position:      "برنامه‌نویس بک‌اند",
		ReferenceCode: "JOB-00042",
	}

	subject, textBody, htmlBody := careerConfirmationContent(submission)

	for _, want := range []string{"برنامه‌نویس بک‌اند", "JOB-00042"} {
		if !strings.Contains(subject, want) {
			t.Fatalf("subject %q must contain %q", subject, want)
		}
	}
	for _, want := range []string{"علی رضایی", "برنامه‌نویس بک‌اند", "JOB-00042", "info@voxcina.com"} {
		if !strings.Contains(textBody, want) {
			t.Fatalf("text body must contain %q", want)
		}
	}
	for _, want := range []string{`dir="rtl"`, "علی رضایی", "برنامه‌نویس بک‌اند", "JOB-00042"} {
		if !strings.Contains(htmlBody, want) {
			t.Fatalf("html body must contain %q", want)
		}
	}
}

func TestCareerConfirmationContentPartnership(t *testing.T) {
	submission := models.CareerSubmission{
		Type:          models.CareerSubmissionTypePartnership,
		FullName:      "مریم احمدی",
		Email:         "maryam@example.com",
		CompanyName:   "شرکت نمونه",
		BusinessType:  "پوشاک",
		ReferenceCode: "PRT-00007",
	}

	subject, textBody, htmlBody := careerConfirmationContent(submission)

	if !strings.Contains(subject, "PRT-00007") {
		t.Fatalf("subject %q must contain the reference code", subject)
	}
	for _, want := range []string{"شرکت نمونه", "پوشاک", "PRT-00007"} {
		if !strings.Contains(textBody, want) {
			t.Fatalf("text body must contain %q", want)
		}
		if !strings.Contains(htmlBody, want) {
			t.Fatalf("html body must contain %q", want)
		}
	}
}

func TestCareerConfirmationContentEscapesHTML(t *testing.T) {
	submission := models.CareerSubmission{
		Type:          models.CareerSubmissionTypeJob,
		FullName:      `<b>علی</b>`,
		Email:         "ali@example.com",
		Position:      `<script>alert(1)</script>`,
		ReferenceCode: "JOB-00043",
	}

	_, _, htmlBody := careerConfirmationContent(submission)

	if strings.Contains(htmlBody, `<b>علی</b>`) || strings.Contains(htmlBody, `<script>`) {
		t.Fatal("html body must escape interpolated values")
	}
	if !strings.Contains(htmlBody, "&lt;b&gt;علی&lt;/b&gt;") {
		t.Fatal("expected escaped full name in html body")
	}
	if !strings.Contains(htmlBody, "&lt;script&gt;alert(1)&lt;/script&gt;") {
		t.Fatal("expected escaped position in html body")
	}
}

func TestBuildMessageProducesMultipartAlternativeWithEncodedHeaders(t *testing.T) {
	service := &EmailService{
		host:     smtpDefaultHost,
		port:     smtpDefaultPort,
		from:     "info@voxcina.com",
		fromName: "وکسینا",
	}

	subject := "ثبت درخواست همکاری — کد رهگیری JOB-00042"
	textBody := "متن ساده"
	htmlBody := "<p>متن اچ‌تی‌ام‌ال</p>"
	message := service.buildMessage("applicant@example.com", subject, textBody, htmlBody)

	parsed, err := mail.ReadMessage(bytes.NewReader(message))
	if err != nil {
		t.Fatalf("message must parse as RFC 5322: %v", err)
	}
	if got := parsed.Header.Get("Auto-Submitted"); got != "auto-replied" {
		t.Fatalf("expected Auto-Submitted: auto-replied, got %q", got)
	}
	if got := parsed.Header.Get("From"); !strings.Contains(got, "info@voxcina.com") {
		t.Fatalf("unexpected From header %q", got)
	}
	if got := parsed.Header.Get("Message-ID"); !strings.HasSuffix(got, "@voxcina.com>") {
		t.Fatalf("unexpected Message-ID header %q", got)
	}

	decodedSubject, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
	if err != nil {
		t.Fatalf("subject must decode: %v", err)
	}
	if decodedSubject != subject {
		t.Fatalf("expected subject %q, got %q", subject, decodedSubject)
	}

	mediaType, params, err := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
	if err != nil || mediaType != "multipart/alternative" {
		t.Fatalf("expected multipart/alternative content type, got %q (err=%v)", mediaType, err)
	}

	reader := multipart.NewReader(parsed.Body, params["boundary"])
	parts := map[string]string{}
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("reading multipart part: %v", err)
		}
		raw, err := io.ReadAll(part)
		if err != nil {
			t.Fatalf("reading part body: %v", err)
		}
		decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(string(raw), "\r\n", ""))
		if err != nil {
			t.Fatalf("part %s must be valid base64: %v", part.Header.Get("Content-Type"), err)
		}
		parts[part.Header.Get("Content-Type")] = string(decoded)
	}

	if parts["text/plain; charset=UTF-8"] != textBody {
		t.Fatalf("unexpected plain text part %q", parts["text/plain; charset=UTF-8"])
	}
	if parts["text/html; charset=UTF-8"] != htmlBody {
		t.Fatalf("unexpected html part %q", parts["text/html; charset=UTF-8"])
	}
}

func TestDialViaHTTPConnectTunnelsThroughProxy(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	serverErr := make(chan error, 1)
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			serverErr <- err
			return
		}
		defer conn.Close()

		request, err := http.ReadRequest(bufio.NewReader(conn))
		if err != nil {
			serverErr <- err
			return
		}
		if request.Method != http.MethodConnect || request.Host != "smtp.example.test:587" {
			serverErr <- errors.New("unexpected CONNECT request")
			return
		}
		if _, err := conn.Write([]byte("HTTP/1.1 200 Connection established\r\n\r\n")); err != nil {
			serverErr <- err
			return
		}

		buffer := make([]byte, 4)
		if _, err := io.ReadFull(conn, buffer); err != nil {
			serverErr <- err
			return
		}
		if string(buffer) == "ping" {
			_, err = conn.Write([]byte("pong"))
		}
		serverErr <- err
	}()

	conn, err := dialViaHTTPConnect("http://"+listener.Addr().String(), "smtp.example.test:587", 2*time.Second)
	if err != nil {
		t.Fatalf("CONNECT tunnel must succeed: %v", err)
	}
	defer conn.Close()

	if _, err := conn.Write([]byte("ping")); err != nil {
		t.Fatalf("tunnel write: %v", err)
	}
	buffer := make([]byte, 4)
	if _, err := io.ReadFull(conn, buffer); err != nil {
		t.Fatalf("tunnel read: %v", err)
	}
	if string(buffer) != "pong" {
		t.Fatalf("expected tunneled payload, got %q", string(buffer))
	}
	if err := <-serverErr; err != nil {
		t.Fatalf("proxy server error: %v", err)
	}
}

func TestDialViaHTTPConnectRejectsProxyError(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		if _, err := http.ReadRequest(bufio.NewReader(conn)); err != nil {
			return
		}
		_, _ = conn.Write([]byte("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n"))
	}()

	if _, err := dialViaHTTPConnect("http://"+listener.Addr().String(), "smtp.example.test:587", 2*time.Second); err == nil {
		t.Fatal("proxy rejection must surface as an error")
	} else if !strings.Contains(err.Error(), "403") {
		t.Fatalf("expected 403 in error, got %v", err)
	}
}
