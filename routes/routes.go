package routes

import (
	"github.com/gorilla/mux"
	"net/http"

	"backEnd/handlers"
)

func NewRouter() *mux.Router {
	router := mux.NewRouter().StrictSlash(true)

	// Group your API endpoints under /api
	api := router.PathPrefix("/api").Subrouter()

	// Auth routes
	api.HandleFunc("/users/register", handlers.Register).Methods(http.MethodPost)
	api.HandleFunc("/users/login", handlers.Login).Methods(http.MethodPost)
	api.HandleFunc("/users/logout", handlers.Logout).Methods(http.MethodPost)
	api.HandleFunc("/users/profile", handlers.GetProfile).Methods(http.MethodGet)
	api.HandleFunc("/users/profile", handlers.UpdateProfile).Methods(http.MethodPut)

	// Product Catalog endpoints
	api.HandleFunc("/products", handlers.ListProducts).Methods(http.MethodGet)
	api.HandleFunc("/products/{id}", handlers.GetProduct).Methods(http.MethodGet)
	api.HandleFunc("/products/search", handlers.SearchProducts).Methods(http.MethodGet)
	api.HandleFunc("/products/recommendations", handlers.ProductRecommendations).Methods(http.MethodGet)

	// **Admin Product Management**
	api.HandleFunc("/admin/products", handlers.AddProduct).Methods(http.MethodPost)

	// Categories & Navigation
	api.HandleFunc("/categories", handlers.GetCategories).Methods(http.MethodGet)
	api.HandleFunc("/categories/{id}/products", handlers.GetCategoryProducts).Methods(http.MethodGet)
	api.HandleFunc("/brands", handlers.GetBrands).Methods(http.MethodGet)
	api.HandleFunc("/categories/homepage", handlers.GetHomepageCategories).Methods(http.MethodGet)

	// Promotions & Banners
	api.HandleFunc("/promotions/home", handlers.GetHomePromotions).Methods(http.MethodGet)
	api.HandleFunc("/promotions/{campaignId}", handlers.GetPromotionByID).Methods(http.MethodGet)

	// Shopping Cart & Checkout
	api.HandleFunc("/cart", handlers.GetCart).Methods(http.MethodGet)
	api.HandleFunc("/cart", handlers.AddToCart).Methods(http.MethodPost)
	api.HandleFunc("/cart/{itemId}", handlers.RemoveFromCart).Methods(http.MethodDelete)
	api.HandleFunc("/checkout", handlers.Checkout).Methods(http.MethodPost)
	api.HandleFunc("/orders/{orderId}", handlers.GetOrder).Methods(http.MethodGet)

	// Wishlist
	api.HandleFunc("/wishlist", handlers.GetWishlist).Methods(http.MethodGet)
	api.HandleFunc("/wishlist", handlers.AddToWishlist).Methods(http.MethodPost)
	api.HandleFunc("/wishlist/{itemId}", handlers.RemoveFromWishlist).Methods(http.MethodDelete)

	// Search & Autocomplete
	api.HandleFunc("/search/suggestions", handlers.SearchSuggestions).Methods(http.MethodGet)
	api.HandleFunc("/search/history", handlers.SearchHistory).Methods(http.MethodGet)

	// Reviews & Ratings
	api.HandleFunc("/products/{id}/reviews", handlers.GetReviews).Methods(http.MethodGet)
	api.HandleFunc("/products/{id}/reviews", handlers.AddReview).Methods(http.MethodPost)

	// Newsletter & Analytics
	api.HandleFunc("/newsletter/subscribe", handlers.SubscribeNewsletter).Methods(http.MethodPost)
	api.HandleFunc("/analytics/track", handlers.TrackAnalytics).Methods(http.MethodPost)

	// Pages & Footer
	api.HandleFunc("/pages/{slug}", handlers.GetPage).Methods(http.MethodGet)
	api.HandleFunc("/footer", handlers.GetFooter).Methods(http.MethodGet)

	return router
}
