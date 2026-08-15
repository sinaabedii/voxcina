package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ProductSearchMetadata contains AI-optimized search fields for Persian language queries
type ProductSearchMetadata struct {
	// Persian Search Fields
	NamePersian        string   `bson:"name_persian"          json:"namePersian"`          // Persian product name
	DescriptionPersian string   `bson:"description_persian"   json:"descriptionPersian"`   // Persian description
	Keywords           []string `bson:"keywords"              json:"keywords"`             // Persian search keywords (e.g., ["تیشرت", "پیراهن", "یقه گرد"])
	Tags               []string `bson:"tags"                  json:"tags"`                 // Persian tags for categorization (e.g., ["اسپرت", "رسمی", "تابستانی"])
	
	// Material & Fabric (Persian + English)
	MaterialPersian string   `bson:"material_persian"      json:"materialPersian"`      // e.g., "پنبه"
	MaterialEnglish string   `bson:"material_english"      json:"materialEnglish"`      // e.g., "Cotton"
	MaterialTags    []string `bson:"material_tags"         json:"materialTags"`         // e.g., ["پنبه", "نخی", "cotton"]
	
	// Style & Occasion
	StylePersian   string   `bson:"style_persian"         json:"stylePersian"`         // e.g., "اسپرت", "رسمی", "کژوال"
	StyleEnglish   string   `bson:"style_english"         json:"styleEnglish"`         // e.g., "Casual", "Formal", "Sport"
	OccasionTags   []string `bson:"occasion_tags"         json:"occasionTags"`         // e.g., ["روزمره", "مهمانی", "اداری"]
	
	// Season & Weather
	Season         []string `bson:"season"                json:"season"`               // e.g., ["بهار", "تابستان", "spring", "summer"]
	
	// Color Information (Persian)
	ColorsPersian  []ColorMetadata `bson:"colors_persian"    json:"colorsPersian"`        // All available colors with Persian names
	
	// Size & Fit
	SizeSystem     string   `bson:"size_system"           json:"sizeSystem"`           // e.g., "EU", "US", "Asia"
	FitType        string   `bson:"fit_type"              json:"fitType"`              // e.g., "Regular", "Slim", "Oversized" / "معمولی", "تنگ", "گشاد"

	// Free-text garment description, written by the AI metadata generator in
	// English because the only consumer is the virtual try-on image prompt,
	// which is English. Deliberately not a vocabulary: FitType above can only
	// say "گشاد", while these can say "boxy with dropped shoulders and a
	// straight hem" — the distinctions that decide whether a generated try-on
	// looks like the garment the customer is buying.
	FitDescription string `bson:"fit_description,omitempty" json:"fitDescription,omitempty"` // قواره as a short phrase, e.g. "loose, boxy cut with dropped shoulders"
	GarmentPhrase  string `bson:"garment_phrase,omitempty"  json:"garmentPhrase,omitempty"`  // one-line garment summary, e.g. "short-sleeve checked cotton shirt"


	// Gender & Target Audience
	Gender         string   `bson:"gender"                json:"gender"`               // "مردانه", "زنانه", "یونیسکس" / "male", "female", "unisex"
	AgeGroup       string   `bson:"age_group"             json:"ageGroup"`             // e.g., "بزرگسال", "نوجوان", "کودک"
	
	// Semantic Search Support
	EmbeddingVector []float32 `bson:"embedding_vector,omitempty" json:"embeddingVector,omitempty"` // Vector embedding for semantic search (768 dims for multilingual models)
	EmbeddingModel  string    `bson:"embedding_model,omitempty"  json:"embeddingModel,omitempty"`  // Model used for embedding (e.g., "paraphrase-multilingual-mpnet-base-v2")
	
	// Search Optimization
	SearchScore    float64   `bson:"search_score,omitempty"    json:"searchScore,omitempty"`    // Computed relevance score
	PopularityScore float64  `bson:"popularity_score"          json:"popularityScore"`          // Based on views, sales, reviews
	
	// Timestamps
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}

// ColorMetadata represents color information in both Persian and technical formats
type ColorMetadata struct {
	HexCode       string   `bson:"hex_code"       json:"hexCode"`       // e.g., "#FF5733"
	NamePersian   string   `bson:"name_persian"   json:"namePersian"`   // e.g., "قرمز"
	NameEnglish   string   `bson:"name_english"   json:"nameEnglish"`   // e.g., "Red"
	Synonyms      []string `bson:"synonyms"       json:"synonyms"`      // e.g., ["قرمز", "سرخ", "red"]
	ColorFamily   string   `bson:"color_family"   json:"colorFamily"`   // e.g., "قرمز", "آبی", "خنثی"
}

