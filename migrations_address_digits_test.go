package main

import (
	"reflect"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

func TestDigitFilterCoversEveryNormalizedField(t *testing.T) {
	filter := digitFilter("addresses.")
	conditions, ok := filter["$or"].([]bson.M)
	if !ok {
		t.Fatalf("filter is not an $or of conditions: %#v", filter)
	}
	want := map[string]bool{
		"addresses.postal_code": true, "addresses.phone_number": true,
		"addresses.address": true, "addresses.street": true,
	}
	if len(conditions) != len(want) {
		t.Fatalf("got %d conditions, want %d", len(conditions), len(want))
	}
	for _, condition := range conditions {
		for path, match := range condition {
			if !want[path] {
				t.Errorf("unexpected path %q in filter", path)
			}
			if !reflect.DeepEqual(match, bson.M{"$regex": persianDigitPattern}) {
				t.Errorf("path %q: unexpected matcher %#v", path, match)
			}
		}
	}
}

func TestNormalizedFieldsSetsOnlyChangedPaths(t *testing.T) {
	address := bson.M{
		"postal_code":   "۷۵۳۷۸۹۰۷۴۲",
		"phone_number":  "09149257695",    // already ASCII: must not be rewritten
		"address":       "تهران، پلاک ۱۲", // typed suffix carries numbers
		"city":          "تهران ۳",        // not a numeric field: left alone
		"province_code": 1,                // non-string: skipped, not a panic
	}
	got := normalizedFields(address, "addresses.0.")
	want := bson.M{
		"addresses.0.postal_code": "7537890742",
		"addresses.0.address":     "تهران، پلاک 12",
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %#v, want %#v", got, want)
	}
}

func TestNormalizedFieldsIsIdempotent(t *testing.T) {
	address := bson.M{"postal_code": "7537890742", "address": "تهران، پلاک 12"}
	if got := normalizedFields(address, "shipping_address."); len(got) != 0 {
		t.Errorf("clean address produced writes: %#v", got)
	}
}
