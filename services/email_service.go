package services

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"mime"
	"net"
	"net/http"
	"net/smtp"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"backEnd/models"
)

const (
	smtpDefaultHost = "smtp.gmail.com"
	smtpDefaultPort = 587
	smtpDialTimeout = 10 * time.Second
	smtpSendTimeout = 25 * time.Second
)

// EmailService sends transactional email through an SMTP relay. It is built
// per call from the process environment, mirroring SMSService, and is a no-op
// until SMTP_USERNAME/SMTP_PASSWORD are configured.
//
// The VPS reaches the internet through the host's Xray proxy (Compose injects
// HTTPS_PROXY), so SMTP is dialed through an HTTP CONNECT tunnel whenever a
// proxy is configured; an empty proxy falls back to a direct connection for
// local development. Port 465 uses implicit TLS, any other port uses STARTTLS.
type EmailService struct {
	host     string
	port     int
	username string
	password string
	from     string
	fromName string
	proxyURL string
}

func NewEmailService() *EmailService {
	host := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	if host == "" {
		host = smtpDefaultHost
	}

	port := smtpDefaultPort
	if raw := strings.TrimSpace(os.Getenv("SMTP_PORT")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 65535 {
			port = parsed
		}
	}

	username := strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	from := strings.TrimSpace(os.Getenv("MAIL_FROM"))
	if from == "" {
		from = username
	}
	fromName := strings.TrimSpace(os.Getenv("MAIL_FROM_NAME"))
	if fromName == "" {
		fromName = "وکسینا"
	}

	proxyURL := strings.TrimSpace(os.Getenv("SMTP_PROXY"))
	if proxyURL == "" {
		proxyURL = strings.TrimSpace(os.Getenv("HTTPS_PROXY"))
	}
	if proxyURL == "" {
		proxyURL = strings.TrimSpace(os.Getenv("HTTP_PROXY"))
	}

	return &EmailService{
		host:     host,
		port:     port,
		username: username,
		password: os.Getenv("SMTP_PASSWORD"),
		from:     from,
		fromName: fromName,
		proxyURL: proxyURL,
	}
}

// IsConfigured reports whether enough credentials are present to attempt a
// send. Handlers use it to skip the send entirely instead of logging failures
// when the feature has not been configured on a given environment.
func (s *EmailService) IsConfigured() bool {
	return s != nil && s.host != "" && s.username != "" && s.password != "" && s.from != ""
}

// SendCareerConfirmation emails the applicant a receipt for a stored careers
// submission. Job applications and partnership requests get different copy.
func (s *EmailService) SendCareerConfirmation(submission models.CareerSubmission) error {
	if !s.IsConfigured() {
		return errors.New("email service is not configured")
	}
	to := strings.TrimSpace(submission.Email)
	if to == "" {
		return errors.New("career submission has no recipient email")
	}

	subject, textBody, htmlBody := careerConfirmationContent(submission)
	return s.send(to, subject, textBody, htmlBody)
}

// SendTestEmail delivers a one-off message so an operator can validate the
// SMTP configuration from the deployed container (`./main -test-email`).
func (s *EmailService) SendTestEmail(to string) error {
	if !s.IsConfigured() {
		return errors.New("email service is not configured: set SMTP_USERNAME and SMTP_PASSWORD")
	}
	to = strings.TrimSpace(to)
	if to == "" {
		return errors.New("test email recipient is required")
	}

	subject := "تست ارسال ایمیل وکسینا"
	textBody := "این پیام آزمایشی است و پیکربندی SMTP وکسینا به‌درستی کار می‌کند. لطفاً به آن توجه نکنید."
	htmlBody := `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:2;">` +
		`<p>این پیام آزمایشی است و پیکربندی SMTP وکسینا به‌درستی کار می‌کند. لطفاً به آن توجه نکنید.</p>` +
		`</div>`
	return s.send(to, subject, textBody, htmlBody)
}

