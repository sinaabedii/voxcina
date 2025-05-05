package mongo_data

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/config"
	"backEnd/db"
)

// TSCategory represents the category structure from the TS file
type TSCategory struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Image       string       `json:"image,omitempty"`
	Slug        string       `json:"slug"`
	Children    []TSCategory `json:"children,omitempty"`
	ParentID    string       `json:"parentId,omitempty"`
}

// TSProductColor represents a product color in the TS file
type TSProductColor struct {
	Name string `json:"name"`
	Code string `json:"code"`
}

// TSProduct represents the product structure from the TS file
type TSProduct struct {
	ID                 string           `json:"id"`
	Name               string           `json:"name"`
	Description        string           `json:"description"`
	Price              float64          `json:"price"`
	OriginalPrice      float64          `json:"originalPrice,omitempty"`
	Images             []string         `json:"images"`
	Category           string           `json:"category"`
	CategoryID         string           `json:"categoryId"`
	Brand              string           `json:"brand"`
	InStock            bool             `json:"inStock"`
	Sizes              []string         `json:"sizes,omitempty"`
	Colors             []TSProductColor `json:"colors,omitempty"`
	Rating             float64          `json:"rating"`
	ReviewCount        int              `json:"reviewCount"`
	Features           []string         `json:"features,omitempty"`
	IsNew              bool             `json:"isNew,omitempty"`
	IsFeatured         bool             `json:"isFeatured,omitempty"`
	CreatedAt          string           `json:"createdAt"`
	UpdatedAt          string           `json:"updatedAt"`
	DiscountPercentage float64          `json:"discountPercentage,omitempty"`
	SKU                string           `json:"sku,omitempty"`
	StockCount         int              `json:"stockCount,omitempty"`
	Material           string           `json:"material,omitempty"`
}

// convertTSCategoryToDBModel converts from the TS category to MongoDB document
// We're using bson.M directly to match the exact format in TypeScript
func convertTSCategoryToDBModel(category TSCategory) bson.M {
	// Convert string ID to ObjectID for MongoDB
	objID, _ := primitive.ObjectIDFromHex(category.ID)
	
	// Create a document that precisely matches the TS structure
	return bson.M{
		"_id":         objID,
		"name":        category.Name,
		"description": category.Description,
		"image":       category.Image,
		"slug":        category.Slug,
		"parentId":    category.ParentID,
	}
}

// convertTSProductToDBModel converts from the TS product to MongoDB document
// We're using bson.M directly to match the exact format in TypeScript
func convertTSProductToDBModel(product TSProduct) bson.M {
	// Convert string ID to ObjectID for MongoDB
	objID, _ := primitive.ObjectIDFromHex(product.ID)
	
	// Convert colors to match expected MongoDB format
	var colors []bson.M
	for _, color := range product.Colors {
		colors = append(colors, bson.M{
			"name": color.Name,
			"code": color.Code,
		})
	}
	
	// Create a document that precisely matches the TS structure
	doc := bson.M{
		"_id":          objID,
		"name":         product.Name,
		"description":  product.Description,
		"price":        product.Price,
		"images":       product.Images,
		"category":     product.Category,
		"categoryId":   product.CategoryID,
		"brand":        product.Brand,
		"inStock":      product.InStock,
		"rating":       product.Rating,
		"reviewCount":  product.ReviewCount,
		"isNew":        product.IsNew,
		"isFeatured":   product.IsFeatured,
		"createdAt":    product.CreatedAt, // Store as string to match TS format exactly
		"updatedAt":    product.UpdatedAt, // Store as string to match TS format exactly
	}
	
	// Add optional fields only if they exist
	if product.OriginalPrice > 0 {
		doc["originalPrice"] = product.OriginalPrice
	}
	
	if len(product.Sizes) > 0 {
		doc["sizes"] = product.Sizes
	}
	
	if len(colors) > 0 {
		doc["colors"] = colors
	}
	
	if len(product.Features) > 0 {
		doc["features"] = product.Features
	}
	
	if product.DiscountPercentage > 0 {
		doc["discountPercentage"] = product.DiscountPercentage
	}
	
	if product.SKU != "" {
		doc["sku"] = product.SKU
	}
	
	if product.StockCount > 0 {
		doc["stockCount"] = product.StockCount
	}
	
	if product.Material != "" {
		doc["material"] = product.Material
	}
	
	return doc
}

