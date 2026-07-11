package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserActivity represents a single user activity event
type UserActivity struct {
	ID           primitive.ObjectID     `bson:"_id,omitempty" json:"id,omitempty"`
	UserID       primitive.ObjectID     `bson:"user_id,omitempty" json:"userId,omitempty"`       // Nil for anonymous users
	UserName     string                 `bson:"user_name,omitempty" json:"userName,omitempty"`   // Snapshot of authenticated user's name; falls back to phone
	SessionID    string                 `bson:"session_id" json:"sessionId"`                     // Browser session ID
	ActivityType string                 `bson:"activity_type" json:"activityType"`               // Type of activity
	
	// Page/Resource Information
	PagePath     string                 `bson:"page_path,omitempty" json:"pagePath,omitempty"`
	PageTitle    string                 `bson:"page_title,omitempty" json:"pageTitle,omitempty"`
	Referrer     string                 `bson:"referrer,omitempty" json:"referrer,omitempty"`
	
	// Product-related
	ProductID    primitive.ObjectID     `bson:"product_id,omitempty" json:"productId,omitempty"`
	ProductName  string                 `bson:"product_name,omitempty" json:"productName,omitempty"`
	CategoryID   primitive.ObjectID     `bson:"category_id,omitempty" json:"categoryId,omitempty"`
	
	// Search-related
	SearchQuery  string                 `bson:"search_query,omitempty" json:"searchQuery,omitempty"`
	SearchResults int                   `bson:"search_results,omitempty" json:"searchResults,omitempty"`
	
	// Order-related
	OrderID      primitive.ObjectID     `bson:"order_id,omitempty" json:"orderId,omitempty"`
	OrderValue   float64                `bson:"order_value,omitempty" json:"orderValue,omitempty"`
	
	// Metadata (flexible for additional data)
	Metadata     map[string]interface{} `bson:"metadata,omitempty" json:"metadata,omitempty"`
	
	// Technical Information
	IPAddress    string                 `bson:"ip_address,omitempty" json:"ipAddress,omitempty"`
	UserAgent    string                 `bson:"user_agent,omitempty" json:"userAgent,omitempty"`
	DeviceType   string                 `bson:"device_type,omitempty" json:"deviceType,omitempty"`     // mobile, tablet, desktop
	Browser      string                 `bson:"browser,omitempty" json:"browser,omitempty"`
	OS           string                 `bson:"os,omitempty" json:"os,omitempty"`
	
	// Time tracking
	Duration     int                    `bson:"duration,omitempty" json:"duration,omitempty"`          // Time spent (milliseconds)
	CreatedAt    time.Time              `bson:"created_at" json:"createdAt"`
	ExpiresAt    time.Time              `bson:"expires_at,omitempty" json:"expiresAt,omitempty"`      // For TTL index
}

// Activity type constants
const (
	ActivityPageView          = "page_view"
	ActivityProductView       = "product_view"
	ActivityProductClick      = "product_click"
	ActivityAddToCart         = "add_to_cart"
	ActivityRemoveFromCart    = "remove_from_cart"
	ActivityAddToWishlist     = "add_to_wishlist"
	ActivityRemoveFromWishlist = "remove_from_wishlist"
	ActivitySearch            = "search"
	ActivityLogin             = "login"
	ActivityLogout            = "logout"
	ActivityRegister          = "register"
	ActivityCheckoutStarted   = "checkout_started"
	ActivityCheckoutCompleted = "checkout_completed"
	ActivityOrderPlaced       = "order_placed"
	ActivityPaymentSuccess    = "payment_success"
	ActivityPaymentFailed     = "payment_failed"
	ActivityCategoryView      = "category_view"
	ActivityFilterApplied     = "filter_applied"
	ActivitySortApplied       = "sort_applied"
	ActivityReviewSubmitted   = "review_submitted"
	ActivityNewsletterSubscribe = "newsletter_subscribe"
	ActivityChatStarted       = "chat_started"
	ActivityChatMessage       = "chat_message"
	ActivityVideoPlayed       = "video_played"
	ActivityImageViewed       = "image_viewed"
	ActivityDownload          = "download"
	ActivityShare             = "share"
	ActivityError             = "error"
)

