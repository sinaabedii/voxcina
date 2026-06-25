package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// avatarSlugMap maps category slugs (or slug fragments) to base avatar file
// names that live in uploads/avatars/categories/. The migration matches the
// first fragment that is contained in the category's slug or name, so partial
// matches work. Anything that does not match is left untouched and can be
// assigned manually in the admin panel.
//
// Order matters: more specific fragments must come first so that e.g.
// "short-sleeve" wins over "shirt".
var avatarSlugMap = []struct {
	match string
	file  string
}{
	{"long-sleeve", "long-sleeved-shirt"},
	{"short-sleeve", "short-sleeved-shirt"},
	{"long_sleeve", "long-sleeved-shirt"},
	{"short_sleeve", "short-sleeved-shirt"},
	{"men", "men"},
	{"women", "women"},
	{"shirt", "shirt"},
	{"پیراهن", "shirt"},
	{"مردانه", "men"},
	{"زنانه", "women"},
}

// runAvatarMigration backfills the `avatar` field for any category that
// does not have one set. Existing non-empty values are preserved.
//
// Matching strategy (first match wins):
//  1. If the category slug contains a known fragment, use that avatar
//     (preferring the blue variant, falling back to white).
//  2. Otherwise leave the avatar field empty so the admin can pick one.
func runAvatarMigration(database *mongo.Database) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	coll := database.Collection("categories")

	cursor, err := coll.Find(ctx, bson.M{
		"$or": []bson.M{
			{"avatar": bson.M{"$exists": false}},
			{"avatar": ""},
			{"avatar": nil},
		},
	})
	if err != nil {
		return fmt.Errorf("find categories: %w", err)
	}
	defer cursor.Close(ctx)

	var updated, skipped int
	for cursor.Next(ctx) {
		var cat struct {
			ID   primitive.ObjectID `bson:"_id"`
			Name string             `bson:"name"`
			Slug string             `bson:"slug"`
		}
		if err := cursor.Decode(&cat); err != nil {
			log.Printf("migration: decode error: %v", err)
			skipped++
			continue
		}

		file, ok := pickAvatarFile(cat.Slug, cat.Name)
		if !ok {
			log.Printf("migration: no match for category %q (slug=%q) — leaving empty for manual assignment", cat.Name, cat.Slug)
			skipped++
			continue
		}

		avatarPath := "/uploads/avatars/categories/" + file
		if _, err := coll.UpdateOne(ctx,
			bson.M{"_id": cat.ID},
			bson.M{"$set": bson.M{"avatar": avatarPath, "updated_at": time.Now()}},
		); err != nil {
			log.Printf("migration: update %s failed: %v", cat.ID.Hex(), err)
			skipped++
			continue
		}
		log.Printf("migration: %s -> %s", cat.Name, avatarPath)
		updated++
	}
	if err := cursor.Err(); err != nil {
		return fmt.Errorf("cursor: %w", err)
	}

	log.Printf("migration: done — %d categories assigned an avatar, %d left for manual assignment", updated, skipped)
	return nil
}

func pickAvatarFile(slug, name string) (string, bool) {
	slugNorm := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(slug, "_", "-"), "  ", " "))
	nameNorm := strings.ToLower(name)
	needle := slugNorm + " " + nameNorm
	for _, m := range avatarSlugMap {
		if strings.Contains(needle, m.match) {
			blue := m.file + ".svg"
			if fileExists(blue) {
				return blue, true
			}
			white := m.file + "-white.svg"
			if fileExists(white) {
				return white, true
			}
		}
	}
	return "", false
}

func fileExists(name string) bool {
	_, err := os.Stat(filepath.Join("./uploads/avatars/categories", name))
	return err == nil
}

// avatarMigrationEntryPoint is wired up in main.go to allow running the
// migration as `./main -migrate-avatars`. It expects a connected
// *mongo.Database from the caller and returns an exit code so the caller
// can use os.Exit.
func avatarMigrationEntryPoint(database *mongo.Database) int {
	if err := runAvatarMigration(database); err != nil {
		log.Printf("migration: %v", err)
		return 1
	}
	return 0
}
