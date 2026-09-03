package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"
)

const (
	shopCollectionsCollection = "shop_collections"

	// ShopCollectionUploadDir mirrors the hero/products layout: files live
	// under the shared ./uploads tree (served unauthenticated at /uploads/,
	// which is exactly what a public collection gallery needs).
	ShopCollectionUploadDir = "./uploads/collections"
	shopCollectionWebPrefix = "/uploads/collections/"
)

// ============================================================================
// View resolution
// ============================================================================

// resolveShopCollectionProducts loads every product referenced by the given
// collections in one query. Missing entries in the result map are the deleted
// products, which the view builder turns into out-of-stock items.
func resolveShopCollectionProducts(
	ctx context.Context,
	collections []models.ShopCollection,
) (map[primitive.ObjectID]*models.Product, error) {
	idSet := map[primitive.ObjectID]struct{}{}
	for _, sc := range collections {
		for _, item := range sc.Items {
			idSet[item.ProductID] = struct{}{}
		}
	}
	if len(idSet) == 0 {
		return map[primitive.ObjectID]*models.Product{}, nil
	}

	ids := make([]primitive.ObjectID, 0, len(idSet))
	for id := range idSet {
		ids = append(ids, id)
	}

	cursor, err := db.Database.Collection("products").Find(ctx, bson.M{"_id": bson.M{"$in": ids}},
		options.Find().SetProjection(bson.M{
			"name": 1, "price": 1, "is_active": 1, "main_images": 1, "color_variants": 1,
		}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}
	byID := make(map[primitive.ObjectID]*models.Product, len(products))
	for i := range products {
		byID[products[i].ID] = &products[i]
	}
	return byID, nil
}

// buildShopCollectionView attaches the read-time computed fields: the live sum
// of item prices, the effective bundle price, the over-price warning, the
// per-item stock resolution and the overall in-stock flag (one dead variant
// empties the whole bundle).
func buildShopCollectionView(
	sc models.ShopCollection,
	products map[primitive.ObjectID]*models.Product,
) models.ShopCollectionView {
	view := models.ShopCollectionView{ShopCollection: sc}
	view.ItemViews = make([]models.ShopCollectionItemView, 0, len(sc.Items))

	allInStock := len(sc.Items) > 0 // an empty bundle is never sellable
	for _, item := range sc.Items {
		iv := models.ShopCollectionItemView{
			ProductID: item.ProductID.Hex(),
			VariantID: item.VariantID,
			Link:      fmt.Sprintf("/products/%s?variant=%s", item.ProductID.Hex(), item.VariantID),
		}
		product, found := products[item.ProductID]
		if found && product != nil {
			iv.ProductFound = true
			iv.Name = product.Name
			iv.Price = product.Price
			if variant, _, ok := findColorVariantByID(product, item.VariantID); ok {
				iv.VariantFound = true
				iv.ColorName = variant.ColorName
				iv.Color = variant.Color
				if len(variant.Images) > 0 {
					iv.Image = variant.Images[0]
				} else if len(product.MainImages) > 0 {
					iv.Image = product.MainImages[0]
				}
				for _, size := range variant.Sizes {
					iv.Quantity += size.Quantity
				}
			}
			iv.InStock = iv.VariantFound && iv.Quantity > 0 && product.IsActive
		}

		// The auto price is the sum of the items the bundle actually contains;
		// a deleted product or a removed color has no live price to count.
		if iv.ProductFound && iv.VariantFound {
			view.ItemsTotal += iv.Price
		}
		if !iv.InStock {
			allInStock = false
		}
		view.ItemViews = append(view.ItemViews, iv)
	}
	view.InStock = allInStock

	if sc.PriceMode == models.ShopCollectionPriceCustom {
		view.EffectivePrice = sc.Price
		view.PriceWarning = sc.Price > view.ItemsTotal
	} else {
		view.EffectivePrice = view.ItemsTotal
	}
	return view
}

func buildShopCollectionViews(
	collections []models.ShopCollection,
	products map[primitive.ObjectID]*models.Product,
) []models.ShopCollectionView {
	views := make([]models.ShopCollectionView, 0, len(collections))
	for _, sc := range collections {
		views = append(views, buildShopCollectionView(sc, products))
	}
	return views
}

// ============================================================================
// Payload
// ============================================================================

// shopCollectionItemInput is one item as posted by the admin form. IDs arrive
// as hex strings; the handler resolves and validates them against the live
// catalog so a bundle can never reference a color that does not exist.
type shopCollectionItemInput struct {
	ProductID string `json:"product_id"`
	VariantID string `json:"variant_id"`
}

// shopCollectionImageOrderItem describes one slot of the final gallery. The
// frontend's ImageUploader helper produces exactly this shape, matching the
// product form's mainImageOrder convention.
type shopCollectionImageOrderItem struct {
	IsExisting bool   `json:"isExisting"`
	Path       string `json:"path,omitempty"`
	NewIndex   int    `json:"newIndex"`
}

// shopCollectionPayload is the admin create/update body. Every scalar field is
// a pointer so an update can tell "not sent" from "sent empty" — the list page
// toggles is_active without resending the whole form.
type shopCollectionPayload struct {
	Title        *string                    `json:"title"`
	Description  *string                    `json:"description"`
	Items        *[]shopCollectionItemInput `json:"items"`
	PriceMode    *string                    `json:"price_mode"`
	Price        *float64                   `json:"price"`
	IsActive     *bool                      `json:"is_active"`
	DisplayOrder *int                       `json:"display_order"`
	Images       *[]string                  `json:"images"` // full final list of stored paths
}

// apply validates the payload onto sc. products is the live catalog lookup
// used only when the payload replaces the item list; pass nil otherwise.
// Returns a Persian error message for the admin UI, or "" when valid.
func (p shopCollectionPayload) apply(
	sc *models.ShopCollection,
	products map[primitive.ObjectID]*models.Product,
) string {
	if p.Title != nil {
		sc.Title = cleanCareerText(*p.Title, models.ShopCollectionTitleMaxLength)
	}
	if len([]rune(sc.Title)) < 3 {
		return "نام کالکشن را وارد کنید (حداقل ۳ کاراکتر)"
	}

	if p.Description != nil {
		sc.Description = cleanCareerText(*p.Description, models.ShopCollectionDescriptionMaxLength)
	}

	if p.Items != nil {
		seen := map[string]struct{}{}
		items := make([]models.ShopCollectionItem, 0, len(*p.Items))
		for _, raw := range *p.Items {
			ivID := strings.TrimSpace(raw.VariantID)
			if ivID == "" {
				return "هر آیتم کالکشن باید یک رنگ مشخص از محصول باشد"
			}
			productID, err := primitive.ObjectIDFromHex(strings.TrimSpace(raw.ProductID))
			if err != nil {
				return "شناسه محصول آیتم‌ها معتبر نیست"
			}
			key := productID.Hex() + "|" + ivID
			if _, dup := seen[key]; dup {
				continue // the same color added twice is a form slip, not an error
			}
			seen[key] = struct{}{}
			items = append(items, models.ShopCollectionItem{ProductID: productID, VariantID: ivID})
		}
		if len(items) < models.ShopCollectionMinItems {
			return fmt.Sprintf("کالکشن باید حداقل %d محصول (رنگ مشخص) داشته باشد", models.ShopCollectionMinItems)
		}
		if len(items) > models.ShopCollectionMaxItems {
			return fmt.Sprintf("کالکشن نمی‌تواند بیشتر از %d محصول داشته باشد", models.ShopCollectionMaxItems)
		}
		// Existence is enforced only for a freshly posted item list. Stored
		// references are deliberately left alone on other edits so a later
		// product deletion keeps the bundle readable (and out of stock)
		// instead of locking the admin out of the description field.
		if products != nil {
			for _, item := range items {
				product, ok := products[item.ProductID]
				if !ok || product == nil {
					return "یکی از محصولات انتخاب‌شده وجود ندارد"
				}
				if _, _, ok := findColorVariantByID(product, item.VariantID); !ok {
					return fmt.Sprintf("رنگ انتخاب‌شده برای محصول «%s» دیگر وجود ندارد", product.Name)
				}
			}
		}
		sc.Items = items
	}

	if p.PriceMode != nil {
		mode := strings.TrimSpace(*p.PriceMode)
		if !models.ValidShopCollectionPriceMode(mode) {
			return "روش قیمت‌گذاری معتبر نیست"
		}
		sc.PriceMode = mode
	}
	if sc.PriceMode == "" {
		sc.PriceMode = models.ShopCollectionPriceAuto
	}

	if p.Price != nil {
		if *p.Price < 0 {
			return "قیمت کالکشن نمی‌تواند منفی باشد"
		}
		sc.Price = *p.Price
	}
	if sc.PriceMode == models.ShopCollectionPriceCustom && sc.Price <= 0 {
		return "برای قیمت دستی، مبلغ کالکشن را وارد کنید"
	}
	if sc.PriceMode == models.ShopCollectionPriceAuto {
		sc.Price = 0 // the sum is recomputed on read; a stale override must not linger
	}

	if p.Images != nil {
		cleaned := make([]string, 0, len(*p.Images))
		for _, path := range *p.Images {
			path = strings.TrimSpace(path)
			if path == "" {
				continue
			}
			if !strings.HasPrefix(path, shopCollectionWebPrefix) ||
				strings.Contains(path, "..") {
				return "مسیر یکی از تصاویر معتبر نیست"
			}
			cleaned = append(cleaned, path)
			if len(cleaned) == models.ShopCollectionMaxImages {
				break
			}
		}
		sc.Images = cleaned
	}

	if p.IsActive != nil {
		sc.IsActive = *p.IsActive
	}

	if p.DisplayOrder != nil {
		if *p.DisplayOrder < 0 || *p.DisplayOrder > 100000 {
			return "ترتیب نمایش معتبر نیست"
		}
		sc.DisplayOrder = *p.DisplayOrder
	}

	return ""
}

// ============================================================================
// Request parsing (JSON or multipart, like the hero-images endpoints)
// ============================================================================

// readShopCollectionRequest decodes the admin payload and, for multipart
// requests, writes the uploaded files into the collection's gallery and merges
// them with the posted image order. It returns the uploaded file paths of the
// request so a failed save can clean them up.
func readShopCollectionRequest(
	r *http.Request,
	sc *models.ShopCollection,
) (*shopCollectionPayload, []string, string) {
	contentType := r.Header.Get("Content-Type")

	if !strings.Contains(contentType, "multipart/form-data") {
		var payload shopCollectionPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			return nil, nil, "Invalid request payload"
		}
		return &payload, nil, ""
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		return nil, nil, "Error parsing multipart form: " + err.Error()
	}

	var payload shopCollectionPayload
	if dataStr := r.FormValue("data"); dataStr != "" {
		if err := json.Unmarshal([]byte(dataStr), &payload); err != nil {
			return nil, nil, "Invalid data payload: " + err.Error()
		}
	}

	var uploaded []string
	var newFiles []string // web paths, in upload order

	if files, exists := r.MultipartForm.File["images"]; exists && len(files) > 0 {
		if len(files) > models.ShopCollectionMaxImages {
			return nil, nil, fmt.Sprintf("حداکثر %d تصویر مجاز است", models.ShopCollectionMaxImages)
		}
		if err := os.MkdirAll(ShopCollectionUploadDir, 0755); err != nil {
			return nil, nil, "Error creating upload directory"
		}
		for _, header := range files {
			file, err := header.Open()
			if err != nil {
				removeUploads(uploaded)
				return nil, nil, "Error opening uploaded image"
			}
			contentType := header.Header.Get("Content-Type")
			if !allowedImageTypes[contentType] {
				file.Close()
				removeUploads(uploaded)
				return nil, nil, "Invalid image file format. Allowed: JPEG, PNG, WebP"
			}

			ext := strings.ToLower(filepath.Ext(header.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
				switch contentType {
				case "image/jpeg":
					ext = ".jpg"
				case "image/png":
					ext = ".png"
				case "image/webp":
					ext = ".webp"
				}
			}
			filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
			dstPath := filepath.Join(ShopCollectionUploadDir, filename)
			dst, err := os.Create(dstPath)
			if err != nil {
				file.Close()
				removeUploads(uploaded)
				return nil, nil, "Error saving image file"
			}
			if _, err := io.Copy(dst, file); err != nil {
				dst.Close()
				file.Close()
				os.Remove(dstPath)
				removeUploads(uploaded)
				return nil, nil, "Error saving image file"
			}
			dst.Close()
			file.Close()

			uploaded = append(uploaded, dstPath)
			newFiles = append(newFiles, shopCollectionWebPrefix+filename)
		}
	}

	// An explicit order merges kept and new images; without it, new uploads
	// simply append to the stored gallery.
	if orderStr := r.FormValue("imageOrder"); orderStr != "" {
		var order []shopCollectionImageOrderItem
		if err := json.Unmarshal([]byte(orderStr), &order); err != nil {
			removeUploads(uploaded)
			return nil, nil, "Invalid imageOrder JSON format: " + err.Error()
		}
		merged := make([]string, 0, len(order))
		for _, entry := range order {
			if entry.IsExisting {
				merged = append(merged, strings.TrimSpace(entry.Path))
				continue
			}
			if entry.NewIndex < 0 || entry.NewIndex >= len(newFiles) {
				removeUploads(uploaded)
				return nil, nil, "ترتیب تصاویر با فایل‌های ارسالی همخوانی ندارد"
			}
			merged = append(merged, newFiles[entry.NewIndex])
		}
		payload.Images = &merged
	} else if len(newFiles) > 0 {
		existing := sc.Images
		merged := make([]string, 0, len(existing)+len(newFiles))
		merged = append(merged, existing...)
		merged = append(merged, newFiles...)
		payload.Images = &merged
	}

	return &payload, uploaded, ""
}

func removeUploads(paths []string) {
	for _, p := range paths {
		os.Remove(p)
	}
}

// deleteShopCollectionImageFiles removes stored gallery images. Paths outside
// the collections upload directory are skipped — the same guard the payload
// validator applies, so a bad document can never make the handler unlink files
// belonging to other resources.
func deleteShopCollectionImageFiles(paths []string) {
	for _, path := range paths {
		if !strings.HasPrefix(path, shopCollectionWebPrefix) || strings.Contains(path, "..") {
			continue
		}
		if err := os.Remove("." + path); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: could not delete collection image %s: %v\n", path, err)
		}
	}
}