// extractArrayFromTSFile extracts the array data from a TypeScript file
func extractArrayFromTSFile(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	content := string(data)

	// Find the start of the array
	startIdx := strings.Index(content, "[")
	if startIdx == -1 {
		return "", fmt.Errorf("no array found in file")
	}

	// Find the end of the array (last "];" or "]" in the file)
	endIdx := strings.LastIndex(content, "];")
	if endIdx == -1 {
		endIdx = strings.LastIndex(content, "]")
		if endIdx == -1 {
			return "", fmt.Errorf("no array end found in file")
		}
		endIdx++
	} else {
		endIdx++
	}

	// Extract the array content
	arrayData := content[startIdx:endIdx]

	// Clean up TS-specific syntax for proper JSON parsing
	// Replace trailing commas after objects and arrays
	arrayData = regexp.MustCompile(`,\s*\}`).ReplaceAllString(arrayData, "}")
	arrayData = regexp.MustCompile(`,\s*\]`).ReplaceAllString(arrayData, "]")

	// Handle boolean values (true/false without quotes)
	arrayData = regexp.MustCompile(`:\s*true`).ReplaceAllString(arrayData, `: true`)
	arrayData = regexp.MustCompile(`:\s*false`).ReplaceAllString(arrayData, `: false`)

	// Remove any potential TypeScript type definitions
	arrayData = regexp.MustCompile(`\/\/.*`).ReplaceAllString(arrayData, "")

	return arrayData, nil
}

// SeedCategories reads category data from the TS file and inserts into MongoDB
func SeedCategories(database *mongo.Database) error {
	log.Println("Seeding categories...")

	// Extract category data from TS file
	arrayData, err := extractArrayFromTSFile(
		"/home/erfan/Projects/shop/front_end/src/data/categories.ts",
	)
	if err != nil {
		return fmt.Errorf("failed to extract categories data: %w", err)
	}

	var categories []TSCategory
	err = json.Unmarshal([]byte(arrayData), &categories)
	if err != nil {
		return fmt.Errorf("failed to parse categories data: %w", err)
	}

	// Create a collection for categories
	collection := database.Collection("categories")

	// Clear existing categories
	_, err = collection.DeleteMany(context.Background(), bson.M{})
	if err != nil {
		return fmt.Errorf("failed to clear categories collection: %w", err)
	}

	// Insert all parent categories first
	for _, category := range categories {
		_, err = collection.InsertOne(
			context.Background(),
			convertTSCategoryToDBModel(category),
		)
		if err != nil {
			return fmt.Errorf("failed to insert parent category %s: %w", category.ID, err)
		}

		// Insert child categories if any
		for _, child := range category.Children {
			_, err = collection.InsertOne(
				context.Background(),
				convertTSCategoryToDBModel(child),
			)
			if err != nil {
				return fmt.Errorf("failed to insert child category %s: %w", child.ID, err)
			}
		}
	}

	log.Printf(
		"Successfully seeded %d parent categories and their children",
		len(categories),
	)
	return nil
}

// SeedProducts reads product data from the TS file and inserts into MongoDB
func SeedProducts(database *mongo.Database) error {
	log.Println("Seeding products...")

	// Extract product data from TS file
	arrayData, err := extractArrayFromTSFile(
		"/home/erfan/Projects/shop/front_end/src/data/products.ts",
	)
	if err != nil {
		return fmt.Errorf("failed to extract products data: %w", err)
	}

	var products []TSProduct
	err = json.Unmarshal([]byte(arrayData), &products)
	if err != nil {
		return fmt.Errorf("failed to parse products data: %w", err)
	}

	// Create a collection for products
	collection := database.Collection("products")

	// Clear existing products
	_, err = collection.DeleteMany(context.Background(), bson.M{})
	if err != nil {
		return fmt.Errorf("failed to clear products collection: %w", err)
	}

	// Insert products
	for _, product := range products {
		_, err = collection.InsertOne(context.Background(), convertTSProductToDBModel(product))
		if err != nil {
			return fmt.Errorf("failed to insert product %s: %w", product.ID, err)
		}
	}

	log.Printf("Successfully seeded %d products", len(products))
	return nil
}

// SeedDatabase seeds the database with initial data
func SeedDatabase() error {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database
	database := db.Connect(cfg)
	if database == nil {
		return fmt.Errorf("failed to connect to database")
	}

	// Seed categories
	err := SeedCategories(database)
	if err != nil {
		return fmt.Errorf("category seeding failed: %w", err)
	}

	// Seed products
	err = SeedProducts(database)
	if err != nil {
		return fmt.Errorf("product seeding failed: %w", err)
	}

	log.Println("Database seeding completed successfully!")
	return nil
}
