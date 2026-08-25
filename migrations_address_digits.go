package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
	"backEnd/utils"
)

// persianDigitPattern matches a single Persian (U+06F0-U+06F9) or Arabic-Indic
// (U+0660-U+0669) digit. Used to select the documents that still need the
// backfill, so a re-run after the first pass scans almost nothing.
const persianDigitPattern = "[۰-۹٠-٩]"

// runAddressDigitMigration rewrites Persian and Arabic-Indic digits to ASCII in
// every stored address: users.addresses[] and the copy each order keeps in
// orders.shipping_address. It is the one-time counterpart to
// models.Address.NormalizeDigits, which holds the same invariant on the write
// path — rows written before that landed stay corrupt until they are re-saved,
// and a Persian-digit postal code is unmatchable by search, unparseable as a
// number and invisible to any validation expecting ^\d{10}$.
//
// Only the fields in models.AddressDigitFields are touched, and only by
// $set-ing the exact paths that change: the surrounding subdocument is never
// decoded and rewritten, so fields this build does not know about survive.
// The migration is idempotent — a second run finds nothing to do.
func runAddressDigitMigration(database *mongo.Database, dryRun bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	users, err := migrateUserAddressDigits(ctx, database, dryRun)
	if err != nil {
		return fmt.Errorf("users: %w", err)
	}
	orders, err := migrateOrderAddressDigits(ctx, database, dryRun)
	if err != nil {
		return fmt.Errorf("orders: %w", err)
	}

	log.Printf(
		"address digits: %d/%d user documents and %d/%d order documents %s",
		users.changed, users.scanned, orders.changed, orders.scanned,
		map[bool]string{true: "would be normalized (dry run)", false: "normalized"}[dryRun],
	)
	return nil
}

type migrationCount struct {
	scanned int
	changed int
}

// digitFilter selects documents where any of the address fields under prefix
// still holds a non-ASCII digit.
func digitFilter(prefix string) bson.M {
	conditions := make([]bson.M, 0, len(models.AddressDigitFields))
	for _, field := range models.AddressDigitFields {
		conditions = append(conditions, bson.M{prefix + field: bson.M{"$regex": persianDigitPattern}})
	}
	return bson.M{"$or": conditions}
}

// normalizedFields returns the $set payload for one address subdocument: the
// fields whose value actually changes, keyed by their full document path.
func normalizedFields(address bson.M, pathPrefix string) bson.M {
	set := bson.M{}
	for _, field := range models.AddressDigitFields {
		value, ok := address[field].(string)
		if !ok {
			continue
		}
		if normalized := utils.NormalizePersianDigits(value); normalized != value {
			set[pathPrefix+field] = normalized
		}
	}
	return set
}

func migrateUserAddressDigits(ctx context.Context, database *mongo.Database, dryRun bool) (migrationCount, error) {
	var count migrationCount
	collection := database.Collection("users")

	cursor, err := collection.Find(ctx, digitFilter("addresses."), options.Find().SetProjection(bson.M{"addresses": 1}))
	if err != nil {
		return count, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var doc struct {
			ID        primitive.ObjectID `bson:"_id"`
			Addresses []bson.M           `bson:"addresses"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return count, err
		}
		count.scanned++

		// Address entries keep their position: the API addresses them by index
		// (PUT /api/users/addresses/{addressIndex}).
		set := bson.M{}
		for i, address := range doc.Addresses {
			for path, value := range normalizedFields(address, fmt.Sprintf("addresses.%d.", i)) {
				set[path] = value
			}
		}
		if len(set) == 0 {
			continue
		}
		count.changed++
		log.Printf("address digits: user %s -> %v", doc.ID.Hex(), set)
		if dryRun {
			continue
		}
		if _, err := collection.UpdateByID(ctx, doc.ID, bson.M{"$set": set}); err != nil {
			return count, err
		}
	}
	return count, cursor.Err()
}

func migrateOrderAddressDigits(ctx context.Context, database *mongo.Database, dryRun bool) (migrationCount, error) {
	var count migrationCount
	collection := database.Collection("orders")

	cursor, err := collection.Find(ctx, digitFilter("shipping_address."), options.Find().SetProjection(bson.M{"shipping_address": 1, "order_number": 1}))
	if err != nil {
		return count, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var doc struct {
			ID              primitive.ObjectID `bson:"_id"`
			OrderNumber     string             `bson:"order_number"`
			ShippingAddress bson.M             `bson:"shipping_address"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return count, err
		}
		count.scanned++

		set := normalizedFields(doc.ShippingAddress, "shipping_address.")
		if len(set) == 0 {
			continue
		}
		count.changed++
		log.Printf("address digits: order %s (%s) -> %v", doc.OrderNumber, doc.ID.Hex(), set)
		if dryRun {
			continue
		}
		if _, err := collection.UpdateByID(ctx, doc.ID, bson.M{"$set": set}); err != nil {
			return count, err
		}
	}
	return count, cursor.Err()
}

// addressDigitMigrationEntryPoint is wired up in main.go to allow running the
// migration as `./main -migrate-address-digits [-dry-run]`. It expects a
// connected *mongo.Database from the caller and returns an exit code so the
// caller can use os.Exit.
func addressDigitMigrationEntryPoint(database *mongo.Database, dryRun bool) int {
	if err := runAddressDigitMigration(database, dryRun); err != nil {
		log.Printf("migration: %v", err)
		return 1
	}
	return 0
}