// UserActivitySummary represents aggregated user activity analytics
type UserActivitySummary struct {
	UserID              primitive.ObjectID `json:"userId"`
	TotalActivities     int64              `json:"totalActivities"`
	PageViews           int64              `json:"pageViews"`
	ProductViews        int64              `json:"productViews"`
	CartAdditions       int64              `json:"cartAdditions"`
	Searches            int64              `json:"searches"`
	Orders              int64              `json:"orders"`
	TotalSpent          float64            `json:"totalSpent"`
	AverageSessionTime  float64            `json:"avgSessionTime"`      // Minutes
	LastActivity        time.Time          `json:"lastActivity"`
	MostViewedProducts  []ProductViewCount `json:"mostViewedProducts"`
	MostViewedCategories []CategoryViewCount `json:"mostViewedCategories"`
	DeviceBreakdown     map[string]int     `json:"deviceBreakdown"`
}

// ProductViewCount represents product view statistics
type ProductViewCount struct {
	ProductID   primitive.ObjectID `json:"productId"`
	ProductName string             `json:"productName"`
	ViewCount   int                `json:"viewCount"`
}

// CategoryViewCount represents category view statistics
type CategoryViewCount struct {
	CategoryID   primitive.ObjectID `json:"categoryId"`
	CategoryName string             `json:"categoryName"`
	ViewCount    int                `json:"viewCount"`
}

// SessionAnalytics represents session-level analytics
type SessionAnalytics struct {
	SessionID       string             `json:"sessionId"`
	UserID          primitive.ObjectID `json:"userId,omitempty"`
	StartTime       time.Time          `json:"startTime"`
	EndTime         time.Time          `json:"endTime"`
	Duration        int                `json:"duration"`        // Seconds
	PageViews       int                `json:"pageViews"`
	ProductViews    int                `json:"productViews"`
	AddToCartCount  int                `json:"addToCartCount"`
	Converted       bool               `json:"converted"`       // Made a purchase
	DeviceType      string             `json:"deviceType"`
	EntryPage       string             `json:"entryPage"`
	ExitPage        string             `json:"exitPage"`
}

// ActivityFilter represents filters for querying activities
type ActivityFilter struct {
	UserID        primitive.ObjectID   `json:"userId,omitempty"`
	SessionID     string               `json:"sessionId,omitempty"`
	ActivityTypes []string             `json:"activityTypes,omitempty"`
	ProductID     primitive.ObjectID   `json:"productId,omitempty"`
	CategoryID    primitive.ObjectID   `json:"categoryId,omitempty"`
	FromDate      time.Time            `json:"fromDate,omitempty"`
	ToDate        time.Time            `json:"toDate,omitempty"`
	DeviceType    string               `json:"deviceType,omitempty"`
	Limit         int                  `json:"limit,omitempty"`
	Skip          int                  `json:"skip,omitempty"`
}

// RecentlyViewedProduct represents a product in user's recently viewed list
type RecentlyViewedProduct struct {
	ProductID   primitive.ObjectID `json:"productId"`
	ProductName string             `json:"productName"`
	ProductImage string            `json:"productImage"`
	Price       float64            `json:"price"`
	ViewedAt    time.Time          `json:"viewedAt"`
}

// ConversionFunnel represents the conversion funnel steps
type ConversionFunnel struct {
	TotalVisitors       int64   `json:"totalVisitors"`
	ProductViewers      int64   `json:"productViewers"`
	CartAdders          int64   `json:"cartAdders"`
	CheckoutStarters    int64   `json:"checkoutStarters"`
	Purchasers          int64   `json:"purchasers"`
	VisitorToProductRate float64 `json:"visitorToProductRate"`
	ProductToCartRate   float64 `json:"productToCartRate"`
	CartToCheckoutRate  float64 `json:"cartToCheckoutRate"`
	CheckoutToPurchaseRate float64 `json:"checkoutToPurchaseRate"`
	OverallConversionRate float64 `json:"overallConversionRate"`
}
