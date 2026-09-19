package snappayfeed

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Authentication outcomes, mapped to the same status codes the plugin uses
// (searchwise-api-data-feed.php L46-59): a bad key is 401, an unreachable
// validation server is 503 — never 401, because telling Searchwise "your key
// is wrong" when our upstream call merely timed out would send them chasing a
// credential that is fine.
var (
	errMissingKey           = errors.New("snappayfeed: missing x-api-key")
	errInvalidKey           = errors.New("snappayfeed: invalid x-api-key")
	errValidatorUnreachable = errors.New("snappayfeed: token validation server unreachable")
)

const (
	// validationTimeout matches the plugin's 5s (L79).
	validationTimeout = 5 * time.Second

	// validationTTL caches a successful validation. A full crawl is many
	// paginated POSTs; without this, each page would fan out an extra
	// round-trip to Searchwise and the feed's latency would be theirs.
	validationTTL = 60 * time.Second

	// maxValidationEntries bounds the cache defensively. Only keys that
	// actually validated are ever stored, so this is unreachable in practice.
	maxValidationEntries = 64
)

// validationCache remembers keys Searchwise has accepted. Keys are stored
// hashed so a heap dump never yields a working credential.
var validationCache = struct {
	sync.Mutex
	entries map[string]time.Time
}{entries: make(map[string]time.Time)}

// authorize reproduces the plugin's permission_check.
//
// A static SNAPPAY_FEED_API_KEY short-circuits it, which is what makes the
// endpoint testable before Searchwise provisions anything; otherwise the
// presented key is validated against their server exactly as the plugin does.
func authorize(ctx context.Context, cfg Config, presented string, client *http.Client) error {
	presented = strings.TrimSpace(presented)
	if presented == "" {
		return errMissingKey
	}

	if cfg.APIKey != "" && subtle.ConstantTimeCompare([]byte(presented), []byte(cfg.APIKey)) == 1 {
		return nil
	}

	digest := hashKey(presented)
	if cachedValidation(digest) {
		return nil
	}

	if err := validateUpstream(ctx, cfg, presented, client); err != nil {
		return err
	}

	rememberValidation(digest)
	return nil
}

// validateUpstream posts the credential to Searchwise in the plugin's own
// shape: form-encoded merchant_domain + api_key + plugin_version (L77-85).
func validateUpstream(ctx context.Context, cfg Config, presented string, client *http.Client) error {
	if client == nil {
		client = &http.Client{Timeout: validationTimeout}
	}

	ctx, cancel := context.WithTimeout(ctx, validationTimeout)
	defer cancel()

	form := url.Values{
		"merchant_domain": {cfg.MerchantDomain},
		"api_key":         {presented},
		"plugin_version":  {PluginVersion},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.ValidateURL, strings.NewReader(form.Encode()))
	if err != nil {
		return errValidatorUnreachable
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return errValidatorUnreachable
	}
	defer resp.Body.Close()

	// The plugin decodes the body whatever the status is and only trusts
	// success===true, so a 4xx with a decodable body is an invalid key, not
	// an outage.
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
	if err != nil {
		return errValidatorUnreachable
	}

	var decoded struct {
		Success bool `json:"success"`
	}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return errInvalidKey
	}
	if !decoded.Success {
		return errInvalidKey
	}
	return nil
}

func hashKey(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func cachedValidation(digest string) bool {
	validationCache.Lock()
	defer validationCache.Unlock()
	expiry, ok := validationCache.entries[digest]
	if !ok {
		return false
	}
	if time.Now().After(expiry) {
		delete(validationCache.entries, digest)
		return false
	}
	return true
}

func rememberValidation(digest string) {
	now := time.Now()
	validationCache.Lock()
	defer validationCache.Unlock()
	if len(validationCache.entries) >= maxValidationEntries {
		for key, expiry := range validationCache.entries {
			if now.After(expiry) {
				delete(validationCache.entries, key)
			}
		}
	}
	validationCache.entries[digest] = now.Add(validationTTL)
}