func (s *EmailService) send(to, subject, textBody, htmlBody string) error {
	message := s.buildMessage(to, subject, textBody, htmlBody)
	addr := net.JoinHostPort(s.host, strconv.Itoa(s.port))

	conn, err := s.dial(addr)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(smtpSendTimeout))

	var client *smtp.Client
	if s.port == 465 {
		tlsConn := tls.Client(conn, &tls.Config{ServerName: s.host, MinVersion: tls.VersionTLS12})
		if err := tlsConn.Handshake(); err != nil {
			return fmt.Errorf("smtp tls handshake: %w", err)
		}
		client, err = smtp.NewClient(tlsConn, s.host)
	} else {
		client, err = smtp.NewClient(conn, s.host)
	}
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	// Credentials may only travel over a TLS session; Gmail rejects plaintext
	// AUTH, and smtp.PlainAuth itself refuses non-TLS connections.
	if s.port != 465 {
		tlsConfig := &tls.Config{ServerName: s.host, MinVersion: tls.VersionTLS12}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("smtp starttls: %w", err)
		}
	}

	if err := client.Auth(smtp.PlainAuth("", s.username, s.password, s.host)); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}
	if err := client.Mail(s.from); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt to: %w", err)
	}

	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("smtp finish: %w", err)
	}
	return client.Quit()
}

func (s *EmailService) dial(addr string) (net.Conn, error) {
	if s.proxyURL == "" {
		return net.DialTimeout("tcp", addr, smtpDialTimeout)
	}
	return dialViaHTTPConnect(s.proxyURL, addr, smtpDialTimeout)
}

// dialViaHTTPConnect opens a raw TCP tunnel to addr through an HTTP proxy
// using CONNECT. This is what allows SMTP (not an HTTP protocol) to use the
// same host proxy that carries the rest of the backend's outbound traffic.
func dialViaHTTPConnect(proxyURL, addr string, timeout time.Duration) (net.Conn, error) {
	parsed, err := url.Parse(proxyURL)
	if err != nil {
		return nil, fmt.Errorf("invalid smtp proxy url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported smtp proxy scheme %q", parsed.Scheme)
	}
	if parsed.Host == "" {
		return nil, errors.New("invalid smtp proxy url: empty host")
	}

	conn, err := net.DialTimeout("tcp", parsed.Host, timeout)
	if err != nil {
		return nil, fmt.Errorf("smtp proxy dial: %w", err)
	}
	_ = conn.SetDeadline(time.Now().Add(timeout))

	req := &http.Request{
		Method: http.MethodConnect,
		URL:    &url.URL{Opaque: addr},
		Host:   addr,
		Header: make(http.Header),
	}
	req.Header.Set("Proxy-Connection", "Keep-Alive")
	if parsed.User != nil {
		password, _ := parsed.User.Password()
		credentials := base64.StdEncoding.EncodeToString([]byte(parsed.User.Username() + ":" + password))
		req.Header.Set("Proxy-Authorization", "Basic "+credentials)
	}
	if err := req.Write(conn); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("smtp proxy request: %w", err)
	}

	reader := bufio.NewReader(conn)
	resp, err := http.ReadResponse(reader, req)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("smtp proxy response: %w", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_ = conn.Close()
		return nil, fmt.Errorf("smtp proxy CONNECT %s: %s", addr, resp.Status)
	}
	if reader.Buffered() > 0 {
		_ = conn.Close()
		return nil, errors.New("smtp proxy returned unexpected data after CONNECT")
	}

	_ = conn.SetDeadline(time.Time{})
	return conn, nil
}

func (s *EmailService) buildMessage(to, subject, textBody, htmlBody string) []byte {
	var buf bytes.Buffer
	boundary := "voxcina-" + randomHex(16)

	writeHeader := func(key, value string) {
		fmt.Fprintf(&buf, "%s: %s\r\n", key, value)
	}
	writeHeader("From", formatMailAddress(s.fromName, s.from))
	writeHeader("To", to)
	writeHeader("Reply-To", s.from)
	writeHeader("Subject", mime.QEncoding.Encode("UTF-8", subject))
	writeHeader("Date", time.Now().Format(time.RFC1123Z))
	writeHeader("Message-ID", fmt.Sprintf("<%s@%s>", randomHex(16), mailDomain(s.from)))
	writeHeader("MIME-Version", "1.0")
	writeHeader("Auto-Submitted", "auto-replied")
	writeHeader("Content-Type", fmt.Sprintf("multipart/alternative; boundary=%q", boundary))
	buf.WriteString("\r\n")

	writePart := func(contentType, content string) {
		fmt.Fprintf(&buf, "--%s\r\n", boundary)
		fmt.Fprintf(&buf, "Content-Type: %s; charset=UTF-8\r\n", contentType)
		buf.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		writeBase64(&buf, content)
	}
	writePart("text/plain", textBody)
	writePart("text/html", htmlBody)
	fmt.Fprintf(&buf, "--%s--\r\n", boundary)

	return buf.Bytes()
}

