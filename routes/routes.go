package routes

import (
	"log"
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

	// Neshan Map API proxy (public, no auth — service key stays server-side)
	api.HandleFunc("/neshan/reverse", handlers.NeshanReverseGeocode).Methods(http.MethodGet)
	api.HandleFunc("/neshan/search", handlers.NeshanSearchAddress).Methods(http.MethodGet)
	api.HandleFunc("/neshan/geocode", handlers.NeshanGeocode).Methods(http.MethodGet)

	// Public User Auth routes
	api.HandleFunc("/users/register", handlers.Register).Methods(http.MethodPost)
	api.HandleFunc("/users/login", handlers.Login).Methods(http.MethodPost)
	api.HandleFunc("/users/refresh", handlers.RefreshToken).Methods(http.MethodPost)
	api.HandleFunc("/users/check-phone", handlers.CheckPhone).Methods(http.MethodPost)
	api.HandleFunc("/users/login-sms", handlers.LoginViaSMS).Methods(http.MethodPost)

	// OTP-based signup routes
	api.HandleFunc("/auth/signup/send-otp", handlers.SendSignupOTP).Methods(http.MethodPost)
	api.HandleFunc("/auth/signup/verify-otp", handlers.VerifySignupOTP).Methods(http.MethodPost)
	api.HandleFunc("/auth/signup/resend-otp", handlers.ResendSignupOTP).Methods(http.MethodPost)

	// Forgot password routes (OTP-based)
	api.HandleFunc("/auth/forgot-password/send-otp", handlers.SendForgotPasswordOTP).Methods(http.MethodPost)
	api.HandleFunc("/auth/forgot-password/reset", handlers.ResetPasswordWithOTP).Methods(http.MethodPost)

	// Login OTP routes
	api.HandleFunc("/auth/send-otp", handlers.SendLoginOTP).Methods(http.MethodPost)
	api.HandleFunc("/auth/check-otp", handlers.VerifyLoginOTP).Methods(http.MethodPost)

	// Authenticated User routes
	userAuthRouter := api.PathPrefix("/users").Subrouter()
	userAuthRouter.Use(middlewares.AuthMiddleware)
	userAuthRouter.HandleFunc("/logout", handlers.Logout).Methods(http.MethodPost)
	userAuthRouter.HandleFunc("/profile", handlers.GetProfile).Methods(http.MethodGet)
	userAuthRouter.HandleFunc("/profile", handlers.UpdateProfile).Methods(http.MethodPut)
	userAuthRouter.HandleFunc("/password", handlers.ChangePassword).Methods(http.MethodPut)
	// Mobile app activity tracking
	userAuthRouter.HandleFunc("/app-activity", handlers.RecordAppActivity).Methods(http.MethodPost)
	// User promotions
	userAuthRouter.HandleFunc("/promotions", handlers.GetUserPromotions).Methods(http.MethodGet)
	userAuthRouter.HandleFunc("/vouchers", handlers.GetUserVouchers).Methods(http.MethodGet)
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
	api.HandleFunc("/products/smart-recommendations", handlers.EnhancedProductRecommendations).
		Methods(http.MethodGet)
	api.HandleFunc("/products/collection/{collectionValue}", handlers.GetProductsByCollection).
		Methods(http.MethodGet)

	// AI-Powered Search and Chat endpoints
	api.HandleFunc("/search/smart", handlers.SmartSearch).Methods(http.MethodPost)
	api.HandleFunc("/search/suggestions/smart", handlers.GetSearchSuggestions).Methods(http.MethodGet)
	api.HandleFunc("/chat/recommend", handlers.ChatRecommendation).Methods(http.MethodPost)
	api.HandleFunc("/chat/support", handlers.ChatSupport).Methods(http.MethodPost)

	// Virtual Try-On endpoints (authenticated)
	tryonRouter := api.PathPrefix("/tryon").Subrouter()
	tryonRouter.Use(middlewares.AuthMiddleware)
	tryonRouter.HandleFunc("/generate", handlers.VirtualTryOn).Methods(http.MethodPost)
	tryonRouter.HandleFunc("/status", handlers.VirtualTryOnStatus).Methods(http.MethodGet)
	tryonRouter.HandleFunc("/status-stream", handlers.VirtualTryOnStatusStream).Methods(http.MethodGet)
	tryonRouter.HandleFunc("/negotiate", handlers.NegotiateCoupon).Methods(http.MethodPost)
	tryonRouter.HandleFunc("/negotiate-stream", handlers.NegotiateCouponStream).Methods(http.MethodPost)
	tryonRouter.HandleFunc("/apply-negotiated-coupon", handlers.ApplyNegotiatedCoupon).Methods(http.MethodPost)

	// Persisted try-on history + chat sessions
	tryonRouter.HandleFunc("/history", handlers.ListUserTryons).Methods(http.MethodGet)
	tryonRouter.HandleFunc("/sessions/messages", handlers.AppendTryonMessages).Methods(http.MethodPost)
	tryonRouter.HandleFunc("/sessions", handlers.ListTryonSessions).Methods(http.MethodGet)
	tryonRouter.HandleFunc("/sessions/{chatId}", handlers.GetTryonSession).Methods(http.MethodGet)
	tryonRouter.HandleFunc("/sessions/{chatId}", handlers.DeleteTryonSession).Methods(http.MethodDelete)
	tryonRouter.HandleFunc("/link", handlers.LinkTryon).Methods(http.MethodPost)
	tryonRouter.HandleFunc("/{tryonId}", handlers.GetTryonByID).Methods(http.MethodGet)

	// Chat Management & History endpoints
	api.HandleFunc("/chat/save", handlers.SaveChatMessage).Methods(http.MethodPost)
	api.HandleFunc("/chat/history/{chatId}", handlers.GetChatHistory).Methods(http.MethodGet)
	api.HandleFunc("/chat/sessions", handlers.ListUserChats).Methods(http.MethodGet)
	api.HandleFunc("/chat/search", handlers.SearchChats).Methods(http.MethodPost)
	api.HandleFunc("/chat/link-to-user", handlers.LinkChatToUser).Methods(http.MethodPost)
	api.HandleFunc("/chat/{chatId}", handlers.DeleteChat).Methods(http.MethodDelete)
	api.HandleFunc("/chat/{chatId}/archive", handlers.ArchiveChat).Methods(http.MethodPut)
	api.HandleFunc("/chat/{chatId}/click", handlers.TrackProductClick).Methods(http.MethodPost)
	api.HandleFunc("/chat/{chatId}/conversion", handlers.TrackConversion).Methods(http.MethodPost)

	// Support ticket endpoints (authenticated users)
	ticketRouter := api.PathPrefix("/tickets").Subrouter()
	ticketRouter.Use(middlewares.AuthMiddleware)
	ticketRouter.HandleFunc("", handlers.GetUserTickets).Methods(http.MethodGet)
	ticketRouter.HandleFunc("", handlers.CreateTicket).Methods(http.MethodPost)
	ticketRouter.HandleFunc("/{ticketId}", handlers.GetTicketByID).Methods(http.MethodGet)
	ticketRouter.HandleFunc("/{ticketId}/messages", handlers.AddTicketMessage).Methods(http.MethodPost)

	// **Admin Product Management**
	adminRouter := api.PathPrefix("/admin").Subrouter()
	adminRouter.Use(middlewares.AdminAuthMiddleware) // Assuming an admin auth middleware

	// AI Metadata Generation Routes (Admin)
	aiMetadataHandler, err := handlers.NewAIMetadataHandler()
	if err != nil {
		// Log error but don't fail - AI features are optional
		log.Printf("Warning: AI metadata handler initialization failed: %v", err)
	} else {
		adminRouter.HandleFunc("/ai/generate-metadata", aiMetadataHandler.GenerateProductMetadata).Methods("POST")
		adminRouter.HandleFunc("/ai/models", aiMetadataHandler.GetAvailableModels).Methods("GET")
		adminRouter.HandleFunc("/ai/field-descriptions", aiMetadataHandler.GetFieldDescriptions).Methods("GET")
	}

	// Virtual try-on AI chat inspection (Admin)
	adminRouter.HandleFunc("/ai/tryon-chats", handlers.ListAdminTryonChats).Methods(http.MethodGet)
	adminRouter.HandleFunc("/ai/tryon-chats/{chatId}", handlers.GetAdminTryonChat).Methods(http.MethodGet)

	// Unified admin voucher/coupon listing (discounts + negotiated_coupons)
	adminRouter.HandleFunc("/vouchers", handlers.GetAdminVouchers).Methods("GET")

	// Discount Management Routes (Admin)
	adminRouter.HandleFunc("/discounts", handlers.CreateDiscount).Methods("POST")
	adminRouter.HandleFunc("/discounts", handlers.GetAllDiscounts).Methods("GET")
	adminRouter.HandleFunc("/discounts/{id}", handlers.GetDiscountByID).Methods("GET")
	adminRouter.HandleFunc("/discounts/{id}", handlers.UpdateDiscount).Methods("PUT")
	adminRouter.HandleFunc("/discounts/{id}", handlers.DeleteDiscount).Methods("DELETE")

	// Product Management Routes (Admin)
	adminRouter.HandleFunc("/products", handlers.AdminListProducts).Methods("GET")
	adminRouter.HandleFunc("/products", handlers.AddProduct).Methods("POST")
	adminRouter.HandleFunc("/products/{id}", handlers.UpdateProduct).Methods("PUT")
	adminRouter.HandleFunc("/products/{id}", handlers.DeleteProduct).Methods("DELETE")

	// Admin User Management
	adminRouter.HandleFunc("/users", handlers.ListUsers).Methods("GET")
	adminRouter.HandleFunc("/users/stats", handlers.GetUserTargetingStats).Methods("GET")
	adminRouter.HandleFunc("/users/filter", handlers.FilterUsers).Methods("POST")
	adminRouter.HandleFunc("/users/filter/count", handlers.GetFilteredUserCount).Methods("POST")
	adminRouter.HandleFunc("/users/{userId}", handlers.GetUserByID).Methods("GET")
	adminRouter.HandleFunc("/users/{userId}/role", handlers.UpdateUserRole).Methods("PUT")
	adminRouter.HandleFunc("/users/{userId}", handlers.DeleteUser).
		Methods("DELETE")
		// Soft delete

	// Admin review moderation
	adminRouter.HandleFunc("/reviews/{reviewId}/status", handlers.UpdateReviewStatusAdmin).Methods(http.MethodPut)
	adminRouter.HandleFunc("/reviews", handlers.AdminListReviews).Methods(http.MethodGet)

	// Admin Order Management
	adminRouter.HandleFunc("/orders/stats", handlers.GetOrderStats).Methods(http.MethodGet)
	adminRouter.HandleFunc("/orders", handlers.GetAllOrders).Methods(http.MethodGet)
	adminRouter.HandleFunc("/orders/recent", handlers.GetRecentOrders).Methods(http.MethodGet)
	adminRouter.HandleFunc("/orders/{orderId}", handlers.GetAdminOrderById).Methods(http.MethodGet)
	adminRouter.HandleFunc("/orders/{orderId}", handlers.UpdateOrderStatusAdmin).Methods(http.MethodPut)
	adminRouter.HandleFunc("/orders/{orderId}", handlers.DeleteOrder).Methods("DELETE")
	adminRouter.HandleFunc("/orders/{orderId}/notes", handlers.AddOrderNote).Methods(http.MethodPost)

	// Admin Ticket Management
	adminRouter.HandleFunc("/tickets", handlers.AdminListTickets).Methods(http.MethodGet)
	adminRouter.HandleFunc("/tickets/{ticketId}/status", handlers.AdminUpdateTicketStatus).Methods(http.MethodPut)

	// Admin Cart Management
	adminRouter.HandleFunc("/carts", handlers.AdminListCarts).Methods(http.MethodGet)
	adminRouter.HandleFunc("/carts/{cartId}", handlers.DeleteCart).
		Methods("DELETE")
		// Soft delete
	adminRouter.HandleFunc("/carts/send-recovery-sms", handlers.SendCartRecoverySMS).Methods(http.MethodPost)

	// Categories Management (Admin)
	adminRouter.HandleFunc("/categories", handlers.CreateCategory).
		Methods(http.MethodPost)
		// Moved to admin router

	// Available category avatars (Admin) — dynamic list of files in uploads/avatars/categories/
	adminRouter.HandleFunc("/avatars", handlers.ListAvatars).Methods(http.MethodGet)

	// Vocabulary Mappings (Public for frontend dropdowns)
	api.HandleFunc("/vocabulary-mappings", handlers.GetVocabularyMappings).Methods(http.MethodGet)

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

	// Slider routes
	api.HandleFunc("/sliders", handlers.GetSliders).Methods(http.MethodGet)
	api.HandleFunc("/sliders/{id}", handlers.GetSliderByID).Methods(http.MethodGet)
	adminRouter.HandleFunc("/sliders", handlers.CreateSlider).Methods(http.MethodPost)
	adminRouter.HandleFunc("/sliders/{id}", handlers.UpdateSlider).Methods(http.MethodPut)
	adminRouter.HandleFunc("/sliders/{id}", handlers.DeleteSlider).Methods(http.MethodDelete)

	// Hero Image routes
	api.HandleFunc("/hero-images", handlers.GetHeroImages).Methods(http.MethodGet)
	adminRouter.HandleFunc("/hero-images", handlers.GetAllHeroImages).Methods(http.MethodGet)
	adminRouter.HandleFunc("/hero-images", handlers.CreateHeroImage).Methods(http.MethodPost)
	adminRouter.HandleFunc("/hero-images/{id}", handlers.GetHeroImageByID).Methods(http.MethodGet)
	adminRouter.HandleFunc("/hero-images/{id}", handlers.UpdateHeroImage).Methods(http.MethodPut)
	adminRouter.HandleFunc("/hero-images/{id}", handlers.DeleteHeroImage).Methods(http.MethodDelete)

	// Admin FAQ Management
	adminRouter.HandleFunc("/faqs", handlers.AdminListFaqs).Methods(http.MethodGet)
	adminRouter.HandleFunc("/faqs", handlers.CreateFaq).Methods(http.MethodPost)
	adminRouter.HandleFunc("/faqs/{id}", handlers.UpdateFaq).Methods(http.MethodPut)
	adminRouter.HandleFunc("/faqs/{id}", handlers.DeleteFaq).Methods(http.MethodDelete)

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
	orderAuthRouter.HandleFunc("/{orderId}/confirm-payment", handlers.ConfirmPayment).Methods(http.MethodPost)

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

	// User Activity Tracking (Public - works for both anonymous and authenticated users)
	api.HandleFunc("/activity/track", handlers.TrackActivity).Methods(http.MethodPost)
	api.HandleFunc("/activity/track/batch", handlers.TrackBatchActivities).Methods(http.MethodPost)

	// User Activity Retrieval (Authenticated users only)
	activityRouter := api.PathPrefix("/activity").Subrouter()
	activityRouter.Use(middlewares.AuthMiddleware) // Requires authentication
	activityRouter.HandleFunc("/user", handlers.GetUserActivities).Methods(http.MethodGet)
	activityRouter.HandleFunc("/recently-viewed", handlers.GetRecentlyViewed).Methods(http.MethodGet)
	activityRouter.HandleFunc("/summary", handlers.GetUserActivitySummary).Methods(http.MethodGet)
	activityRouter.HandleFunc("/session/{sessionId}", handlers.GetSessionAnalytics).Methods(http.MethodGet)

	// Pages, Footer & FAQs
	api.HandleFunc("/pages/{slug}", handlers.GetPage).Methods(http.MethodGet)
	api.HandleFunc("/footer", handlers.GetFooter).Methods(http.MethodGet)
	api.HandleFunc("/faqs", handlers.GetFaqs).Methods(http.MethodGet)

	// Discount Coupon Routes
	api.HandleFunc("/discounts", handlers.CreateDiscount).Methods(http.MethodPost)
	api.HandleFunc("/discounts", handlers.GetAllDiscounts).Methods(http.MethodGet)
	api.HandleFunc("/discounts/{id}", handlers.GetDiscountByID).Methods(http.MethodGet)
	api.HandleFunc("/discounts/code/{code}", handlers.GetDiscountByCode).
		Methods(http.MethodGet)
	api.HandleFunc("/discounts/{id}", handlers.UpdateDiscount).Methods(http.MethodPut)
	api.HandleFunc("/discounts/{id}", handlers.DeleteDiscount).Methods(http.MethodDelete)
	api.HandleFunc("/discounts/activate", handlers.ActivateDiscount).Methods(http.MethodPost)
	api.HandleFunc("/discounts/deactivate", handlers.DeactivateDiscount).Methods(http.MethodPost)

	// Generic negotiated/cart-recovery coupon application (authenticated).
	// Reuses the same handler as the tryon-specific route below — it already
	// validates ownership, expiry, and required-product/color matching purely
	// from the JWT user + request body, with no tryon-specific dependency.
	couponsRouter := api.PathPrefix("/coupons").Subrouter()
	couponsRouter.Use(middlewares.AuthMiddleware)
	couponsRouter.HandleFunc("/apply", handlers.ApplyNegotiatedCoupon).Methods(http.MethodPost)

	// Admin Dashboard Statistics
	adminRouter.HandleFunc("/dashboard-stats", handlers.DashboardStatsHandler).Methods("GET")

	// Admin Chat Analytics & Export
	adminRouter.HandleFunc("/chat/analytics", handlers.GetChatAnalytics).Methods(http.MethodGet)
	adminRouter.HandleFunc("/chat/export", handlers.ExportChats).Methods(http.MethodPost)

	// Admin User Activity Analytics
	adminRouter.HandleFunc("/activity/funnel", handlers.GetConversionFunnel).Methods(http.MethodGet)
	adminRouter.HandleFunc("/activity/logs", handlers.GetAllActivities).Methods(http.MethodGet)

	// --- Blog Post Routes ---
	// Public blog routes (no authentication required)
	api.HandleFunc("/blog-posts", handlers.GetBlogPosts).Methods(http.MethodGet)
	api.HandleFunc("/blog-posts/{slug}", handlers.GetBlogPostBySlug).Methods(http.MethodGet)
	api.HandleFunc("/blog/categories", handlers.GetBlogCategoriesPublic).Methods(http.MethodGet)
	api.HandleFunc("/blog/categories/legacy", handlers.GetBlogCategories).Methods(http.MethodGet)
	api.HandleFunc("/blog/tags", handlers.GetBlogTags).Methods(http.MethodGet)

	// Admin blog post management routes
	adminRouter.HandleFunc("/blog-posts", handlers.GetAdminBlogPosts).Methods(http.MethodGet)

	// Admin blog category management routes
	adminRouter.HandleFunc("/blog-categories", handlers.GetAdminBlogCategories).Methods(http.MethodGet)
	adminRouter.HandleFunc("/blog-categories", handlers.CreateBlogCategory).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-categories/{id}", handlers.UpdateBlogCategory).Methods(http.MethodPut)
	adminRouter.HandleFunc("/blog-categories/{id}", handlers.DeleteBlogCategory).Methods(http.MethodDelete)
	adminRouter.HandleFunc("/blog-categories/{id}/hard", handlers.HardDeleteBlogCategory).Methods(http.MethodDelete)
	adminRouter.HandleFunc("/blog-categories/{id}/restore", handlers.RestoreBlogCategory).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-categories/recount", handlers.RecountBlogCategories).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/blocks", handlers.UpdateBlogPostBlocks).Methods(http.MethodPatch)
	adminRouter.HandleFunc("/blog-posts/{id}/product-blocks/search", handlers.SearchProductsForBlock).Methods(http.MethodGet)
	adminRouter.HandleFunc("/blog-posts/{id}/product-blocks/{order}/auto-match", handlers.AutoMatchProductBlock).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/product-blocks/{order}", handlers.SelectProductForBlock).Methods(http.MethodPatch)
	adminRouter.HandleFunc("/blog-posts/{id}/publish", handlers.PublishBlogPost).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/unpublish", handlers.UnpublishBlogPost).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/archive", handlers.ArchiveBlogPost).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/restore", handlers.RestoreBlogPost).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/media", handlers.UploadBlogMedia).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-posts/{id}/media/{mediaId}", handlers.DeleteBlogMedia).Methods(http.MethodDelete)

	// Admin pipeline run routes
	adminRouter.HandleFunc("/blog-runs", handlers.CreatePipelineRun).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-runs", handlers.GetPipelineRuns).Methods(http.MethodGet)
	adminRouter.HandleFunc("/blog-runs/{id}", handlers.GetPipelineRunByID).Methods(http.MethodGet)
	adminRouter.HandleFunc("/blog-runs/{id}", handlers.DeletePipelineRun).Methods(http.MethodDelete)
	adminRouter.HandleFunc("/blog-runs/{id}/approve", handlers.ApprovePipelineRun).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-runs/{id}/research", handlers.TriggerResearch).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-runs/{id}/write", handlers.TriggerWriting).Methods(http.MethodPost)
	adminRouter.HandleFunc("/blog-runs/{id}/prompts", handlers.TriggerPromptGeneration).Methods(http.MethodPost)

	// Fetch reviews written by a user (public)
	api.HandleFunc("/users/{userId}/reviews", handlers.GetUserReviews).Methods(http.MethodGet)

	// Payment Routes (Zibal Integration)
	paymentRouter := api.PathPrefix("/payment").Subrouter()
	paymentRouter.Use(middlewares.AuthMiddleware)
	paymentRouter.HandleFunc("/request", handlers.RequestPayment).Methods(http.MethodPost)
	paymentRouter.HandleFunc("/verify", handlers.VerifyPayment).Methods(http.MethodPost)
	paymentRouter.HandleFunc("/inquiry", handlers.InquiryPayment).Methods(http.MethodPost)
	paymentRouter.HandleFunc("/retry", handlers.RetryPayment).Methods(http.MethodPost)
	paymentRouter.HandleFunc("/snappay/eligibility", handlers.SnappPayEligibility).Methods(http.MethodGet)

	// Payment Callback (Public - no auth required)
	api.HandleFunc("/payment/callback", handlers.PaymentCallback).Methods(http.MethodGet)
	api.HandleFunc("/payment/digipay-callback", handlers.DigipayPaymentCallback).Methods(http.MethodGet, http.MethodPost)
	api.HandleFunc("/payment/snappay-callback", handlers.SnappPayCallback).Methods(http.MethodPost)

	// Snapppay update/cancel are irreversible provider operations and require
	// explicit confirmation in the request body.
	adminRouter.HandleFunc("/orders/{orderId}/payment/snappay/update", handlers.AdminUpdateSnappPay).Methods(http.MethodPost)
	adminRouter.HandleFunc("/orders/{orderId}/payment/snappay/cancel", handlers.AdminCancelSnappPay).Methods(http.MethodPost)

	return router
}