// ============================================================================
// Query helpers
// ============================================================================

func findShopCollections(
	ctx context.Context,
	filter bson.M,
	limit int64,
) ([]models.ShopCollection, []models.ShopCollectionView, error) {
	cursor, err := db.Database.Collection(shopCollectionsCollection).Find(ctx, filter, options.Find().
		SetLimit(limit).
		SetSort(bson.D{
			{Key: "display_order", Value: 1},
			{Key: "created_at", Value: -1},
		}))
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(ctx)

	collections := []models.ShopCollection{}
	if err := cursor.All(ctx, &collections); err != nil {
		return nil, nil, err
	}

	products, err := resolveShopCollectionProducts(ctx, collections)
	if err != nil {
		return nil, nil, err
	}
	return collections, buildShopCollectionViews(collections, products), nil
}

// ============================================================================
// Public endpoints
// ============================================================================

// ListShopCollections handles GET /api/shop-collections.
// Only published collections are returned; each carries its computed price and
// the live in-stock verdict.
func ListShopCollections(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	_, views, err := findShopCollections(ctx, bson.M{"is_active": true}, models.ShopCollectionsPageLimit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch collections")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"collections": views,
	})
}

// GetShopCollection handles GET /api/shop-collections/{id}.
// An unpublished collection answers 404 publicly: its existence is not leaked
// through a different status code.
func GetShopCollection(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid collection id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var sc models.ShopCollection
	err = db.Database.Collection(shopCollectionsCollection).
		FindOne(ctx, bson.M{"_id": id, "is_active": true}).
		Decode(&sc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "Collection not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch collection")
		return
	}

	products, err := resolveShopCollectionProducts(ctx, []models.ShopCollection{sc})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch collection")
		return
	}
	utils.JSONResponse(w, http.StatusOK, buildShopCollectionView(sc, products))
}

