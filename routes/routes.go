package routes

import (
	"net/http"

	"github.com/gorilla/mux"

	"backEnd/handlers"
	"backEnd/middlewares"
)

func NewRouter() *mux.Router {
	router := mux.NewRouter().StrictSlash(true)

	// Group your API endpoints under /api
	api := router.PathPrefix("/api").Subrouter()

	// Health check endpoint
	api.HandleFunc("/health", handlers.HealthCheck).Methods(http.MethodGet)

	// Public User Auth routes
	api.HandleFunc("/users/register", handlers.Register).Methods(http.MethodPost)
	api.HandleFunc("/users/login", handlers.Login).Methods(http.MethodPost)

	// Authenticated User routes
	userAuthRouter := api.PathPrefix("/users").Subrouter()
	userAuthRouter.Use(middlewares.AuthMiddleware)
	userAuthRouter.HandleFunc("/logout", handlers.Logout).Methods(http.MethodPost)
	userAuthRouter.HandleFunc("/profile", handlers.GetProfile).Methods(http.MethodGet)
	userAuthRouter.HandleFunc("/profile", handlers.UpdateProfile).Methods(http.MethodPut)
	// Address Management for authenticated user
	userAuthRouter.HandleFunc("/addresses", handlers.GetUserAddresses).
		Methods(http.MethodGet)
	userAuthRouter.HandleFunc("/addresses", handlers.AddUserAddress).
		Methods(http.MethodPost)
	userAuthRouter.HandleFunc("/addresses/{addressIndex}", handlers.UpdateUserAddress).
		Methods(http.MethodPut)
	userAuthRouter.HandleFunc("/addresses/{addressIndex}", handlers.DeleteUserAddress).
		Methods(http.MethodDelete)

	// Product Catalog endpoints
	api.HandleFunc("/products", handlers.ListProducts).Methods(http.MethodGet)
	api.HandleFunc("/products/{id}", handlers.GetProduct).Methods(http.MethodGet)
	api.HandleFunc("/products/search", handlers.SearchProducts).Methods(http.MethodGet)
	api.HandleFunc("/products/recommendations", handlers.ProductRecommendations).
		Methods(http.MethodGet)

	// **Admin Product Management**
	adminRouter := api.PathPrefix("/admin").Subrouter()
	adminRouter.Use(middlewares.AdminAuthMiddleware) // Assuming an admin auth middleware

	// Discount Management Routes (Admin)
	adminRouter.HandleFunc("/discounts", handlers.CreateDiscount).Methods("POST")
	adminRouter.HandleFunc("/discounts", handlers.GetAllDiscounts).Methods("GET")
	adminRouter.HandleFunc("/discounts/{id}", handlers.GetDiscountByID).Methods("GET")
	adminRouter.HandleFunc("/discounts/{id}", handlers.UpdateDiscount).Methods("PUT")
	adminRouter.HandleFunc("/discounts/{id}", handlers.DeleteDiscount).Methods("DELETE")

	// Product Management Routes (Admin)
	adminRouter.HandleFunc("/products", handlers.AddProduct).Methods("POST")
	adminRouter.HandleFunc("/products/{id}", handlers.UpdateProduct).Methods("PUT")
	adminRouter.HandleFunc("/products/{id}", handlers.DeleteProduct).Methods("DELETE")

	// Admin User Management
	adminRouter.HandleFunc("/users", handlers.ListUsers).Methods("GET")
	adminRouter.HandleFunc("/users/{userId}", handlers.GetUserByID).Methods("GET")
	adminRouter.HandleFunc("/users/{userId}/role", handlers.UpdateUserRole).Methods("PUT")
	adminRouter.HandleFunc("/users/{userId}", handlers.DeleteUser).
		Methods("DELETE")
		// Soft delete

	// Admin Order Management
	adminRouter.HandleFunc("/orders", handlers.GetAllOrders).Methods(http.MethodGet)
	adminRouter.HandleFunc("/orders/recent", handlers.GetRecentOrders).Methods(http.MethodGet)
	adminRouter.HandleFunc("/orders/{orderId}", handlers.UpdateOrderStatusAdmin).Methods(http.MethodPut)
	adminRouter.HandleFunc("/orders/{orderId}", handlers.DeleteOrder).Methods("DELETE")

	// Admin Cart Management
	adminRouter.HandleFunc("/carts/{cartId}", handlers.DeleteCart).
		Methods("DELETE")
		// Soft delete

	// Categories Management (Admin)
	adminRouter.HandleFunc("/categories", handlers.CreateCategory).
		Methods(http.MethodPost)
		// Moved to admin router

	// Public Product Routes
	api.HandleFunc("/products", handlers.ListProducts).Methods("GET")

	// Categories & Navigation (Public Read-Only Access)
	api.HandleFunc("/categories", handlers.GetCategories).Methods(http.MethodGet)
	api.HandleFunc("/categories/{id}", handlers.GetCategoryByID).Methods(http.MethodGet)
	api.HandleFunc("/categories/{id}", handlers.UpdateCategory).Methods(http.MethodPut)
	api.HandleFunc("/categories/{id}", handlers.DeleteCategory).Methods(http.MethodDelete)
	api.HandleFunc("/categories/{id}/products", handlers.GetCategoryProducts).
		Methods(http.MethodGet)
	api.HandleFunc("/brands", handlers.GetBrands).Methods(http.MethodGet)
	api.HandleFunc("/brands", handlers.CreateBrand).Methods(http.MethodPost)
	api.HandleFunc("/brands/{id}", handlers.GetBrandByID).Methods(http.MethodGet)
	api.HandleFunc("/brands/{id}", handlers.UpdateBrand).Methods(http.MethodPut)
	api.HandleFunc("/brands/{id}", handlers.DeleteBrand).Methods(http.MethodDelete)
	api.HandleFunc("/categories/homepage", handlers.GetHomepageCategories).
		Methods(http.MethodGet)

	// Promotions & Banners
	api.HandleFunc("/promotions/home", handlers.GetHomePromotions).Methods(http.MethodGet)
	api.HandleFunc("/promotions/{campaignId}", handlers.GetPromotionByID).
		Methods(http.MethodGet)

	// --- Authenticated Cart Routes ---
	cartRouter := api.PathPrefix("/cart").Subrouter()
	cartRouter.Use(middlewares.AuthMiddleware)
	cartRouter.HandleFunc("", handlers.GetCart).
		Methods(http.MethodGet)
		// GET /api/cart
	cartRouter.HandleFunc("", handlers.CreateOrReplaceCart).
		Methods(http.MethodPost)
		// POST /api/cart - Used by frontend to sync local cart on login (creates a new cart, deactivates old ones).
	cartRouter.HandleFunc("", handlers.ClearUserCart).
		Methods(http.MethodDelete)
		// DELETE /api/cart - Used to clear user's entire cart

	// Route for adding/updating a single item to an existing cart
	cartRouter.HandleFunc("/item", handlers.AddItemToExistingCart).
		Methods(http.MethodPost)
		// POST /api/cart/item - Used by frontend addItem to add/update a single item in an existing cart.

	cartRouter.HandleFunc("/item", handlers.RemoveFromCart).
		Methods(http.MethodDelete)
		// DELETE /api/cart/item
	cartRouter.HandleFunc("/item", handlers.UpdateCart).
		Methods(http.MethodPut)
		// PUT /api/cart/item

	// Checkout & Orders (Authenticated)
	// TODO: GetOrder needs fine-grained auth (user owns order or is admin)
	api.Handle("/checkout", middlewares.AuthMiddleware(http.HandlerFunc(handlers.Checkout))).
		Methods(http.MethodPost)

	// User's own orders - uses AuthMiddleware
	userOrderRouter := api.PathPrefix("/orders").
		Subrouter()
	userOrderRouter.Use(middlewares.AuthMiddleware)
	userOrderRouter.HandleFunc("", handlers.GetUserOrders).Methods(http.MethodGet)

	// Specific order by ID - also requires auth, now handled by AuthMiddleware
	// This route is now part of a subrouter that can have general AuthMiddleware.
	// The GetOrder handler itself performs the fine-grained check (owner or admin).
	orderAuthRouter := api.PathPrefix("/orders").Subrouter()
	orderAuthRouter.Use(middlewares.AuthMiddleware) // Apply general auth here
	orderAuthRouter.HandleFunc("/{orderId}", handlers.GetOrder).Methods(http.MethodGet)

	// Wishlist
	api.HandleFunc("/wishlist", handlers.GetWishlist).Methods(http.MethodGet)
	api.HandleFunc("/wishlist", handlers.AddToWishlist).Methods(http.MethodPost)
	api.HandleFunc("/wishlist/{itemId}", handlers.RemoveFromWishlist).
		Methods(http.MethodDelete)

	// Search & Autocomplete
	api.HandleFunc("/search/suggestions", handlers.SearchSuggestions).
		Methods(http.MethodGet)
	api.HandleFunc("/search/history", handlers.SearchHistory).Methods(http.MethodGet)

	// --- Reviews & Ratings ---
	// Publicly get reviews for a product
	api.HandleFunc("/products/{productId}/reviews", handlers.GetReviews).
		Methods(http.MethodGet)

	// Add a review - Requires Authentication
	// Note: Path is /products/{productId}/reviews, but reviewId is not part of this path for creation
	api.Handle("/products/{productId}/reviews", middlewares.AuthMiddleware(http.HandlerFunc(handlers.AddReview))).
		Methods(http.MethodPost).
		Name("AddReviewForProduct")

	// Authenticated routes for updating/deleting specific reviews by their ID
	reviewRouter := api.PathPrefix("/reviews").Subrouter()
	reviewRouter.Use(
		middlewares.AuthMiddleware,
	) // General authentication for these review actions

	// Update a specific review by its ID (user must be owner or admin)
	reviewRouter.HandleFunc("/{reviewId}", handlers.UpdateReview).Methods(http.MethodPut)
	// Delete a specific review by its ID (user must be owner or admin)
	reviewRouter.HandleFunc("/{reviewId}", handlers.DeleteReview).
		Methods(http.MethodDelete)

	// Newsletter & Analytics
	api.HandleFunc("/newsletter/subscribe", handlers.SubscribeNewsletter).
		Methods(http.MethodPost)
	api.HandleFunc("/analytics/track", handlers.TrackAnalytics).Methods(http.MethodPost)

	// Pages & Footer
	api.HandleFunc("/pages/{slug}", handlers.GetPage).Methods(http.MethodGet)
	api.HandleFunc("/footer", handlers.GetFooter).Methods(http.MethodGet)

	// Discount Coupon Routes
	api.HandleFunc("/discounts", handlers.CreateDiscount).Methods(http.MethodPost)
	api.HandleFunc("/discounts", handlers.GetAllDiscounts).Methods(http.MethodGet)
	api.HandleFunc("/discounts/{id}", handlers.GetDiscountByID).Methods(http.MethodGet)
	api.HandleFunc("/discounts/code/{code}", handlers.GetDiscountByCode).
		Methods(http.MethodGet)
	api.HandleFunc("/discounts/{id}", handlers.UpdateDiscount).Methods(http.MethodPut)
	api.HandleFunc("/discounts/{id}", handlers.DeleteDiscount).Methods(http.MethodDelete)

	// Admin Dashboard Statistics
	adminRouter.HandleFunc("/dashboard-stats", handlers.DashboardStatsHandler).Methods("GET")

	// --- Blog Post Routes ---
	// Public blog routes (no authentication required)
	api.HandleFunc("/blog-posts", handlers.GetBlogPosts).Methods(http.MethodGet)
	api.HandleFunc("/blog-posts/{slug}", handlers.GetBlogPostBySlug).Methods(http.MethodGet)
	api.HandleFunc("/blog/categories", handlers.GetBlogCategories).Methods(http.MethodGet)
	api.HandleFunc("/blog/tags", handlers.GetBlogTags).Methods(http.MethodGet)

	// Admin blog post management routes
	adminRouter.HandleFunc("/blog-posts", handlers.GetAllBlogPosts).Methods(http.MethodGet)
	adminRouter.HandleFunc("/blog-posts", handlers.CreateBlogPost).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}", handlers.UpdateBlogPost).Methods(http.MethodPut)
	adminRouter.HandleFunc("/blog-posts/{id}", handlers.DeleteBlogPost).Methods(http.MethodDelete)

	return router
}
