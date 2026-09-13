package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"backEnd/services/authjwt"
)

// External service API keys.
//
// A key is "vxk_" + 40 random hex characters. Only its SHA-256 hash is
// persisted; the plaintext is returned to the admin exactly once, at creation
// or rotation. The prefix/last4 are stored in the clear so the admin page can
// identify a key without being able to reconstruct it.

// ExternalServiceKeyPrefix is the fixed, human-recognizable key prefix.
const ExternalServiceKeyPrefix = "vxk_"

// externalServiceKeyEntropy is the number of random bytes hex-encoded into a
// key (40 hex chars).
const externalServiceKeyEntropy = 20

// ExternalServiceKeyParts describes one freshly generated API key.
type ExternalServiceKeyParts struct {
	Plain  string // full key, shown once
	Prefix string // "vxk_" + first 8 random chars, safe to display
	Last4  string // last 4 random chars, safe to display
}

// GenerateExternalServiceKey creates a new random API key.
func GenerateExternalServiceKey() (*ExternalServiceKeyParts, error) {
	raw := make([]byte, externalServiceKeyEntropy)
	if _, err := rand.Read(raw); err != nil {
		return nil, fmt.Errorf("generate service key: %w", err)
	}
	random := hex.EncodeToString(raw)
	return &ExternalServiceKeyParts{
		Plain:  ExternalServiceKeyPrefix + random,
		Prefix: ExternalServiceKeyPrefix + random[:8],
		Last4:  random[len(random)-4:],
	}, nil
}

// HashServiceKey returns the SHA-256 hex digest used as the lookup key for an
// API key. Hashing (not encrypting) means a database leak cannot reveal any
// usable key.
func HashServiceKey(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}

// ValidateExternalServiceKeyFormat reports whether a presented key has the
// expected shape, so an obviously malformed header can be rejected before a DB
// round trip.
func ValidateExternalServiceKeyFormat(plain string) bool {
	if len(plain) != len(ExternalServiceKeyPrefix)+2*externalServiceKeyEntropy {
		return false
	}
	if !strings.HasPrefix(plain, ExternalServiceKeyPrefix) {
		return false
	}
	_, err := hex.DecodeString(strings.TrimPrefix(plain, ExternalServiceKeyPrefix))
	return err == nil
}

// GenerateWebhookSecret creates a random webhook signing secret (32 hex
// chars). It lives only encrypted in the database and inside the outgoing
// HMAC computations — it is never displayed in the admin UI.
func GenerateWebhookSecret() (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate webhook secret: %w", err)
	}
	return hex.EncodeToString(raw), nil
}

// --- Webhook signing --------------------------------------------------------

// SignWebhookPayload returns the value of the X-Signature header for an
// outbound webhook body: "sha256=" + HMAC-SHA256(secret, body) in hex.
func SignWebhookPayload(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// VerifyWebhookSignature recomputes the HMAC of a webhook body with the given
// secret and compares it to a presented X-Signature header value in constant
// time. It accepts the exact "sha256=<hex>" form produced by SignWebhookPayload.
func VerifyWebhookSignature(presented, secret string, body []byte) bool {
	const prefix = "sha256="
	if len(presented) <= len(prefix) {
		return false
	}
	return hmac.Equal([]byte(presented), []byte(SignWebhookPayload(secret, body)))
}

// --- Webhook secret encryption at rest --------------------------------------
//
// The webhook signing secret is stored encrypted (AES-256-GCM) so a read-only
// database leak does not hand out a usable signing key. The encryption key is
// derived from the JWT signing key, which is already a fail-fast startup
// requirement; no additional secret has to be provisioned.

// ErrWebhookCrypto is returned when the configured signing key is unavailable
// or the ciphertext fails integrity checks.
var ErrWebhookCrypto = errors.New("webhook secret encryption unavailable")

func webhookCipher() (cipher.AEAD, error) {
	signingKey, err := authjwt.Key()
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrWebhookCrypto, err)
	}
	// Derive a dedicated 32-byte AES key from the JWT signing key so the two
	// uses never share raw key material.
	aesKey := sha256.Sum256(signingKey)
	block, err := aes.NewCipher(aesKey[:])
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// EncryptWebhookSecret encrypts a webhook signing secret for storage. The
// result is base64(nonce || ciphertext) or "" for an empty input.
func EncryptWebhookSecret(plain string) (string, error) {
	if plain == "" {
		return "", nil
	}
	aead, err := webhookCipher()
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("webhook secret nonce: %w", err)
	}
	sealed := aead.Seal(nonce, nonce, []byte(plain), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// DecryptWebhookSecret reverses EncryptWebhookSecret. Returns "" for an empty
// input and an error for malformed or tampered ciphertext.
func DecryptWebhookSecret(encoded string) (string, error) {
	if encoded == "" {
		return "", nil
	}
	aead, err := webhookCipher()
	if err != nil {
		return "", err
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrWebhookCrypto, err)
	}
	if len(data) < aead.NonceSize() {
		return "", fmt.Errorf("%w: ciphertext too short", ErrWebhookCrypto)
	}
	nonce, ciphertext := data[:aead.NonceSize()], data[aead.NonceSize():]
	plain, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrWebhookCrypto, err)
	}
	return string(plain), nil
}
