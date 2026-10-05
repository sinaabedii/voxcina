package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// sizingChartPresetMaxPerTemplate caps how many distinct size-chart snapshots
// are retained (and offered back) per sizing type id. Overflow is pruned
// oldest-first after every insert.
const sizingChartPresetMaxPerTemplate = 20

// sizingChartIsUsable reports whether a size chart actually carries content:
// at least one row with a non-empty size AND at least one non-empty value
// across rows. An all-empty chart must never overwrite a good preset.
func sizingChartIsUsable(chart []models.ProductSizeMeasurement) bool {
	hasNamedRow := false
	for _, row := range chart {
		if strings.TrimSpace(row.Size) != "" {
			hasNamedRow = true
			break
		}
	}
	if !hasNamedRow {
		return false
	}
	for _, row := range chart {
		for _, value := range row.Values {
			if strings.TrimSpace(value) != "" {
				return true
			}
		}
	}
	return false
}

// canonicalSizeChartRow is the stable serialization unit for content hashing:
// the size is trimmed and the values map is emitted by encoding/json with its
// keys sorted, so equivalent charts hash identically.
type canonicalSizeChartRow struct {
	Size   string            `json:"size"`
	Values map[string]string `json:"values"`
}

// sizingChartContentHash fingerprints a size chart deterministically: rows
// keep their order, sizes are trimmed, nil/empty value maps normalize to the
// same shape, and each map serializes with sorted keys. Returns sha256 hex.
func sizingChartContentHash(chart []models.ProductSizeMeasurement) string {
	canonical := make([]canonicalSizeChartRow, len(chart))
	for i, row := range chart {
		values := make(map[string]string, len(row.Values))
		for key, value := range row.Values {
			values[key] = value
		}
		canonical[i] = canonicalSizeChartRow{
			Size:   strings.TrimSpace(row.Size),
			Values: values,
		}
	}

	payload, err := json.Marshal(canonical)
	if err != nil {
		// Unreachable for map[string]string, but never invent a hash.
		return ""
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}

// saveSizingChartSnapshot keeps every distinct filled size chart saved against
// a sizing template in sizing_chart_presets, so the admin sizing-types list
// can offer them back when the same template is reused on another product.
// Upsert-by-content: an identical chart only touches updated_at (touch =
// freshest), a new one is inserted, and the per-template overflow is pruned
// to the newest sizingChartPresetMaxPerTemplate documents. Best-effort:
// failures are logged and never fail the product save.
func saveSizingChartSnapshot(ctx context.Context, sizingTypeID *primitive.ObjectID, chart []models.ProductSizeMeasurement) {
	if sizingTypeID == nil || sizingTypeID.IsZero() {
		return
	}
	if !sizingChartIsUsable(chart) {
		return
	}

	contentHash := sizingChartContentHash(chart)
	if contentHash == "" {
		return
	}

	collection := db.Database.Collection(sizingChartPresetsCollection)
	filter := bson.M{"sizing_type_id": *sizingTypeID, "content_hash": contentHash}
	touch := bson.M{"$set": bson.M{"updated_at": time.Now()}}

	result, err := collection.UpdateOne(ctx, filter, touch)
	if err != nil {
		utils.LogAction("SIZING_CHART_PRESET_UPSERT_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", err, sizingTypeID.Hex()))
		return
	}
	if result.MatchedCount > 0 {
		return // existing snapshot refreshed; nothing new to prune
	}

	doc := models.SizingChartPreset{
		ID:           primitive.NewObjectID(),
		SizingTypeID: *sizingTypeID,
		SizeChart:    chart,
		ContentHash:  contentHash,
		UpdatedAt:    time.Now(),
	}
	if _, err := collection.InsertOne(ctx, doc); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			// A concurrent save inserted the same content first; the unique
			// (sizing_type_id, content_hash) index makes the race safe, so
			// fall back to touching the winning document.
			if _, touchErr := collection.UpdateOne(ctx, filter, touch); touchErr != nil {
				utils.LogAction("SIZING_CHART_PRESET_UPSERT_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", touchErr, sizingTypeID.Hex()))
			}
			return
		}
		utils.LogAction("SIZING_CHART_PRESET_UPSERT_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", err, sizingTypeID.Hex()))
		return
	}

	pruneSizingChartSnapshots(ctx, *sizingTypeID)
}