// ============================================================================
// Admin endpoints
// ============================================================================

// AdminListShopCollections handles GET /api/admin/shop-collections.
// Supports ?status=active|inactive and ?search= over title/description.
func AdminListShopCollections(w http.ResponseWriter, r *http.Request) {
	filter := bson.M{}
	switch r.URL.Query().Get("status") {
	case "active":
		filter["is_active"] = true
	case "inactive":
		filter["is_active"] = false
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		escaped := regexp.QuoteMeta(search)
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": escaped, "$options": "i"}},
			{"description": bson.M{"$regex": escaped, "$options": "i"}},
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	_, views, err := findShopCollections(ctx, filter, models.ShopCollectionsPageLimit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch collections")
		return
	}

	active, inStock := 0, 0
	for _, view := range views {
		if view.IsActive {
			active++
		}
		if view.InStock {
			inStock++
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"collections": views,
		"stats": map[string]int{
			"total":    len(views),
			"active":   active,
			"inactive": len(views) - active,
			"in_stock": inStock,
		},
	})
}

// AdminGetShopCollection handles GET /api/admin/shop-collections/{id}.
func AdminGetShopCollection(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid collection id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var sc models.ShopCollection
	err = db.Database.Collection(shopCollectionsCollection).
		FindOne(ctx, bson.M{"_id": id}).
		Decode(&sc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "Collection not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch collection")
		return
	}

	products, err := resolveShopCollectionProducts(ctx, []models.ShopCollection{sc})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch collection")
		return
	}
	utils.JSONResponse(w, http.StatusOK, buildShopCollectionView(sc, products))
}

