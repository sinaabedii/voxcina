package services

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// Audience rules → user ids, resolved at send time.
//
// Every rule is a MongoDB query over data that already exists (orders, carts,
// negotiated_coupons, wishlist, users); a rule the schema cannot express is a
// validation error, never a silent "everyone". Resolving returns DISTINCT
// user ids, which the fan-out then writes one inbox row per.

// segmentDays extracts an integer day-count from a segment rule entry; a
// missing or non-positive value defaults to 30.
func segmentDays(v interface{}) int {
	switch n := v.(type) {
	case int:
		if n > 0 {
			return n
		}
	case int32:
		if n > 0 {
			return int(n)
		}
	case int64:
		if n > 0 {
			return int(n)
		}
	case float64:
		if n > 0 {
			return int(n)
		}
	}
	return 30
}

// segmentObjectID extracts an ObjectID hex from a rule entry.
func segmentObjectID(v interface{}) (primitive.ObjectID, bool) {
	if s, ok := v.(string); ok {
		if oid, err := primitive.ObjectIDFromHex(s); err == nil {
			return oid, true
		}
	}
	return primitive.NilObjectID, false
}

// segmentString extracts a plain string from a rule entry.
func segmentString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

var segmentRegexpEscaper = regexp.MustCompile(`[\.+*?()|[\]{}^$]`)

// escapeRegexp escapes the regexp metacharacters of a plain-text filter value.
func escapeRegexp(s string) string {
	return segmentRegexpEscaper.ReplaceAllString(s, `\$0`)
}

// activeUserFilter is the common tail of every segment: soft-deleted users are
// never notified.
var activeUserFilter = bson.M{"is_active": bson.M{"$ne": false}}

// distinctUserIDs collects distinct user ids from one collection query.
func distinctUserIDs(ctx context.Context, database *mongo.Database, collection string, filter bson.M) []primitive.ObjectID {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	raw, err := database.Collection(collection).Distinct(ctx, "_id", filter)
	if err != nil {
		log.Printf("segment: distinct on %s failed: %v", collection, err)
		return nil
	}
	ids := make([]primitive.ObjectID, 0, len(raw))
	for _, id := range raw {
		if oid, ok := id.(primitive.ObjectID); ok {
			ids = append(ids, oid)
		}
	}
	return ids
}

// ResolveSegment returns the user ids matching one audience rule.
func ResolveSegment(ctx context.Context, database *mongo.Database, segment map[string]interface{}) ([]primitive.ObjectID, error) {
	if database == nil {
		return nil, fmt.Errorf("segment: no database")
	}
	filter, err := BuildSegmentFilter(ctx, database, segment)
	if err != nil {
		return nil, err
	}
	ids := distinctUserIDs(ctx, database, "users", filter)
	return ids, nil
}

// CountSegment resolves a rule and returns how many users it matches — the
// audience preview the admin sees BEFORE sending (a mistake fanned out to
// everyone writes a row each and cannot be recalled).
func CountSegment(ctx context.Context, database *mongo.Database, segment map[string]interface{}) (int, error) {
	ids, err := ResolveSegment(ctx, database, segment)
	if err != nil {
		return 0, err
	}
	return len(ids), nil
}

// BuildSegmentFilter translates one audience rule into a users-collection
// query. Rules combine with $and (all must match). An empty rule selects
// nothing — "all" is a distinct audience kind, not an empty segment.
func BuildSegmentFilter(ctx context.Context, database *mongo.Database, segment map[string]interface{}) (bson.M, error) {
	if len(segment) == 0 {
		return nil, fmt.Errorf("segment: empty rule")
	}
	ands := []bson.M{}
	for field, value := range segment {
		switch field {
		case models.SegmentFieldBoughtWithinDays:
			since := time.Now().AddDate(0, 0, -segmentDays(value))
			ands = append(ands, bson.M{"_id": bson.M{"$in": distinctUserIDs(ctx, database, "orders",
				bson.M{"created_at": bson.M{"$gte": since}, "user_id": bson.M{"$ne": primitive.NilObjectID}})}})
		case models.SegmentFieldNeverBought:
			ands = append(ands, bson.M{"_id": bson.M{"$nin": distinctUserIDs(ctx, database, "orders",
				bson.M{"user_id": bson.M{"$ne": primitive.NilObjectID}})}})
		case models.SegmentFieldHasAbandonedCart:
			ands = append(ands, bson.M{"_id": bson.M{"$in": distinctUserIDs(ctx, database, "carts",
				bson.M{"is_active": true, "items.0": bson.M{"$exists": true}})}})
		case models.SegmentFieldOwnsUnusedVoucher:
			ands = append(ands, bson.M{"_id": bson.M{"$in": distinctUserIDs(ctx, database, "negotiated_coupons",
				bson.M{"used": false, "valid_until": bson.M{"$gt": time.Now()}})}})
		case models.SegmentFieldFavouritedProduct:
			oid, ok := segmentObjectID(value)
			if !ok {
				return nil, fmt.Errorf("segment: %s needs a product id hex", field)
			}
			wishlistUsers := distinctUserIDs(ctx, database, "wishlist", bson.M{"product_id": oid})
			ands = append(ands, bson.M{"_id": bson.M{"$in": wishlistUsers}})
		case models.SegmentFieldCity:
			city := segmentString(value)
			if city == "" {
				return nil, fmt.Errorf("segment: %s needs a city name", field)
			}
			ands = append(ands, bson.M{"addresses.city": bson.M{"$regex": escapeRegexp(city), "$options": "i"}})
		case models.SegmentFieldProvince:
			province := segmentString(value)
			if province == "" {
				return nil, fmt.Errorf("segment: %s needs a province name", field)
			}
			ands = append(ands, bson.M{"addresses.province": bson.M{"$regex": escapeRegexp(province), "$options": "i"}})
		case models.SegmentFieldLastOpenWithinDays:
			since := time.Now().AddDate(0, 0, -segmentDays(value))
			ands = append(ands, bson.M{"last_app_open": bson.M{"$gte": since}})
		default:
			return nil, fmt.Errorf("segment: unsupported field %q", field)
		}
	}
	filter := activeUserFilter
	if len(ands) > 0 {
		filter["$and"] = ands
	}
	return filter, nil
}

// ValidateSegment reports whether every field of the rule is supported.
// Called without a database for pure syntax validation.
func ValidateSegment(segment map[string]interface{}) error {
	for field, value := range segment {
		if !models.ValidSegmentField(field) {
			return fmt.Errorf("segment: unsupported field %q", field)
		}
		switch field {
		case models.SegmentFieldBoughtWithinDays, models.SegmentFieldLastOpenWithinDays:
			if segmentDays(value) <= 0 {
				return fmt.Errorf("segment: %s needs a positive day count", field)
			}
		case models.SegmentFieldFavouritedProduct:
			if _, ok := segmentObjectID(value); !ok {
				return fmt.Errorf("segment: %s needs a product id hex", field)
			}
		case models.SegmentFieldCity, models.SegmentFieldProvince:
			if segmentString(value) == "" {
				return fmt.Errorf("segment: %s needs a value", field)
			}
		}
	}
	if len(segment) == 0 {
		return fmt.Errorf("segment: empty rule")
	}
	return nil
}
