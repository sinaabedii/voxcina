package services

import (
	"context"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/models"
)

// BlogCategoryRepository handles CRUD operations for blog categories.
type BlogCategoryRepository struct {
	db *mongo.Database
}

// NewBlogCategoryRepository creates a new BlogCategoryRepository.
func NewBlogCategoryRepository(db *mongo.Database) *BlogCategoryRepository {
	return &BlogCategoryRepository{db: db}
}

func (r *BlogCategoryRepository) collection() *mongo.Collection {
	return r.db.Collection("blog_categories")
}

// InsertCategory creates a new blog category.
func (r *BlogCategoryRepository) InsertCategory(ctx context.Context, cat *models.BlogCategory) error {
	cat.CreatedAt = time.Now()
	cat.UpdatedAt = time.Now()
	_, err := r.collection().InsertOne(ctx, cat)
	return err
}

// FindCategoryByID returns a single category by ID.
func (r *BlogCategoryRepository) FindCategoryByID(ctx context.Context, id primitive.ObjectID) (*models.BlogCategory, error) {
	var cat models.BlogCategory
	err := r.collection().FindOne(ctx, bson.M{"_id": id}).Decode(&cat)
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

// FindAllCategories returns all active categories ordered by Order, then Name.
func (r *BlogCategoryRepository) FindAllCategories(ctx context.Context) ([]models.BlogCategory, error) {
	opts := options.Find().SetSort(bson.D{
		{Key: "order", Value: 1},
		{Key: "name", Value: 1},
	})
	cursor, err := r.collection().Find(ctx, bson.M{"is_active": true}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categories []models.BlogCategory
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, err
	}
	return categories, nil
}

// FindAllCategoriesAdmin returns all categories (including inactive) for admin management.
func (r *BlogCategoryRepository) FindAllCategoriesAdmin(ctx context.Context) ([]models.BlogCategory, error) {
	opts := options.Find().SetSort(bson.D{
		{Key: "order", Value: 1},
		{Key: "name", Value: 1},
	})
	cursor, err := r.collection().Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categories []models.BlogCategory
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, err
	}
	return categories, nil
}

// UpdateCategory updates a category by ID.
func (r *BlogCategoryRepository) UpdateCategory(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()
	_, err := r.collection().UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

// DeleteCategory soft-deletes a category by setting is_active to false.
func (r *BlogCategoryRepository) DeleteCategory(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection().UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	})
	return err
}

// RestoreCategory restores a soft-deleted category.
func (r *BlogCategoryRepository) RestoreCategory(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection().UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"is_active":  true,
			"updated_at": time.Now(),
		},
	})
	return err
}

// RecountCategoryPosts recalculates the post count for a single category.
func (r *BlogCategoryRepository) RecountCategoryPosts(ctx context.Context, category string) (int, error) {
	count, err := r.db.Collection("blog_posts").CountDocuments(ctx, bson.M{
		"category":  category,
		"status":    "published",
		"is_active": true,
	})
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

// RecountAllCategoryPosts recalculates post counts for all categories.
func (r *BlogCategoryRepository) RecountAllCategoryPosts(ctx context.Context) error {
	categories, err := r.FindAllCategoriesAdmin(ctx)
	if err != nil {
		return err
	}
	for _, cat := range categories {
		count, err := r.RecountCategoryPosts(ctx, cat.Name)
		if err != nil {
			continue
		}
		_, _ = r.collection().UpdateOne(ctx, bson.M{"_id": cat.ID}, bson.M{
			"$set": bson.M{
				"post_count": count,
				"updated_at": time.Now(),
			},
		})
	}
	return nil
}

// FindBySlug returns a category by its slug.
func (r *BlogCategoryRepository) FindBySlug(ctx context.Context, slug string) (*models.BlogCategory, error) {
	var cat models.BlogCategory
	err := r.collection().FindOne(ctx, bson.M{"slug": slug, "is_active": true}).Decode(&cat)
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

// FindByName returns a category by its exact name.
func (r *BlogCategoryRepository) FindByName(ctx context.Context, name string) (*models.BlogCategory, error) {
	var cat models.BlogCategory
	err := r.collection().FindOne(ctx, bson.M{"name": name}).Decode(&cat)
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

// GenerateCategorySlug creates a URL-friendly slug from a category name.
func GenerateCategorySlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")
	return slug
}
