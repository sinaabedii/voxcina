package utils

import (
	"encoding/hex"
	"strings"
	"testing"

	"backEnd/services/authjwt"
)

// webhookTestJWTSecret is a fixed, strong-enough secret so InitJWT is
// idempotent across repeated calls in the same test process.
const webhookTestJWTSecret = "webhook-crypto-test-secret-0123456789abcdef"

func TestGenerateExternalServiceKeyShape(t *testing.T) {
	key, err := GenerateExternalServiceKey()
	if err != nil {
		t.Fatalf("GenerateExternalServiceKey: %v", err)
	}
	if !strings.HasPrefix(key.Plain, ExternalServiceKeyPrefix) {
		t.Errorf("key %q missing prefix %q", key.Plain, ExternalServiceKeyPrefix)
	}
	body := strings.TrimPrefix(key.Plain, ExternalServiceKeyPrefix)
	if len(body) != 40 {
		t.Errorf("key body length = %d, want 40", len(body))
	}
	if _, err := hex.DecodeString(body); err != nil {
		t.Errorf("key body is not hex: %v", err)
	}
	if !strings.HasPrefix(key.Prefix, ExternalServiceKeyPrefix) || len(key.Prefix) != len(ExternalServiceKeyPrefix)+8 {
		t.Errorf("prefix %q unexpected", key.Prefix)
	}
	if !strings.HasPrefix(key.Plain, key.Prefix) {
		t.Errorf("prefix %q is not a prefix of %q", key.Prefix, key.Plain)
	}
	if !strings.HasSuffix(key.Plain, key.Last4) {
		t.Errorf("last4 %q is not a suffix of %q", key.Last4, key.Plain)
	}
	if key.Prefix == key.Plain {
		t.Errorf("prefix must not leak the whole key")
	}
}

func TestGenerateExternalServiceKeyUnique(t *testing.T) {
	seen := map[string]struct{}{}
	for i := 0; i < 50; i++ {
		key, err := GenerateExternalServiceKey()
		if err != nil {
			t.Fatalf("GenerateExternalServiceKey: %v", err)
		}
		if _, dup := seen[key.Plain]; dup {
			t.Fatalf("duplicate key generated")
		}
		seen[key.Plain] = struct{}{}
	}
}

func TestHashServiceKey(t *testing.T) {
	key, _ := GenerateExternalServiceKey()
	if HashServiceKey(key.Plain) != HashServiceKey(key.Plain) {
		t.Errorf("hash must be deterministic")
	}
	if HashServiceKey(key.Plain) == HashServiceKey(key.Plain+"x") {
		t.Errorf("hash must be sensitive to input")
	}
	if len(HashServiceKey(key.Plain)) != 64 {
		t.Errorf("sha256 hex digest must be 64 chars")
	}
	if strings.Contains(HashServiceKey(key.Plain), key.Plain) {
		t.Errorf("hash must not embed the plaintext key")
	}
}

func TestValidateExternalServiceKeyFormat(t *testing.T) {
	key, _ := GenerateExternalServiceKey()
	if !ValidateExternalServiceKeyFormat(key.Plain) {
		t.Errorf("valid key rejected")
	}
	for _, bad := range []string{"", "not-a-key", key.Plain + "0", key.Prefix, "VXK_" + strings.TrimPrefix(key.Plain, ExternalServiceKeyPrefix)} {
		if ValidateExternalServiceKeyFormat(bad) {
			t.Errorf("bad key %q accepted", bad)
		}
	}
}

func TestWebhookSignatureRoundTrip(t *testing.T) {
	secret := "webhook-secret"
	body := []byte(`{"type":"payment.paid"}`)
	sig := SignWebhookPayload(secret, body)
	if !strings.HasPrefix(sig, "sha256=") {
		t.Fatalf("signature %q missing sha256= prefix", sig)
	}
	if !VerifyWebhookSignature(sig, secret, body) {
		t.Errorf("signature must verify")
	}
	if VerifyWebhookSignature(sig, "wrong-secret", body) {
		t.Errorf("signature must fail with wrong secret")
	}
	if VerifyWebhookSignature(sig, secret, append(body, ' ')) {
		t.Errorf("signature must fail on modified body")
	}
	if VerifyWebhookSignature("", secret, body) {
		t.Errorf("empty signature must fail")
	}
}

func TestWebhookSecretEncryptionRoundTrip(t *testing.T) {
	if err := authjwt.InitJWT(webhookTestJWTSecret); err != nil {
		t.Fatalf("init jwt key: %v", err)
	}
	secret := "hmac-signing-secret"
	enc, err := EncryptWebhookSecret(secret)
	if err != nil {
		t.Fatalf("EncryptWebhookSecret: %v", err)
	}
	if enc == "" || enc == secret {
		t.Fatalf("ciphertext must be non-empty and not the plaintext")
	}
	dec, err := DecryptWebhookSecret(enc)
	if err != nil {
		t.Fatalf("DecryptWebhookSecret: %v", err)
	}
	if dec != secret {
		t.Errorf("round trip = %q, want %q", dec, secret)
	}

	if enc2, err := EncryptWebhookSecret(""); err != nil || enc2 != "" {
		t.Errorf("empty secret should encrypt to empty, got %q err %v", enc2, err)
	}
	if dec2, err := DecryptWebhookSecret(""); err != nil || dec2 != "" {
		t.Errorf("empty ciphertext should decrypt to empty, got %q err %v", dec2, err)
	}

	// Tampered ciphertext must fail.
	bad := enc[:len(enc)-2] + "AA"
	if _, err := DecryptWebhookSecret(bad); err == nil {
		t.Errorf("tampered ciphertext must not decrypt")
	}
}
