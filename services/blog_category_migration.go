package services

import (
	"context"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

func migrateSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")
	return slug
}

// MigrateExistingCategories creates BlogCategory documents from existing blog_posts category strings.
// It only runs if the blog_categories collection is empty.
func MigrateExistingCategories(database *mongo.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	categoryColl := database.Collection("blog_categories")
	postsColl := database.Collection("blog_posts")

	// Check if categories already exist
	count, err := categoryColl.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("[blog] Warning: could not check blog_categories count: %v", err)
		return
	}
	if count > 0 {
		return // already migrated or manually populated
	}

	// Get distinct categories from published posts
	distinct, err := postsColl.Distinct(ctx, "category", bson.M{
		"category": bson.M{"$ne": ""},
	})
	if err != nil {
		log.Printf("[blog] Warning: could not get distinct categories: %v", err)
		return
	}

	if len(distinct) == 0 {
		log.Println("[blog] No existing blog categories to migrate")
		return
	}

	log.Printf("[blog] Migrating %d existing blog categories...", len(distinct))

	for i, raw := range distinct {
		name, ok := raw.(string)
		if !ok {
			continue
		}
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}

		// Count published posts in this category
		postCount, _ := postsColl.CountDocuments(ctx, bson.M{
			"category":  name,
			"status":    "published",
			"is_active": true,
		})

		cat := models.BlogCategory{
			Name:      name,
			Slug:      migrateSlug(name),
			Order:     i,
			IsActive:  true,
			PostCount: int(postCount),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if _, err := categoryColl.InsertOne(ctx, cat); err != nil {
			log.Printf("[blog] Warning: failed to migrate category %q: %v", name, err)
		} else {
			log.Printf("[blog] Migrated category: %s (%d posts)", name, cat.PostCount)
		}
	}

	log.Println("[blog] Blog category migration complete")
}