// AdminCreateShopCollection handles POST /api/admin/shop-collections.
// Accepts JSON or multipart/form-data (fields: data, images[], imageOrder).
func AdminCreateShopCollection(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	sc := &models.ShopCollection{
		ID:       primitive.NewObjectID(),
		IsActive: true, // a new bundle is published unless explicitly held back
		Images:   []string{},
	}

	payload, uploaded, errMsg := readShopCollectionRequest(r, sc)
	if errMsg != "" {
		removeUploads(uploaded)
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	// Validate posted items against the live catalog.
	needsProducts := payload.Items != nil && len(*payload.Items) > 0
	var products map[primitive.ObjectID]*models.Product
	if needsProducts {
		var err error
		if products, err = productsForPayload(ctx, *payload.Items); err != nil {
			removeUploads(uploaded)
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to validate items")
			return
		}
	}

	if errMsg := payload.apply(sc, products); errMsg != "" {
		removeUploads(uploaded)
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	// Unspecified order appends after the current last bundle.
	if payload.DisplayOrder == nil {
		sc.DisplayOrder = nextShopCollectionOrder(ctx)
	}

	now := time.Now()
	sc.CreatedAt = now
	sc.UpdatedAt = now
	if adminID, _, ok := adminIdentity(ctx, r); ok {
		sc.CreatedBy = &adminID
	}

	if _, err := db.Database.Collection(shopCollectionsCollection).InsertOne(ctx, sc); err != nil {
		removeUploads(uploaded)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create collection")
		return
	}

	utils.LogAction("SHOP_COLLECTION_CREATED", sc.Title)
	respondCollectionView(ctx, w, http.StatusCreated, sc)
}

// AdminUpdateShopCollection handles PUT /api/admin/shop-collections/{id}.
// Every field is patchable; omitted fields keep their stored value.
func AdminUpdateShopCollection(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid collection id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	collection := db.Database.Collection(shopCollectionsCollection)

	var sc models.ShopCollection
	if err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&sc); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "Collection not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load collection")
		return
	}
	originalImages := append([]string{}, sc.Images...)

	payload, uploaded, errMsg := readShopCollectionRequest(r, &sc)
	if errMsg != "" {
		removeUploads(uploaded)
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	var products map[primitive.ObjectID]*models.Product
	if payload.Items != nil && len(*payload.Items) > 0 {
		if products, err = productsForPayload(ctx, *payload.Items); err != nil {
			removeUploads(uploaded)
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to validate items")
			return
		}
	}

	if errMsg := payload.apply(&sc, products); errMsg != "" {
		removeUploads(uploaded)
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}
	sc.UpdatedAt = time.Now()

	set := bson.M{
		"title":         sc.Title,
		"description":   sc.Description,
		"images":        sc.Images,
		"items":         sc.Items,
		"price_mode":    sc.PriceMode,
		"price":         sc.Price,
		"is_active":     sc.IsActive,
		"display_order": sc.DisplayOrder,
		"updated_at":    sc.UpdatedAt,
	}

	if _, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set}); err != nil {
		removeUploads(uploaded)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update collection")
		return
	}

	// Files dropped by the new gallery order are dead weight once the document
	// has moved on: the old paths removed from the list, and any upload the
	// admin discarded in the form before saving.
	if payload.Images != nil {
		deleteShopCollectionImageFiles(droppedImages(originalImages, sc.Images))
	}
	if len(uploaded) > 0 {
		kept := make(map[string]struct{}, len(sc.Images))
		for _, path := range sc.Images {
			kept["."+path] = struct{}{}
		}
		var orphans []string
		for _, path := range uploaded {
			if _, ok := kept[path]; !ok {
				orphans = append(orphans, path)
			}
		}
		removeUploads(orphans)
	}

	utils.LogAction("SHOP_COLLECTION_UPDATED", sc.Title)
	respondCollectionView(ctx, w, http.StatusOK, &sc)
}

