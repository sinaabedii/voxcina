package mongo_data

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"

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

// SeedBlogPosts seeds the database with sample blog posts
func SeedBlogPosts(database *mongo.Database) error {
	log.Println("Seeding blog posts...")

	collection := database.Collection("blog_posts")

	// Clear existing blog posts
	_, err := collection.DeleteMany(context.Background(), bson.M{})
	if err != nil {
		return fmt.Errorf("failed to clear blog_posts collection: %w", err)
	}

	now := time.Now()
	
	sampleBlogPosts := []interface{}{
		bson.M{
			"_id":          primitive.NewObjectID(),
			"title":        "Welcome to Our New Blog",
			"slug":         "welcome-to-our-new-blog",
			"excerpt":      "We're excited to launch our new blog where we'll share insights, tips, and updates about our products and industry.",
			"content":      "<p>Welcome to our brand new blog! We're thrilled to have this platform to connect with you and share valuable content.</p><p>In this blog, you'll find:</p><ul><li>Product updates and new releases</li><li>Industry insights and trends</li><li>How-to guides and tutorials</li><li>Behind-the-scenes content</li></ul><p>Stay tuned for regular updates and feel free to suggest topics you'd like us to cover!</p>",
			"cover_image":  "/uploads/blog/welcome-cover.jpg",
			"author": bson.M{
				"name":   "John Doe",
				"avatar": "/uploads/authors/john-doe.jpg",
			},
			"category":     "Company News",
			"tags":         []string{"welcome", "announcement", "blog"},
			"read_time":    2,
			"is_published": true,
			"is_active":    true,
			"published_at": now.Add(-time.Hour * 24 * 7), // Published 1 week ago
			"created_at":   now.Add(-time.Hour * 24 * 7),
			"updated_at":   now.Add(-time.Hour * 24 * 7),
		},
		bson.M{
			"_id":          primitive.NewObjectID(),
			"title":        "10 Tips for Better Product Photography",
			"slug":         "10-tips-for-better-product-photography",
			"excerpt":      "Learn how to take stunning product photos that will make your items stand out and attract more customers.",
			"content":      "<p>Great product photography is essential for e-commerce success. Here are 10 tips to improve your product photos:</p><ol><li><strong>Use natural light when possible</strong> - Natural light provides the most accurate colors and reduces harsh shadows.</li><li><strong>Invest in a good tripod</strong> - Stability is key for sharp, professional-looking photos.</li><li><strong>Choose the right background</strong> - A clean, neutral background helps your product stand out.</li><li><strong>Show multiple angles</strong> - Customers want to see every detail of the product.</li><li><strong>Include scale references</strong> - Help customers understand the size of your product.</li><li><strong>Focus on details</strong> - Highlight unique features and craftsmanship.</li><li><strong>Use consistent styling</strong> - Maintain a cohesive look across all your product photos.</li><li><strong>Edit thoughtfully</strong> - Enhance your photos without making them unrealistic.</li><li><strong>Consider lifestyle shots</strong> - Show your product in use or context.</li><li><strong>Optimize for web</strong> - Balance quality with file size for faster loading.</li></ol><p>Remember, great product photography is an investment that pays off in increased sales and customer satisfaction!</p>",
			"cover_image":  "/uploads/blog/photography-tips-cover.jpg",
			"author": bson.M{
				"name":   "Sarah Smith",
				"avatar": "/uploads/authors/sarah-smith.jpg",
			},
			"category":     "Photography",
			"tags":         []string{"photography", "tips", "ecommerce", "tutorial"},
			"read_time":    5,
			"is_published": true,
			"is_active":    true,
			"published_at": now.Add(-time.Hour * 24 * 5), // Published 5 days ago
			"created_at":   now.Add(-time.Hour * 24 * 5),
			"updated_at":   now.Add(-time.Hour * 24 * 5),
		},
		bson.M{
			"_id":          primitive.NewObjectID(),
			"title":        "The Future of E-commerce: Trends to Watch in 2024",
			"slug":         "future-of-ecommerce-trends-2024",
			"excerpt":      "Discover the key e-commerce trends that will shape the industry in 2024 and how businesses can adapt to stay competitive.",
			"content":      "<p>The e-commerce landscape is constantly evolving. As we move through 2024, several key trends are shaping the future of online retail:</p><h2>1. AI-Powered Personalization</h2><p>Artificial intelligence is revolutionizing how businesses personalize customer experiences. From product recommendations to dynamic pricing, AI helps create more relevant shopping experiences.</p><h2>2. Social Commerce Growth</h2><p>Social media platforms are becoming major shopping destinations. Instagram, TikTok, and Pinterest are making it easier than ever to discover and purchase products directly from social feeds.</p><h2>3. Sustainability Focus</h2><p>Consumers are increasingly conscious about environmental impact. Businesses that prioritize sustainable practices and transparent supply chains are gaining competitive advantages.</p><h2>4. Voice Commerce</h2><p>Voice assistants are changing how people shop online. Optimizing for voice search and enabling voice-activated purchases is becoming crucial.</p><h2>5. Augmented Reality Shopping</h2><p>AR technology allows customers to 'try before they buy' virtually, reducing returns and increasing customer confidence in online purchases.</p><p>Businesses that adapt to these trends will be better positioned for success in the evolving e-commerce landscape.</p>",
			"cover_image":  "/uploads/blog/ecommerce-trends-cover.jpg",
			"author": bson.M{
				"name":   "Mike Johnson",
				"avatar": "/uploads/authors/mike-johnson.jpg",
			},
			"category":     "Industry Insights",
			"tags":         []string{"ecommerce", "trends", "2024", "technology", "ai"},
			"read_time":    7,
			"is_published": true,
			"is_active":    true,
			"published_at": now.Add(-time.Hour * 24 * 2), // Published 2 days ago
			"created_at":   now.Add(-time.Hour * 24 * 2),
			"updated_at":   now.Add(-time.Hour * 24 * 2),
		},
		bson.M{
			"_id":          primitive.NewObjectID(),
			"title":        "How to Build Customer Loyalty in E-commerce",
			"slug":         "how-to-build-customer-loyalty-ecommerce",
			"excerpt":      "Learn proven strategies to turn one-time buyers into loyal customers who keep coming back to your online store.",
			"content":      "<p>Building customer loyalty is essential for long-term e-commerce success. Here are proven strategies to create lasting relationships with your customers:</p><h2>Provide Exceptional Customer Service</h2><p>Fast response times, helpful solutions, and going above and beyond create memorable experiences that customers want to repeat.</p><h2>Implement a Loyalty Program</h2><p>Reward repeat customers with points, discounts, or exclusive perks. Make the program simple to understand and easy to use.</p><h2>Personalize the Shopping Experience</h2><p>Use customer data to provide personalized recommendations, targeted offers, and relevant content that speaks to individual preferences.</p><h2>Maintain Consistent Quality</h2><p>Ensure your products and services consistently meet or exceed customer expectations. Quality builds trust and trust builds loyalty.</p><h2>Engage Through Multiple Channels</h2><p>Stay connected with customers through email newsletters, social media, and other touchpoints. Provide value even when they're not shopping.</p><h2>Act on Customer Feedback</h2><p>Listen to what customers say and make improvements based on their input. Show them that their opinions matter.</p><p>Remember, acquiring a new customer costs 5-25 times more than retaining an existing one. Investing in customer loyalty pays off!</p>",
			"cover_image":  "/uploads/blog/customer-loyalty-cover.jpg",
			"author": bson.M{
				"name":   "Emily Davis",
				"avatar": "/uploads/authors/emily-davis.jpg",
			},
			"category":     "Customer Experience",
			"tags":         []string{"customer-loyalty", "retention", "ecommerce", "strategy"},
			"read_time":    6,
			"is_published": true,
			"is_active":    true,
			"published_at": now.Add(-time.Hour * 24), // Published 1 day ago
			"created_at":   now.Add(-time.Hour * 24),
			"updated_at":   now.Add(-time.Hour * 24),
		},
		bson.M{
			"_id":          primitive.NewObjectID(),
			"title":        "Draft: Upcoming Product Launch",
			"slug":         "draft-upcoming-product-launch",
			"excerpt":      "This is a draft post about our upcoming product launch. Still working on the details...",
			"content":      "<p>This is a draft post that hasn't been published yet. We're still working on the content and will publish it soon.</p>",
			"cover_image":  "/uploads/blog/draft-cover.jpg",
			"author": bson.M{
				"name":   "John Doe",
				"avatar": "/uploads/authors/john-doe.jpg",
			},
			"category":     "Product News",
			"tags":         []string{"draft", "product", "launch"},
			"read_time":    1,
			"is_published": false, // This is a draft
			"is_active":    true,
			"published_at": nil, // No published date for drafts
			"created_at":   now,
			"updated_at":   now,
		},
	}

	// Insert sample blog posts
	_, err = collection.InsertMany(context.Background(), sampleBlogPosts)
	if err != nil {
		return fmt.Errorf("failed to insert sample blog posts: %w", err)
	}

	log.Printf("Successfully seeded %d blog posts", len(sampleBlogPosts))
	return nil
}

