package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureAISearchIndexes creates all necessary indexes for AI agent product search
func EnsureAISearchIndexes(database *mongo.Database) error {
	ctx := context.Background()
	productsCollection := database.Collection("products")
	vocabularyCollection := database.Collection("vocabulary_mappings")
	searchLogCollection := database.Collection("search_logs")

	// ===== PRODUCTS COLLECTION INDEXES =====

	// 1. Text search index for Persian full-text search
	textIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.name_persian", Value: "text"},
			{Key: "search_metadata.description_persian", Value: "text"},
			{Key: "search_metadata.keywords", Value: "text"},
			{Key: "search_metadata.tags", Value: "text"},
		},
		Options: options.Index().
			SetName("ai_persian_text_search").
			SetWeights(bson.M{
				"search_metadata.name_persian":        10, // Highest weight
				"search_metadata.keywords":            8,
				"search_metadata.tags":                5,
				"search_metadata.description_persian": 3,
			}).
			SetDefaultLanguage("none"), // Important: disable stemming for Persian
	}

	// 2. Compound index for structured queries (gender + style + material)
	compoundFilterIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.gender", Value: 1},
			{Key: "search_metadata.style_persian", Value: 1},
			{Key: "search_metadata.material_persian", Value: 1},
			{Key: "is_active", Value: 1},
			{Key: "in_stock", Value: 1},
		},
		Options: options.Index().
			SetName("ai_structured_filter"),
	}

	// 3. Multi-key index for color searches
	colorIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.colors_persian.name_persian", Value: 1},
		},
		Options: options.Index().
			SetName("ai_color_search"),
	}

	// 4. Multi-key index for tags (occasion, style descriptors)
	tagsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.tags", Value: 1},
		},
		Options: options.Index().
			SetName("ai_tags_search"),
	}

	// 5. Multi-key index for material tags
	materialTagsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.material_tags", Value: 1},
		},
		Options: options.Index().
			SetName("ai_material_tags"),
	}

	// 6. Multi-key index for keywords
	keywordsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.keywords", Value: 1},
		},
		Options: options.Index().
			SetName("ai_keywords_search"),
	}

	// 7. Price range index (for budget filtering)
	priceIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "price", Value: 1},
			{Key: "is_active", Value: 1},
		},
		Options: options.Index().
			SetName("ai_price_filter"),
	}

	// 8. Popularity/ranking index (for sorting results)
	popularityIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.popularity_score", Value: -1},
			{Key: "average_rating", Value: -1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("ai_popularity_ranking"),
	}

	// 9. Brand filtering index
	brandIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "brand", Value: 1},
			{Key: "is_active", Value: 1},
		},
		Options: options.Index().
			SetName("ai_brand_filter"),
	}

	// 10. Season index (individual, not compound)
	seasonIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.season", Value: 1},
		},
		Options: options.Index().
			SetName("ai_season"),
	}

	// 11. Occasion tags index (individual, not compound)
	occasionTagsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "search_metadata.occasion_tags", Value: 1},
		},
		Options: options.Index().
			SetName("ai_occasion_tags"),
	}

	// Create all product indexes
	productIndexes := []mongo.IndexModel{
		textIndexModel,
		compoundFilterIndex,
		colorIndex,
		tagsIndex,
		materialTagsIndex,
		keywordsIndex,
		priceIndex,
		popularityIndex,
		brandIndex,
		seasonIndex,
		occasionTagsIndex,
	}

	// First, try to drop the problematic compound index if it exists
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Drop the old problematic index if it exists
	_, err := productsCollection.Indexes().DropOne(ctx, "ai_season_occasion")
	if err != nil {
		// Ignore error if index doesn't exist
		log.Printf("Note: ai_season_occasion index may not exist or already dropped: %v", err)
	} else {
		log.Println("✓ Dropped problematic ai_season_occasion index")
	}

	_, err = productsCollection.Indexes().CreateMany(ctx, productIndexes)
	if err != nil {
		log.Printf("Warning: Could not create AI search indexes for products: %v", err)
		return err
	}
	log.Println("✓ AI search indexes created for products collection")

	// ===== VOCABULARY_MAPPINGS COLLECTION INDEXES =====

	// 1. Type + Persian terms lookup (most common query)
	vocabTypeTermsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "type", Value: 1},
			{Key: "persian_terms", Value: 1},
		},
		Options: options.Index().
			SetName("vocab_type_terms"),
	}

	// 2. Text search on vocabulary
	vocabTextIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "persian_terms", Value: "text"},
			{Key: "english_terms", Value: "text"},
			{Key: "related_terms", Value: "text"},
		},
		Options: options.Index().
			SetName("vocab_text_search"),
	}

	// 3. Standard value lookup (reverse mapping)
	vocabStandardIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "standard_value", Value: 1},
		},
		Options: options.Index().
			SetName("vocab_standard_value"),
	}

	vocabularyIndexes := []mongo.IndexModel{
		vocabTypeTermsIndex,
		vocabTextIndex,
		vocabStandardIndex,
	}

	_, err = vocabularyCollection.Indexes().CreateMany(ctx, vocabularyIndexes)
	if err != nil {
		log.Printf("Warning: Could not create indexes for vocabulary_mappings: %v", err)
		return err
	}
	log.Println("✓ Indexes created for vocabulary_mappings collection")

	// ===== SEARCH_LOGS COLLECTION INDEXES =====

	// 1. User history lookup
	searchLogUserIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("search_log_user_history"),
	}

	// 2. Session tracking
	searchLogSessionIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "session_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("search_log_session"),
	}

	// 3. Analytics queries (popular searches)
	searchLogAnalyticsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "query", Value: 1},
			{Key: "result_count", Value: 1},
			{Key: "created_at", Value: -1},
		},
		Options: options.Index().
			SetName("search_log_analytics"),
	}

	// 4. TTL index (auto-delete old logs after 90 days)
	searchLogTTLIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "created_at", Value: 1},
		},
		Options: options.Index().
			SetName("search_log_ttl").
			SetExpireAfterSeconds(7776000), // 90 days
	}

	searchLogIndexes := []mongo.IndexModel{
		searchLogUserIndex,
		searchLogSessionIndex,
		searchLogAnalyticsIndex,
		searchLogTTLIndex,
	}

	_, err = searchLogCollection.Indexes().CreateMany(ctx, searchLogIndexes)
	if err != nil {
		log.Printf("Warning: Could not create indexes for search_logs: %v", err)
		return err
	}
	log.Println("✓ Indexes created for search_logs collection")

	return nil
}

// Note: For Vector Search (embeddings), you need to create a Vector Search Index via MongoDB Atlas UI or API:
//
// Vector Search Index Configuration (JSON):
// {
//   "fields": [
//     {
//       "type": "vector",
//       "path": "search_metadata.embedding_vector",
//       "numDimensions": 768,
//       "similarity": "cosine"
//     }
//   ]
// }
//
// This enables semantic search queries like:
// db.products.aggregate([
//   {
//     "$search": {
//       "index": "vector_search_index",
//       "knnBeta": {
//         "vector": [0.1, 0.2, ..., 0.768],
//         "path": "search_metadata.embedding_vector",
//         "k": 10
//       }
//     }
//   }
// ])