// AdminDeleteShopCollection handles DELETE /api/admin/shop-collections/{id}.
// The referenced products are untouched — a bundle only ever stored references.
func AdminDeleteShopCollection(w http.ResponseWriter, r *http.Request) {
	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid collection id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var sc models.ShopCollection
	err = db.Database.Collection(shopCollectionsCollection).
		FindOne(ctx, bson.M{"_id": id}).
		Decode(&sc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "Collection not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load collection")
		return
	}

	result, err := db.Database.Collection(shopCollectionsCollection).
		DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete collection")
		return
	}
	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Collection not found")
		return
	}

	deleteShopCollectionImageFiles(sc.Images)

	utils.LogAction("SHOP_COLLECTION_DELETED", sc.Title)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Collection deleted"})
}

// ============================================================================
// Shared helpers
// ============================================================================

// productsForPayload loads the products a posted item list references.
func productsForPayload(
	ctx context.Context,
	items []shopCollectionItemInput,
) (map[primitive.ObjectID]*models.Product, error) {
	converted := make([]models.ShopCollectionItem, 0, len(items))
	for _, raw := range items {
		productID, err := primitive.ObjectIDFromHex(strings.TrimSpace(raw.ProductID))
		if err != nil {
			// apply() reports this as a 400; resolve it to an empty lookup so
			// validation still runs against "product missing".
			continue
		}
		converted = append(converted, models.ShopCollectionItem{ProductID: productID, VariantID: raw.VariantID})
	}
	return resolveShopCollectionProducts(ctx, []models.ShopCollection{{Items: converted}})
}