// SeedVocabularyMappings seeds the database with Persian-English vocabulary mappings
func SeedVocabularyMappings(database *mongo.Database) error {
	log.Println("Seeding vocabulary mappings...")

	collection := database.Collection("vocabulary_mappings")

	// Clear existing vocabulary mappings
	_, err := collection.DeleteMany(context.Background(), bson.M{})
	if err != nil {
		return fmt.Errorf("failed to clear vocabulary_mappings collection: %w", err)
	}

	now := time.Now()

	// Material mappings
	materialMappings := []interface{}{
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"پشم", "پشمی", "کشمیر", "موهر"},
			"english_terms":  []string{"wool", "cashmere", "mohair"},
			"standard_value": "wool",
			"category":       "natural_fabric",
			"related_terms":  []string{"گرم", "زمستانی"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"پنبه", "نخی", "کتان", "پنبه‌ای"},
			"english_terms":  []string{"cotton", "cotton blend"},
			"standard_value": "cotton",
			"category":       "natural_fabric",
			"related_terms":  []string{"نخ", "طبیعی"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"پلی استر", "سنتتیک", "مصنوعی"},
			"english_terms":  []string{"polyester", "synthetic"},
			"standard_value": "polyester",
			"category":       "synthetic_fabric",
			"related_terms":  []string{"ورزشی", "سریع خشک"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"جین", "دنیم", "جین کشی"},
			"english_terms":  []string{"denim", "jeans", "jean"},
			"standard_value": "denim",
			"category":       "heavy_fabric",
			"related_terms":  []string{"پنبه", "محکم"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"ابریشم", "ابریشمی", "ساتن"},
			"english_terms":  []string{"silk", "satin", "silky"},
			"standard_value": "silk",
			"category":       "luxury_fabric",
			"related_terms":  []string{"لوکس", "نرم"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"چرم", "چرمی", "چرم مصنوعی", "پوست"},
			"english_terms":  []string{"leather", "faux leather", "PU leather"},
			"standard_value": "leather",
			"category":       "leather_fabric",
			"related_terms":  []string{"جیر", "کیف"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"کشباف", "بافت", "نایلون کشی"},
			"english_terms":  []string{"knit", "stretch", "elastic"},
			"standard_value": "knit",
			"category":       "stretchy_fabric",
			"related_terms":  []string{"راحت", "ورزشی"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "material",
			"persian_terms":  []string{"مخمل", "ولور", "کروماژ"},
			"english_terms":  []string{"velvet", "velour"},
			"standard_value": "velvet",
			"category":       "luxury_fabric",
			"related_terms":  []string{"لوکس", "نرم"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
	}

	// Style mappings
	styleMappings := []interface{}{
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"اسپرت", "ورزشی", "راحتی"},
			"english_terms":  []string{"sport", "sporty", "athletic", "casual"},
			"standard_value": "sport",
			"category":       "casual_style",
			"related_terms":  []string{"کژوال", "روزمره"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"رسمی", "کلاسیک", "اداری", "مجلسی"},
			"english_terms":  []string{"formal", "classic", "office", "business"},
			"standard_value": "formal",
			"category":       "formal_style",
			"related_terms":  []string{"شیک", "رسمی"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"کژوال", "روزمره", "معمولی", "ساده"},
			"english_terms":  []string{"casual", "everyday", "simple"},
			"standard_value": "casual",
			"category":       "casual_style",
			"related_terms":  []string{"راحت", "اسپرت"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"مدرن", "جدید", "ترند", "مد روز"},
			"english_terms":  []string{"modern", "trendy", "contemporary", "fashionable"},
			"standard_value": "modern",
			"category":       "trendy_style",
			"related_terms":  []string{"شیک", "جوان"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"سنتی", "کلاسیک", "قدیمی", "محافظه کار"},
			"english_terms":  []string{"traditional", "classic", "vintage", "conservative"},
			"standard_value": "traditional",
			"category":       "classic_style",
			"related_terms":  []string{"رسمی", "قدیمی"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"لوکس", "شیک", "گران قیمت", "لاکچری"},
			"english_terms":  []string{"luxury", "elegant", "premium", "high-end"},
			"standard_value": "luxury",
			"category":       "luxury_style",
			"related_terms":  []string{"مجلسی", "رسمی"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "style",
			"persian_terms":  []string{"اور سایز", "گشاد", "بزرگ", "فری سایز"},
			"english_terms":  []string{"oversized", "loose", "baggy", "free size"},
			"standard_value": "oversized",
			"category":       "fit_style",
			"related_terms":  []string{"راحت", "کژوال"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
	}

	// Occasion mappings
	occasionMappings := []interface{}{
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "occasion",
			"persian_terms":  []string{"روزمره", "روزانه", "همه روزه"},
			"english_terms":  []string{"everyday", "daily", "casual wear"},
			"standard_value": "everyday",
			"category":       "casual_occasion",
			"related_terms":  []string{"کژوال", "راحت"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "occasion",
			"persian_terms":  []string{"اداری", "محل کار", "سر کار"},
			"english_terms":  []string{"office", "work", "business"},
			"standard_value": "office",
			"category":       "formal_occasion",
			"related_terms":  []string{"رسمی", "کلاسیک"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "occasion",
			"persian_terms":  []string{"مهمانی", "جشن", "مجلسی"},
			"english_terms":  []string{"party", "celebration", "formal event"},
			"standard_value": "party",
			"category":       "formal_occasion",
			"related_terms":  []string{"رسمی", "شیک"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "occasion",
			"persian_terms":  []string{"ورزشی", "باشگاه", "ورزش"},
			"english_terms":  []string{"sport", "gym", "workout", "athletic"},
			"standard_value": "sport",
			"category":       "active_occasion",
			"related_terms":  []string{"اسپرت", "فعالیت"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
		bson.M{
			"_id":            primitive.NewObjectID(),
			"type":           "occasion",
			"persian_terms":  []string{"سفر", "گردش", "تفریح"},
			"english_terms":  []string{"travel", "vacation", "leisure"},
			"standard_value": "travel",
			"category":       "casual_occasion",
			"related_terms":  []string{"راحت", "کژوال"},
			"usage_count":    0,
			"created_at":     now,
			"updated_at":     now,
		},
	}

	// Combine all mappings
	allMappings := append(materialMappings, styleMappings...)
	allMappings = append(allMappings, occasionMappings...)

	// Insert all mappings
	_, err = collection.InsertMany(context.Background(), allMappings)
	if err != nil {
		return fmt.Errorf("failed to insert vocabulary mappings: %w", err)
	}

	log.Printf("Successfully seeded %d vocabulary mappings", len(allMappings))
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

	// Seed vocabulary mappings first (this should always work)
	err := SeedVocabularyMappings(database)
	if err != nil {
		return fmt.Errorf("vocabulary mappings seeding failed: %w", err)
	}

	// Seed categories (optional - may fail if data files don't exist)
	err = SeedCategories(database)
	if err != nil {
		log.Printf("Warning: Category seeding skipped: %v", err)
	}

	// Seed products (optional - may fail if data files don't exist)
	err = SeedProducts(database)
	if err != nil {
		log.Printf("Warning: Product seeding skipped: %v", err)
	}

	// Seed blog posts (this should always work)
	err = SeedBlogPosts(database)
	if err != nil {
		return fmt.Errorf("blog post seeding failed: %w", err)
	}

	log.Println("Database seeding completed successfully!")
	return nil
}
