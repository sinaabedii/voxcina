package routes

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"

	"backEnd/handlers"
	"backEnd/middlewares"
)

// Names of the two /api/admin prefix routes. They identify which gate an admin
// endpoint sits behind — see TestStaffReachableAdminRoutes.
const (
	StaffPrefixRouteName = "adminPrefixStaff"
	AdminPrefixRouteName = "adminPrefixAdminOnly"
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

	// External service API (server-to-server).
	//
	// Authenticated by the X-API-Key header (middlewares.ServiceAuthMiddleware),
	// NOT by a user JWT: the bot backend is a confidential client that speaks
	// for its own platform users. Every route validates the request body's
	// provider against the authenticated service's provider.
	api.Handle("/auth/external/token", middlewares.ServiceAuthMiddleware("identity:exchange")(http.HandlerFunc(handlers.ExternalTokenExchange))).
		Methods(http.MethodPost)
	api.Handle("/auth/external/phone/contact", middlewares.ServiceAuthMiddleware("identity:bind_phone")(http.HandlerFunc(handlers.ExternalPhoneContact))).
		Methods(http.MethodPost)
	api.Handle("/auth/external/phone/send-otp", middlewares.ServiceAuthMiddleware("identity:bind_phone")(http.HandlerFunc(handlers.ExternalPhoneSendOTP))).
		Methods(http.MethodPost)
	api.Handle("/auth/external/phone/verify-otp", middlewares.ServiceAuthMiddleware("identity:bind_phone")(http.HandlerFunc(handlers.ExternalPhoneVerifyOTP))).
		Methods(http.MethodPost)
	api.Handle("/auth/external/link", middlewares.ServiceAuthMiddleware("identity:exchange")(http.HandlerFunc(handlers.ExternalLinkAccount))).
		Methods(http.MethodPost)

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
	// User's own return requests across all orders
	userAuthRouter.HandleFunc("/return-requests", handlers.ListUserReturnRequests).Methods(http.MethodGet)
	// Connected external accounts (bot/channel identities) + the single-use
	// code that lets a bot claim this account.
	userAuthRouter.HandleFunc("/link-code", handlers.CreateUserLinkCode).
		Methods(http.MethodPost)
	userAuthRouter.HandleFunc("/linked-accounts", handlers.ListLinkedAccounts).
		Methods(http.MethodGet)
	userAuthRouter.HandleFunc("/linked-accounts/{id}", handlers.UnlinkExternalIdentity).
		Methods(http.MethodDelete)
	// Address Management for authenticated user
	userAuthRouter.HandleFunc("/addresses", handlers.GetUserAddresses).
		Methods(http.MethodGet)
	userAuthRouter.HandleFunc("/addresses", handlers.AddUserAddress).
		Methods(http.MethodPost)
	userAuthRouter.HandleFunc("/addresses/{addressIndex}", handlers.UpdateUserAddress).
		Methods(http.MethodPut)
	userAuthRouter.HandleFunc("/addresses/{addressIndex}", handlers.DeleteUserAddress).
		Methods(http.MethodDelete)

	// Product Catalog endpoints.
	//
	// gorilla/mux matches in registration order, so every literal path under
	// /products must be registered BEFORE the /products/{id} wildcard —
	// otherwise {id} swallows it and the handler becomes unreachable.
	// routes_shadow_test.go guards this for the whole router.
	api.HandleFunc("/products", handlers.ListProducts).Methods(http.MethodGet)
	api.HandleFunc("/products/trending", handlers.GetTrendingProductVariants).Methods(http.MethodGet)
	api.HandleFunc("/products/search", handlers.SearchProducts).Methods(http.MethodGet)
	api.HandleFunc("/products/recommendations", handlers.ProductRecommendations).
		Methods(http.MethodGet)
	api.HandleFunc("/products/smart-recommendations", handlers.EnhancedProductRecommendations).
		Methods(http.MethodGet)
	api.HandleFunc("/products/collection/{collectionValue}", handlers.GetProductsByCollection).
		Methods(http.MethodGet)
	api.HandleFunc("/products/{id}", handlers.GetProduct).Methods(http.MethodGet)

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
	// Fitting-room chat with Voxa: styling answers and catalog recommendations.
	// Discount negotiation is NOT here — it belongs to the checkout page and
	// lives under /api/coupons (couponsRouter below).
	tryonRouter.HandleFunc("/chat-stream", handlers.TryOnChatStream).Methods(http.MethodPost)

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

	// **Admin back-office API**
	//
	// Two subrouters share the /api/admin prefix, and the split IS the
	// permission model:
	//
	//   staffRouter — reachable by the restricted "staff" role AND by admins.
	//                 Catalog and content only: products, categories, brands,
	//                 blogs, tickets.
	//   adminRouter — everything else. Admin only.
	//
	// staffRouter is registered first so its routes win the match; anything it
	// does not carry falls through to adminRouter, where a staff member is
	// rejected with 403. A new admin route is therefore admin-only by default —
	// it reaches staff only if someone moves it up here deliberately.
	//
	// gorilla/mux keeps walking when a subrouter matches the prefix but none of
	// its routes match, which is what makes the fallthrough work; the same
	// pattern already backs the two /orders subrouters below.
	// Seller (affiliate partner) panel.
	//
	// A separate prefix rather than a third /api/admin subrouter, because a
	// seller is not back office: every endpoint here is scoped to the caller's
	// own id, and nothing under /api/admin admits the role. Admins read the
	// same figures through /api/admin/sellers/{sellerId}.
	sellerRouter := api.PathPrefix("/seller").Subrouter()
	sellerRouter.Use(middlewares.SellerAuthMiddleware)
	sellerRouter.HandleFunc("/overview", handlers.GetSellerPanel).Methods(http.MethodGet)
	sellerRouter.HandleFunc("/vouchers", handlers.CreateSellerVoucher).Methods(http.MethodPost)

	// The two prefix routes are named so routes_staff_test.go can tell, for any
	// registered admin endpoint, which of the two gates it sits behind.
	staffRouter := api.PathPrefix("/admin").Name(StaffPrefixRouteName).Subrouter()
	staffRouter.Use(middlewares.StaffAuthMiddleware)

	adminRouter := api.PathPrefix("/admin").Name(AdminPrefixRouteName).Subrouter()
	adminRouter.Use(middlewares.AdminAuthMiddleware)

	// AI Metadata Generation Routes (admin + staff: part of the product editor)
	aiMetadataHandler, err := handlers.NewAIMetadataHandler()
	if err != nil {
		// Log error but don't fail - AI features are optional
		log.Printf("Warning: AI metadata handler initialization failed: %v", err)
	} else {
		staffRouter.HandleFunc("/ai/generate-metadata", aiMetadataHandler.GenerateProductMetadata).Methods("POST")
		staffRouter.HandleFunc("/ai/generate-variant-metadata", aiMetadataHandler.GenerateVariantMetadata).Methods("POST")
		staffRouter.HandleFunc("/ai/models", aiMetadataHandler.GetAvailableModels).Methods("GET")
		staffRouter.HandleFunc("/ai/field-descriptions", aiMetadataHandler.GetFieldDescriptions).Methods("GET")
	}

	// AI model settings shared by the chatbots and the try-on image generator (Admin)
	adminRouter.HandleFunc("/ai/settings", handlers.GetAISettings).Methods(http.MethodGet)
	adminRouter.HandleFunc("/ai/settings", handlers.UpdateAISettings).Methods(http.MethodPut)

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

	// Product Management Routes (admin + staff)
	staffRouter.HandleFunc("/products", handlers.AdminListProducts).Methods("GET")
	staffRouter.HandleFunc("/products", handlers.AddProduct).Methods("POST")
	staffRouter.HandleFunc("/products/{id}/cart-usage", handlers.GetProductCartUsage).Methods("GET")
	staffRouter.HandleFunc("/products/{id}", handlers.UpdateProduct).Methods("PUT")
	staffRouter.HandleFunc("/products/{id}", handlers.DeleteProduct).Methods("DELETE")

	// Seller (affiliate) reporting — sellers, their codes, and the statistics
	// for both. Admin only: the staff role has no business with commission.
	// "seller-vouchers" is a literal path and is registered before any
	// /sellers/{id} wildcard for the reason routes_shadow_test.go asserts.
	adminRouter.HandleFunc("/sellers", handlers.AdminListSellers).Methods(http.MethodGet)
	adminRouter.HandleFunc("/seller-vouchers", handlers.AdminListSellerVouchers).Methods(http.MethodGet)
	adminRouter.HandleFunc("/sellers/{sellerId}", handlers.AdminGetSeller).Methods(http.MethodGet)

	// Admin User Management
	adminRouter.HandleFunc("/users", handlers.ListUsers).Methods("GET")
	adminRouter.HandleFunc("/users/stats", handlers.GetUserTargetingStats).Methods("GET")
	adminRouter.HandleFunc("/users/filter", handlers.FilterUsers).Methods("POST")
	adminRouter.HandleFunc("/users/filter/count", handlers.GetFilteredUserCount).Methods("POST")
	adminRouter.HandleFunc("/users/{userId}", handlers.GetUserByID).Methods("GET")
	adminRouter.HandleFunc("/users/{userId}/role", handlers.UpdateUserRole).Methods("PUT")
	adminRouter.HandleFunc("/users/{userId}", handlers.UpdateUserAsAdmin).Methods("PUT")
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
	adminRouter.HandleFunc("/return-requests", handlers.AdminListReturnRequests).Methods(http.MethodGet)
	adminRouter.HandleFunc("/return-requests/{requestId}", handlers.AdminDecideReturnRequest).Methods(http.MethodPut)

	// Admin Careers Inbox (partnership requests + job applications)
	adminRouter.HandleFunc("/career-submissions", handlers.AdminListCareerSubmissions).Methods(http.MethodGet)
	adminRouter.HandleFunc("/career-submissions/{id}/resume", handlers.AdminDownloadCareerResume).Methods(http.MethodGet)
	adminRouter.HandleFunc("/career-submissions/{id}", handlers.AdminUpdateCareerSubmission).Methods(http.MethodPut)
	adminRouter.HandleFunc("/career-submissions/{id}", handlers.AdminDeleteCareerSubmission).Methods(http.MethodDelete)

	// Admin Job Postings (the open positions advertised on /careers)
	adminRouter.HandleFunc("/job-positions", handlers.AdminListJobPositions).Methods(http.MethodGet)
	adminRouter.HandleFunc("/job-positions", handlers.AdminCreateJobPosition).Methods(http.MethodPost)
	adminRouter.HandleFunc("/job-positions/{id}", handlers.AdminUpdateJobPosition).Methods(http.MethodPut)
	adminRouter.HandleFunc("/job-positions/{id}", handlers.AdminDeleteJobPosition).Methods(http.MethodDelete)

	// Admin-curated product collections (bundles of specific color variants)
	adminRouter.HandleFunc("/shop-collections", handlers.AdminListShopCollections).Methods(http.MethodGet)
	adminRouter.HandleFunc("/shop-collections", handlers.AdminCreateShopCollection).Methods(http.MethodPost)
	adminRouter.HandleFunc("/shop-collections/{id}", handlers.AdminGetShopCollection).Methods(http.MethodGet)
	adminRouter.HandleFunc("/shop-collections/{id}", handlers.AdminUpdateShopCollection).Methods(http.MethodPut)
	adminRouter.HandleFunc("/shop-collections/{id}", handlers.AdminDeleteShopCollection).Methods(http.MethodDelete)

	// External service management (bot/channel integrations): CRUD, key
	// rotation with a grace window, webhook test delivery, linked identities
	// and the config audit trail.
	adminRouter.HandleFunc("/external-services", handlers.AdminListExternalServices).Methods(http.MethodGet)
	adminRouter.HandleFunc("/external-services", handlers.AdminCreateExternalService).Methods(http.MethodPost)
	adminRouter.HandleFunc("/external-services/{id}", handlers.AdminGetExternalService).Methods(http.MethodGet)
	adminRouter.HandleFunc("/external-services/{id}", handlers.AdminUpdateExternalService).Methods(http.MethodPut)
	adminRouter.HandleFunc("/external-services/{id}", handlers.AdminDeleteExternalService).Methods(http.MethodDelete)
	adminRouter.HandleFunc("/external-services/{id}/rotate-key", handlers.AdminRotateExternalServiceKey).Methods(http.MethodPost)
	adminRouter.HandleFunc("/external-services/{id}/webhooks/test", handlers.AdminTestExternalServiceWebhook).Methods(http.MethodPost)
	adminRouter.HandleFunc("/external-services/{id}/identities", handlers.AdminListExternalServiceIdentities).Methods(http.MethodGet)
	adminRouter.HandleFunc("/external-services/{id}/audit", handlers.AdminGetExternalServiceAudit).Methods(http.MethodGet)

	// Public reads of the same curated collections (active only).
	api.HandleFunc("/shop-collections", handlers.ListShopCollections).Methods(http.MethodGet)
	api.HandleFunc("/shop-collections/{id}", handlers.GetShopCollection).Methods(http.MethodGet)

	// Ticket Management (admin + staff)
	staffRouter.HandleFunc("/tickets", handlers.AdminListTickets).Methods(http.MethodGet)
	staffRouter.HandleFunc("/tickets/{ticketId}/status", handlers.AdminUpdateTicketStatus).Methods(http.MethodPut)

	// Admin Cart Management
	adminRouter.HandleFunc("/carts", handlers.AdminListCarts).Methods(http.MethodGet)
	adminRouter.HandleFunc("/carts/{cartId}", handlers.DeleteCart).
		Methods("DELETE")
		// Soft delete
	adminRouter.HandleFunc("/carts/send-recovery-sms", handlers.SendCartRecoverySMS).Methods(http.MethodPost)

	// Categories Management (Admin + staff)
	staffRouter.HandleFunc("/categories", handlers.CreateCategory).
		Methods(http.MethodPost)

	// Available category avatars (admin + staff) — dynamic list of files in uploads/avatars/categories/
	staffRouter.HandleFunc("/avatars", handlers.ListAvatars).Methods(http.MethodGet)

	// Vocabulary Mappings (Public for frontend dropdowns)
	api.HandleFunc("/vocabulary-mappings", handlers.GetVocabularyMappings).Methods(http.MethodGet)

	// Categories & Navigation (Public Read-Only Access).
	// "homepage" is a literal path and must precede the /categories/{id}
	// wildcard, same ordering rule as the product routes above.
	api.HandleFunc("/categories", handlers.GetCategories).Methods(http.MethodGet)
	api.HandleFunc("/categories/homepage", handlers.GetHomepageCategories).
		Methods(http.MethodGet)
	api.HandleFunc("/categories/{id}", handlers.GetCategoryByID).Methods(http.MethodGet)
	api.HandleFunc("/categories/{id}/products", handlers.GetCategoryProducts).
		Methods(http.MethodGet)
	api.HandleFunc("/brands", handlers.GetBrands).Methods(http.MethodGet)
	api.HandleFunc("/brands/{id}", handlers.GetBrandByID).Methods(http.MethodGet)

	// Category & brand mutations are back-office only (admin + staff). They
	// previously sat on the public router with no middleware, so anyone could
	// rewrite or delete the catalog taxonomy; the admin dashboard already sent a
	// bearer token to them, so it only needed to be pointed at the /admin prefix.
	staffRouter.HandleFunc("/categories/{id}", handlers.UpdateCategory).Methods(http.MethodPut)
	staffRouter.HandleFunc("/categories/{id}", handlers.DeleteCategory).Methods(http.MethodDelete)
	staffRouter.HandleFunc("/brands", handlers.CreateBrand).Methods(http.MethodPost)
	staffRouter.HandleFunc("/brands/{id}", handlers.UpdateBrand).Methods(http.MethodPut)
	staffRouter.HandleFunc("/brands/{id}", handlers.DeleteBrand).Methods(http.MethodDelete)

	// Promotions & Banners
	api.HandleFunc("/promotions/home", handlers.GetHomePromotions).Methods(http.MethodGet)
	api.HandleFunc("/promotions/{campaignId}", handlers.GetPromotionByID).
		Methods(http.MethodGet)

	// Slider routes
	api.HandleFunc("/sliders", handlers.GetSliders).Methods(http.MethodGet)
	api.HandleFunc("/sliders/{id}", handlers.GetSliderByID).Methods(http.MethodGet)
	adminRouter.HandleFunc("/sliders", handlers.GetAllSliders).Methods(http.MethodGet)
	adminRouter.HandleFunc("/sliders", handlers.CreateSlider).Methods(http.MethodPost)
	// Registered before /sliders/{id} so "reorder" isn't captured as an ID.
	adminRouter.HandleFunc("/sliders/reorder", handlers.ReorderSliders).Methods(http.MethodPatch)
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
	orderAuthRouter.HandleFunc("/{orderId}/return-request", handlers.GetReturnRequestStatus).Methods(http.MethodGet)
	orderAuthRouter.HandleFunc("/{orderId}/return-request", handlers.CreateReturnRequest).Methods(http.MethodPost)
	orderAuthRouter.HandleFunc("/{orderId}/return-request", handlers.CancelReturnRequest).Methods(http.MethodDelete)

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

	// Careers page — the open positions listing feeds both the public section
	// and the required position dropdown on the job application form.
	api.HandleFunc("/careers/positions", handlers.ListOpenJobPositions).
		Methods(http.MethodGet)

	// Careers page — public partnership request / job application submissions
	// (multipart; a job application carries a PDF CV)
	api.HandleFunc("/careers/submissions", handlers.SubmitCareerApplication).
		Methods(http.MethodPost)

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

	// Discount Coupon Routes.
	//
	// Only the storefront's own coupon flow is public here: resolving one code
	// the shopper typed, and activating/releasing it against their cart.
	// Creating, editing, deleting, and listing discounts are admin operations
	// and live on adminRouter (/api/admin/discounts) — they were previously
	// duplicated on this unauthenticated router, which let anyone mint or
	// delete codes, and let anyone GET the full list of every coupon code.
	api.HandleFunc("/discounts/code/{code}", handlers.GetDiscountByCode).
		Methods(http.MethodGet)
	api.HandleFunc("/discounts/activate", handlers.ActivateDiscount).Methods(http.MethodPost)
	api.HandleFunc("/discounts/deactivate", handlers.DeactivateDiscount).Methods(http.MethodPost)

	// Negotiated/cart-recovery coupon application (authenticated). Validates
	// ownership, expiry, and required-product/color matching purely from the
	// JWT user + request body — the single apply path for every coupon source
	// now that the fitting room no longer mints any.
	couponsRouter := api.PathPrefix("/coupons").Subrouter()
	couponsRouter.Use(middlewares.AuthMiddleware)
	couponsRouter.HandleFunc("/apply", handlers.ApplyNegotiatedCoupon).Methods(http.MethodPost)

	// Checkout-page discount negotiation chat — cart-scoped, independent of
	// the try-on room.
	couponsRouter.HandleFunc("/negotiate-stream", handlers.NegotiateCheckoutCouponStream).Methods(http.MethodPost)
	couponsRouter.HandleFunc("/sessions/messages", handlers.AppendCheckoutChatMessages).Methods(http.MethodPost)
	couponsRouter.HandleFunc("/sessions/{chatId}", handlers.GetCheckoutChatSession).Methods(http.MethodGet)

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

	// Blog post management routes (admin + staff)
	staffRouter.HandleFunc("/blog-posts", handlers.GetAdminBlogPosts).Methods(http.MethodGet)

	// Blog category management routes (admin + staff)
	staffRouter.HandleFunc("/blog-categories", handlers.GetAdminBlogCategories).Methods(http.MethodGet)
	staffRouter.HandleFunc("/blog-categories", handlers.CreateBlogCategory).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-categories/{id}", handlers.UpdateBlogCategory).Methods(http.MethodPut)
	staffRouter.HandleFunc("/blog-categories/{id}", handlers.DeleteBlogCategory).Methods(http.MethodDelete)
	staffRouter.HandleFunc("/blog-categories/{id}/hard", handlers.HardDeleteBlogCategory).Methods(http.MethodDelete)
	staffRouter.HandleFunc("/blog-categories/{id}/restore", handlers.RestoreBlogCategory).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-categories/recount", handlers.RecountBlogCategories).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/blocks", handlers.UpdateBlogPostBlocks).Methods(http.MethodPatch)
	staffRouter.HandleFunc("/blog-posts/{id}/product-blocks/search", handlers.SearchProductsForBlock).Methods(http.MethodGet)
	staffRouter.HandleFunc("/blog-posts/{id}/product-blocks/{order}/auto-match", handlers.AutoMatchProductBlock).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/product-blocks/{order}", handlers.SelectProductForBlock).Methods(http.MethodPatch)
	staffRouter.HandleFunc("/blog-posts/{id}/publish", handlers.PublishBlogPost).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/unpublish", handlers.UnpublishBlogPost).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/archive", handlers.ArchiveBlogPost).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/restore", handlers.RestoreBlogPost).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/media", handlers.UploadBlogMedia).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-posts/{id}/media/{mediaId}", handlers.DeleteBlogMedia).Methods(http.MethodDelete)

	// Blog pipeline run routes (admin + staff)
	staffRouter.HandleFunc("/blog-runs", handlers.CreatePipelineRun).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-runs", handlers.GetPipelineRuns).Methods(http.MethodGet)
	staffRouter.HandleFunc("/blog-runs/{id}", handlers.GetPipelineRunByID).Methods(http.MethodGet)
	staffRouter.HandleFunc("/blog-runs/{id}", handlers.DeletePipelineRun).Methods(http.MethodDelete)
	staffRouter.HandleFunc("/blog-runs/{id}/approve", handlers.ApprovePipelineRun).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-runs/{id}/research", handlers.TriggerResearch).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-runs/{id}/write", handlers.TriggerWriting).Methods(http.MethodPost)
	staffRouter.HandleFunc("/blog-runs/{id}/prompts", handlers.TriggerPromptGeneration).Methods(http.MethodPost)

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