// pruneSizingChartSnapshots deletes everything beyond the newest
// sizingChartPresetMaxPerTemplate snapshots for one sizing type id.
func pruneSizingChartSnapshots(ctx context.Context, sizingTypeID primitive.ObjectID) {
	collection := db.Database.Collection(sizingChartPresetsCollection)
	cursor, err := collection.Find(
		ctx,
		bson.M{"sizing_type_id": sizingTypeID},
		options.Find().
			SetSort(bson.D{
				{Key: "updated_at", Value: -1},
				{Key: "_id", Value: -1},
			}).
			SetSkip(int64(sizingChartPresetMaxPerTemplate)).
			SetProjection(bson.M{"_id": 1}),
	)
	if err != nil {
		utils.LogAction("SIZING_CHART_PRESET_UPSERT_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", err, sizingTypeID.Hex()))
		return
	}

	var stale []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &stale); err != nil {
		cursor.Close(ctx)
		utils.LogAction("SIZING_CHART_PRESET_UPSERT_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", err, sizingTypeID.Hex()))
		return
	}
	cursor.Close(ctx)

	if len(stale) == 0 {
		return
	}

	staleIDs := make([]primitive.ObjectID, 0, len(stale))
	for _, doc := range stale {
		staleIDs = append(staleIDs, doc.ID)
	}
	if _, err := collection.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": staleIDs}}); err != nil {
		utils.LogAction("SIZING_CHART_PRESET_UPSERT_FAILED", fmt.Sprintf("error: %v, sizing_type_id: %s", err, sizingTypeID.Hex()))
	}
}

// SavedSizeChartItem is one distinct size chart previously saved against a
// sizing template, offered back to the admin form.
type SavedSizeChartItem struct {
	SizeChart []models.ProductSizeMeasurement `json:"size_chart"`
	UpdatedAt time.Time                       `json:"updated_at"`
}

// adminSizingTypeListItem wraps the admin sizing type with the template's
// saved size charts. The embedded struct keeps every existing field
// byte-compatible; saved_size_charts is optional and absent when the template
// has no snapshots yet.
type adminSizingTypeListItem struct {
	models.SizingType
	SavedSizeCharts []SavedSizeChartItem `json:"saved_size_charts,omitempty"`
}

// attachSavedSizeCharts batch-loads the sizing chart presets for the given
// admin sizing types and wraps each item with its template's distinct saved
// charts, newest first, capped at sizingChartPresetMaxPerTemplate.
func attachSavedSizeCharts(ctx context.Context, sizingTypes []models.SizingType) ([]adminSizingTypeListItem, error) {
	ids := make([]primitive.ObjectID, 0, len(sizingTypes))
	for _, sizingType := range sizingTypes {
		if !sizingType.ID.IsZero() {
			ids = append(ids, sizingType.ID)
		}
	}

	snapshots := make(map[primitive.ObjectID][]SavedSizeChartItem, len(ids))
	if len(ids) > 0 {
		cursor, err := db.Database.Collection(sizingChartPresetsCollection).Find(
			ctx,
			bson.M{"sizing_type_id": bson.M{"$in": ids}},
			options.Find().SetSort(bson.D{
				{Key: "sizing_type_id", Value: 1},
				{Key: "updated_at", Value: -1},
				{Key: "_id", Value: -1},
			}),
		)
		if err != nil {
			return nil, err
		}

		var presetDocs []models.SizingChartPreset
		if err := cursor.All(ctx, &presetDocs); err != nil {
			cursor.Close(ctx)
			return nil, err
		}
		cursor.Close(ctx)

		for _, preset := range presetDocs {
			if len(snapshots[preset.SizingTypeID]) >= sizingChartPresetMaxPerTemplate {
				continue // defensive: prune is best-effort, cap what we return
			}
			snapshots[preset.SizingTypeID] = append(snapshots[preset.SizingTypeID], SavedSizeChartItem{
				SizeChart: preset.SizeChart,
				UpdatedAt: preset.UpdatedAt,
			})
		}
	}

	items := make([]adminSizingTypeListItem, len(sizingTypes))
	for i, sizingType := range sizingTypes {
		items[i] = adminSizingTypeListItem{SizingType: sizingType}
		if len(snapshots[sizingType.ID]) > 0 {
			items[i].SavedSizeCharts = snapshots[sizingType.ID]
		}
	}
	return items, nil
}