// droppedImages returns the paths removed by the new gallery order.
func droppedImages(oldImages, newImages []string) []string {
	kept := make(map[string]struct{}, len(newImages))
	for _, p := range newImages {
		kept[p] = struct{}{}
	}
	var dropped []string
	for _, p := range oldImages {
		if _, ok := kept[p]; !ok {
			dropped = append(dropped, p)
		}
	}
	return dropped
}

// nextShopCollectionOrder puts a new bundle after the current last one.
func nextShopCollectionOrder(ctx context.Context) int {
	var last models.ShopCollection
	err := db.Database.Collection(shopCollectionsCollection).FindOne(
		ctx,
		bson.M{},
		options.FindOne().SetSort(bson.D{{Key: "display_order", Value: -1}}),
	).Decode(&last)
	if err != nil {
		return 10
	}
	return last.DisplayOrder + 10
}

// respondCollectionView recomputes the collection's live fields and writes the
// view with the given success status.
func respondCollectionView(
	ctx context.Context,
	w http.ResponseWriter,
	status int,
	sc *models.ShopCollection,
) {
	products, err := resolveShopCollectionProducts(ctx, []models.ShopCollection{*sc})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to compute collection state")
		return
	}
	utils.JSONResponse(w, status, buildShopCollectionView(*sc, products))
}