func writeBase64(buf *bytes.Buffer, content string) {
	encoded := base64.StdEncoding.EncodeToString([]byte(content))
	for len(encoded) > 76 {
		buf.WriteString(encoded[:76])
		buf.WriteString("\r\n")
		encoded = encoded[76:]
	}
	if encoded != "" {
		buf.WriteString(encoded)
		buf.WriteString("\r\n")
	}
}

func formatMailAddress(name, address string) string {
	if strings.TrimSpace(name) == "" {
		return address
	}
	return mime.QEncoding.Encode("UTF-8", name) + " <" + address + ">"
}

func mailDomain(address string) string {
	if idx := strings.LastIndex(address, "@"); idx >= 0 && idx+1 < len(address) {
		return address[idx+1:]
	}
	return "voxcina.com"
}

func randomHex(byteLen int) string {
	raw := make([]byte, byteLen)
	if _, err := rand.Read(raw); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(raw)
}

// careerConfirmationContent renders the applicant receipt for both careers
// forms. All interpolated values are escaped for the HTML part; the plain-text
// part stays readable on its own.
func careerConfirmationContent(submission models.CareerSubmission) (subject, textBody, htmlBody string) {
	fullName := strings.TrimSpace(submission.FullName)
	if fullName == "" {
		fullName = "کاربر گرامی"
	}
	code := strings.TrimSpace(submission.ReferenceCode)

	var introLine, nextStep string
	if submission.Type == models.CareerSubmissionTypePartnership {
		company := strings.TrimSpace(submission.CompanyName)
		subject = fmt.Sprintf("ثبت درخواست همکاری تجاری — کد رهگیری %s", code)
		introLine = fmt.Sprintf("درخواست همکاری تجاری شما از طرف «%s» با موفقیت ثبت شد.", company)
		if businessType := strings.TrimSpace(submission.BusinessType); businessType != "" {
			introLine = fmt.Sprintf("درخواست همکاری تجاری شما از طرف «%s» در حوزه %s با موفقیت ثبت شد.", company, businessType)
		}
		nextStep = "تیم همکاری‌های تجاری وکسینا درخواست شما را بررسی می‌کند و در اولین فرصت با شما تماس خواهد گرفت."
	} else {
		position := strings.TrimSpace(submission.Position)
		subject = fmt.Sprintf("ثبت درخواست همکاری «%s» — کد رهگیری %s", position, code)
		introLine = fmt.Sprintf("درخواست همکاری شما برای موقعیت «%s» با موفقیت ثبت شد.", position)
		nextStep = "کارشناسان وکسینا رزومه شما را بررسی می‌کنند و در صورت تطابق، از طریق ایمیل یا تلفن با شما تماس خواهند گرفت."
	}

	textBody = fmt.Sprintf(
		"%s عزیز،\n\n%s\n\nکد رهگیری درخواست شما: %s\n\n%s\n\nاین ایمیل به‌صورت خودکار ارسال شده است؛ در صورت نیاز می‌توانید به همین ایمیل پاسخ دهید.\n\nبا احترام،\nتیم وکسینا\ninfo@voxcina.com",
		fullName, introLine, code, nextStep,
	)

	htmlBody = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:Tahoma,'Segoe UI',Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #EAE5DD;">
<tr><td style="background:#1A3C69;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">وکسینا</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:2;">
<p style="margin:0 0 16px;">` + html.EscapeString(fullName) + ` عزیز،</p>
<p style="margin:0 0 16px;">` + html.EscapeString(introLine) + `</p>
<p style="margin:0 0 8px;">کد رهگیری درخواست شما:</p>
<p style="margin:0 0 20px;"><span style="display:inline-block;background:#F4F1EC;border:1px dashed #C8BAA3;border-radius:8px;padding:10px 18px;font-size:18px;font-weight:bold;letter-spacing:1px;color:#1A3C69;direction:ltr;">` + html.EscapeString(code) + `</span></p>
<p style="margin:0 0 16px;">` + html.EscapeString(nextStep) + `</p>
<p style="margin:24px 0 0;color:#6b7280;font-size:13px;">این ایمیل به‌صورت خودکار ارسال شده است؛ در صورت نیاز می‌توانید به همین ایمیل پاسخ دهید.</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#FCFAF8;border-top:1px solid #EAE5DD;color:#6b7280;font-size:12px;">
وکسینا — <a href="https://voxcina.com" style="color:#1A3C69;text-decoration:none;direction:ltr;">voxcina.com</a> — <a href="mailto:info@voxcina.com" style="color:#1A3C69;text-decoration:none;direction:ltr;">info@voxcina.com</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

	return subject, textBody, htmlBody
}
