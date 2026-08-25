package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
)

// Which OpenRouter model the chatbots talk to, and which one draws the virtual
// try-on images, are operational dials an admin turns from the dashboard — so
// they live in MongoDB rather than in the environment or a config file, and
// changing one must not need a redeploy.
//
// Both fields are overrides, never the source of truth for a default: an empty
// value means "keep doing what the code already does", so the built-in
// defaults, OPENROUTER_MODEL, and the seller agent's config/ai_prompts.json
// model all stay in force until an admin actually types a model name.

const (
	aiSettingsCollection = "app_settings"
	aiSettingsDocID      = "ai_models"

	// Chat calls read these on every turn, so the document is cached. The
	// window is short because an admin who just changed a model expects the
	// next message to use it, and a stale read is only ever one model behind.
	aiSettingsCacheTTL = 30 * time.Second
)

// AISettings holds the admin-managed model overrides.
type AISettings struct {
	// ChatModel drives every chatbot: the customer support agent and the
	// try-on room's seller agent.
	ChatModel string `bson:"chat_model"        json:"chatModel"`
	// TryOnImageModel is used only to generate virtual try-on images, never
	// for chat.
	TryOnImageModel string    `bson:"tryon_image_model" json:"tryOnImageModel"`
	UpdatedAt       time.Time `bson:"updated_at,omitempty" json:"updatedAt,omitempty"`
}

var (
	aiSettingsMu     sync.RWMutex
	aiSettingsCache  AISettings
	aiSettingsLoaded time.Time
)

// modelNamePattern matches the owner/model form OpenRouter uses, with the
// optional variant suffix (":free", ":nitro", ":thinking").
var modelNamePattern = regexp.MustCompile(`^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+(:[A-Za-z0-9._-]+)?$`)

// ValidateModelName rejects anything that is not an OpenRouter model id. An
// empty name is valid and clears the override. Catching a typo here matters:
// an unroutable model name would otherwise fail on every customer's next
// message, with nothing in the admin UI to explain why.
func ValidateModelName(name string) error {
	if name == "" {
		return nil
	}
	if !modelNamePattern.MatchString(name) {
		return fmt.Errorf("نام مدل باید به شکل owner/model باشد، مثلاً google/gemini-3.7-flash")
	}
	return nil
}

// CurrentAISettings returns the admin overrides, cached. A settings read must
// never be what takes a chatbot down, so a database failure falls back to the
// last known values (empty on a cold start), which the call sites read as
// "use the built-in default".
func CurrentAISettings(ctx context.Context) AISettings {
	aiSettingsMu.RLock()
	if time.Since(aiSettingsLoaded) < aiSettingsCacheTTL {
		cached := aiSettingsCache
		aiSettingsMu.RUnlock()
		return cached
	}
	aiSettingsMu.RUnlock()

	settings, err := loadAISettings(ctx)
	if err != nil {
		aiSettingsMu.RLock()
		defer aiSettingsMu.RUnlock()
		return aiSettingsCache
	}

	cacheAISettings(settings)
	return settings
}

func loadAISettings(ctx context.Context) (AISettings, error) {
	if db.Database == nil {
		return AISettings{}, errors.New("database is not initialised")
	}

	// This lookup sits in the request path of every chat turn, so it gets a hard
	// ceiling rather than inheriting a caller deadline that may not exist.
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var settings AISettings
	err := db.Database.Collection(aiSettingsCollection).
		FindOne(ctx, bson.M{"_id": aiSettingsDocID}).
		Decode(&settings)
	if errors.Is(err, mongo.ErrNoDocuments) {
		// Nothing saved yet: every model keeps its built-in default.
		return AISettings{}, nil
	}
	if err != nil {
		return AISettings{}, err
	}
	return settings, nil
}

func cacheAISettings(settings AISettings) {
	aiSettingsMu.Lock()
	aiSettingsCache = settings
	aiSettingsLoaded = time.Now()
	aiSettingsMu.Unlock()
}

// SaveAISettings validates and stores the overrides, then refreshes the cache
// so the change takes effect on the next chat turn rather than after the TTL.
func SaveAISettings(ctx context.Context, settings AISettings) (AISettings, error) {
	settings.ChatModel = strings.TrimSpace(settings.ChatModel)
	settings.TryOnImageModel = strings.TrimSpace(settings.TryOnImageModel)

	if err := ValidateModelName(settings.ChatModel); err != nil {
		return AISettings{}, err
	}
	if err := ValidateModelName(settings.TryOnImageModel); err != nil {
		return AISettings{}, err
	}
	if db.Database == nil {
		return AISettings{}, errors.New("database is not initialised")
	}

	settings.UpdatedAt = time.Now()
	_, err := db.Database.Collection(aiSettingsCollection).UpdateOne(
		ctx,
		bson.M{"_id": aiSettingsDocID},
		bson.M{"$set": bson.M{
			"chat_model":        settings.ChatModel,
			"tryon_image_model": settings.TryOnImageModel,
			"updated_at":        settings.UpdatedAt,
		}},
		options.Update().SetUpsert(true),
	)
	if err != nil {
		return AISettings{}, err
	}

	cacheAISettings(settings)
	return settings, nil
}

// ResolveModel picks the admin's override when one is set and the caller's own
// default otherwise. Every model call site goes through this, so "an empty
// setting keeps the existing default" is decided in exactly one place.
func ResolveModel(override, fallback string) string {
	if trimmed := strings.TrimSpace(override); trimmed != "" {
		return trimmed
	}
	return fallback
}

// ChatModelOverride is the admin-chosen model for every chatbot, or "" when the
// admin has not set one.
func ChatModelOverride(ctx context.Context) string {
	return CurrentAISettings(ctx).ChatModel
}

// TryOnImageModelOverride is the admin-chosen virtual try-on image model, or ""
// when the admin has not set one.
func TryOnImageModelOverride(ctx context.Context) string {
	return CurrentAISettings(ctx).TryOnImageModel
}