// ProductQueryIntent represents parsed user intent from Persian prompt
type ProductQueryIntent struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"      json:"id,omitempty"`
	OriginalPrompt  string             `bson:"original_prompt"    json:"originalPrompt"`   // Original Persian prompt
	ParsedAt        time.Time          `bson:"parsed_at"          json:"parsedAt"`
	
	// Extracted Intent
	ProductType     []string `bson:"product_type"       json:"productType"`      // e.g., ["تیشرت", "پیراهن"]
	Colors          []string `bson:"colors"             json:"colors"`           // e.g., ["قرمز", "آبی"]
	Materials       []string `bson:"materials"          json:"materials"`        // e.g., ["پنبه", "نخ"]
	Styles          []string `bson:"styles"             json:"styles"`           // e.g., ["اسپرت", "کژوال"]
	Occasions       []string `bson:"occasions"          json:"occasions"`        // e.g., ["روزمره", "مهمانی"]
	PriceRange      *PriceRangeIntent `bson:"price_range,omitempty" json:"priceRange,omitempty"`
	Gender          string   `bson:"gender"             json:"gender"`
	Brands          []string `bson:"brands"             json:"brands"`
	Sizes           []string `bson:"sizes"              json:"sizes"`
	
	// Semantic Understanding
	Sentiment       string   `bson:"sentiment"          json:"sentiment"`        // "positive", "neutral", "negative"
	Priority        []string `bson:"priority"           json:"priority"`         // Ordered list of most important criteria
	
	// Matching Strategy
	UseSemanticSearch bool   `bson:"use_semantic_search" json:"useSemanticSearch"`
	ConfidenceScore float64  `bson:"confidence_score"    json:"confidenceScore"`
}

// PriceRangeIntent represents extracted price constraints
type PriceRangeIntent struct {
	Min      *float64 `bson:"min,omitempty" json:"min,omitempty"`
	Max      *float64 `bson:"max,omitempty" json:"max,omitempty"`
	Keywords []string `bson:"keywords"      json:"keywords"`      // e.g., ["ارزان", "گران", "متوسط"]
}

// SearchLog stores AI agent search history for analytics and improvement
type SearchLog struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"     json:"id,omitempty"`
	UserID          primitive.ObjectID `bson:"user_id"           json:"userId"`
	SessionID       string             `bson:"session_id"        json:"sessionId"`
	Query           string             `bson:"query"             json:"query"`              // Original Persian query
	ParsedIntent    ProductQueryIntent `bson:"parsed_intent"     json:"parsedIntent"`
	ResultCount     int                `bson:"result_count"      json:"resultCount"`
	ResultIDs       []primitive.ObjectID `bson:"result_ids"      json:"resultIds"`
	ClickedProducts []primitive.ObjectID `bson:"clicked_products" json:"clickedProducts"`
	PurchasedProducts []primitive.ObjectID `bson:"purchased_products" json:"purchasedProducts"`
	ResponseTime    int                `bson:"response_time"     json:"responseTime"`       // Milliseconds
	SearchMethod    string             `bson:"search_method"     json:"searchMethod"`       // "text", "semantic", "hybrid"
	UserFeedback    *string            `bson:"user_feedback,omitempty" json:"userFeedback,omitempty"`
	CreatedAt       time.Time          `bson:"created_at"        json:"createdAt"`
}

// VocabularyMapping maps Persian words/phrases to standardized values
type VocabularyMapping struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"     json:"id,omitempty"`
	Type            string             `bson:"type"              json:"type"`               // "color", "material", "style", "product_type", "occasion"
	PersianTerms    []string           `bson:"persian_terms"     json:"persianTerms"`       // All Persian variations
	EnglishTerms    []string           `bson:"english_terms"     json:"englishTerms"`       // English equivalents
	StandardValue   string             `bson:"standard_value"    json:"standardValue"`      // Canonical value for DB queries
	Category        string             `bson:"category"          json:"category"`           // Broader category
	RelatedTerms    []string           `bson:"related_terms"     json:"relatedTerms"`       // Semantic neighbors
	UsageCount      int                `bson:"usage_count"       json:"usageCount"`         // How often this term appears in searches
	CreatedAt       time.Time          `bson:"created_at"        json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updated_at"        json:"updatedAt"`
}

// Note: Recommended MongoDB indexes for AI agent queries:
// Products Collection:
// - Text index: {name_persian: "text", description_persian: "text", keywords: "text", tags: "text"}
// - Compound index: {gender: 1, style_persian: 1, material_persian: 1}
// - Multi-key index: {colors_persian.name_persian: 1}
// - Multi-key index: {tags: 1}
// - Vector index (MongoDB Atlas Vector Search): {embedding_vector: "vector"}
//
// VocabularyMapping Collection:
// - Compound index: {type: 1, persian_terms: 1}
// - Text index: {persian_terms: "text", english_terms: "text"}
//
// SearchLog Collection:
// - Compound index: {user_id: 1, created_at: -1}
// - Index: {session_id: 1}
