package handlers

import (
	"backEnd/db"
	"backEnd/models"
	"backEnd/services"
	"backEnd/utils"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/image/webp"
	xdraw "golang.org/x/image/draw"
)

const tryOnModel = "google/gemini-2.5-flash-image"
const tryOnMaxImageDimension = 1024
const tryOnImageQuality = 85
const tryOnTaskTTL = 30 * time.Minute
const tryOnFinishedGrace = 5 * time.Minute
const tryOnCleanupInterval = 1 * time.Minute

const tryOnPromptUpper = "Replace upper garment with attached garment. Preserve exact face, pose, background, and lighting. Add natural armpit and chest folds matching light direction. Ensure shoulder seams align with natural shoulders and collar sits naturally at neckline. No warping, bleeding, or artifacts. Output in 3:4 portrait aspect ratio. Output only image."

const tryOnPromptLower = "Replace lower garment with attached garment. Preserve exact face, pose, background, and lighting. Add natural waistband and knee folds matching light direction. Ensure waist transition is seamless with realistic drape around hips and thighs. No warping, bleeding, or artifacts. Output in 3:4 portrait aspect ratio. Output only image."

const tryOnPromptDress = "Replace full-body garment with attached garment. Preserve exact face, pose, background, and lighting. Add natural folds at shoulders, chest, and waist matching light direction. Ensure the garment wraps naturally around torso and drapes realistically over hips. No warping, bleeding, or artifacts. Output in 3:4 portrait aspect ratio. Output only image."

func getTryOnPrompt(garmentType string) string {
	switch garmentType {
	case "lower_body":
		return tryOnPromptLower
	case "dresses":
		return tryOnPromptDress
	default:
		return tryOnPromptUpper
	}
}

// garmentDetails are the facts about the garment that the prompt states in
// words rather than leaving to the attached photo. Every field is written by
// the AI metadata generator or by the admin — none is derived from a table in
// this file, so a new garment shape needs no code change to be described.
type garmentDetails struct {
	Name   string // product name, as shown in the shop (Persian)
	Type   string // garment noun from variant metadata, e.g. "tshirt (تیشرت)"
	Fit    string // قواره, e.g. "loose, boxy cut with dropped shoulders" or "گشاد"
	Phrase string // one-line garment summary, e.g. "short-sleeve checked cotton shirt"

	// Per-colour appearance, from the variant's own vision pass. These are the
	// three things a try-on most visibly gets wrong: it recolours the garment,
	// renders knitwear as woven, or smooths a check into a solid block.
	Color    string // the variant's own colour name, e.g. "آبی روشن"
	Material string // e.g. "پنبه"
	Pattern  string // e.g. "چهارخانه"
}

func (d garmentDetails) isEmpty() bool {
	return d.Name == "" && d.Type == "" && d.Fit == "" && d.Phrase == "" &&
		d.Color == "" && d.Material == "" && d.Pattern == ""
}

// buildTryOnPrompt puts the garment's identity in front of the geometry
// instructions.
//
// The garment photo travels in the same request, but a photo alone leaves the
// cut open to interpretation: an oversized shirt comes back tailored to the
// body, and a specific garment drifts toward a generic one. Naming the type and
// the intended قواره pins down what the picture leaves ambiguous. The base
// prompt stays last so "Output only image." remains the closing instruction.
func buildTryOnPrompt(garmentType string, details garmentDetails) string {
	base := getTryOnPrompt(garmentType)
	if details.isEmpty() {
		return base
	}

	// Both lists stay in step with what is actually known: telling the model to
	// honour "the stated fit" when no fit was stated is an instruction it cannot
	// follow, and invites it to invent one.
	var specs []string
	emphasis := []string{"These describe the attached garment and are binding."}

	if details.Name != "" {
		specs = append(specs, "- Product name: "+details.Name)
	}
	if details.Phrase != "" {
		specs = append(specs, "- Garment: "+details.Phrase)
	}
	if details.Type != "" {
		specs = append(specs, "- Garment type: "+details.Type)
	}
	if details.Phrase != "" || details.Type != "" {
		emphasis = append(emphasis, "Render it as the garment described above and do not substitute a different garment.")
	}

	// Appearance is listed last, next to the sentence defending it, so the model
	// reads the fact and the constraint together.
	var appearance []string
	if details.Color != "" {
		specs = append(specs, "- Colour: "+details.Color)
		appearance = append(appearance, "colour")
	}
	if details.Material != "" {
		specs = append(specs, "- Fabric: "+details.Material)
		appearance = append(appearance, "fabric")
	}
	if details.Pattern != "" {
		specs = append(specs, "- Surface pattern: "+details.Pattern)
		appearance = append(appearance, "surface pattern")
	}
	if len(appearance) > 0 {
		emphasis = append(emphasis, "Carry the "+joinWithAnd(appearance)+" over from the attached garment image unchanged.")
	}
	if details.Pattern != "" {
		// Worded to hold for a plain garment too: the stored value is one of a
		// small set that includes "ساده" (solid), where warning against
		// smoothing would be nonsense and inviting texture would be a defect.
		// The final clause is the one that covers it.
		emphasis = append(emphasis, "Reproduce the surface pattern exactly as photographed — keep its scale and alignment, let it follow the body's contours, and neither simplify it nor add pattern that is not there.")
	}

	emphasis = append(emphasis, "Match the attached garment image in every other respect.")

	var sections []string
	if len(specs) > 0 {
		sections = append(sections,
			"GARMENT DETAILS — take these into careful consideration:",
			strings.Join(specs, "\n"),
			"",
		)
	}

	// The fit gets its own heading instead of a bullet among the others. It is
	// the instruction the model is most likely to quietly ignore — a garment
	// redrawn onto a body defaults to a flattering tailored silhouette whatever
	// the source garment looked like — so it is stated as a requirement, given
	// precedence over the photo, and repeated at the end of the emphasis.
	if details.Fit != "" {
		sections = append(sections,
			"REQUIRED FIT (قواره): "+details.Fit,
			"The garment MUST be worn with exactly this fit. This is a hard requirement, not a preference. Shape the silhouette, volume, and drape on the body to match it, and do not slim, tighten, loosen, lengthen, or shorten the garment, or fall back to a generic tailored look. Where this fit differs from how the garment happens to hang in the attached photo, this fit wins.",
			"",
		)
		emphasis = append(emphasis, "Above all, the garment must end up with the required fit stated above.")
	}

	sections = append(sections, strings.Join(emphasis, " "), "", base)

	return strings.Join(sections, "\n")
}

// garmentFitAttributeName is the label the catalogue uses for the fit attribute
// in the admin's product form. It names which attribute to read — the value it
// carries is always the admin's own text.
const garmentFitAttributeName = "قواره"

// productAttributeValue returns the value of the named attribute, or "" when the
// admin has not filled one in.
func productAttributeValue(attributes []models.ProductAttribute, name string) string {
	for _, attr := range attributes {
		if strings.EqualFold(strings.TrimSpace(attr.Name), name) {
			return strings.TrimSpace(attr.Value)
		}
	}
	return ""
}

// joinWithAnd renders a list as English prose: "colour, fabric, and pattern".
func joinWithAnd(items []string) string {
	switch len(items) {
	case 0:
		return ""
	case 1:
		return items[0]
	case 2:
		return items[0] + " and " + items[1]
	default:
		return strings.Join(items[:len(items)-1], ", ") + ", and " + items[len(items)-1]
	}
}

// resolveGarmentDetails reads the garment's description and قواره from the
// product's AI-generated metadata. The client sends identifiers only — that
// metadata is generated server-side and never travels in the cart payload, so
// it has to be read here.
//
// Fit and phrase live on the product (search_metadata) because they describe
// the cut, which every colour of a product shares; the garment type comes from
// the variant, which is where the vision pass writes it. Every field is
// optional: a product whose metadata has not been generated yields fewer prompt
// lines rather than an error, leaving the prompt as it was before.
func resolveGarmentDetails(ctx context.Context, productID primitive.ObjectID, variantID, color, colorName, productName string) garmentDetails {
	details := garmentDetails{Name: strings.TrimSpace(productName)}

	if db.Database == nil || productID.IsZero() {
		return details
	}

	var product models.Product
	if err := db.Database.Collection("products").FindOne(ctx, bson.M{"_id": productID}).Decode(&product); err != nil {
		fmt.Printf("[tryon] garment product lookup failed: %v\n", err)
		return details
	}
	if details.Name == "" {
		details.Name = strings.TrimSpace(product.Name)
	}

	if product.SearchMetadata != nil {
		details.Fit = strings.TrimSpace(product.SearchMetadata.FitDescription)
		details.Phrase = strings.TrimSpace(product.SearchMetadata.GarmentPhrase)
	}

	// Falls back to the admin's own قواره attribute — their statement of the
	// cut, typed per product, and already present across the catalogue while
	// fitDescription waits on a metadata regeneration. "قواره" here is the
	// attribute's name, not a fit value: whatever the admin wrote against it is
	// what reaches the prompt.
	if details.Fit == "" {
		details.Fit = productAttributeValue(product.Attributes, garmentFitAttributeName)
	}

	variant, _, ok := findColorVariantByID(&product, variantID)
	if !ok {
		variant, _, ok = findColorVariant(&product, color, colorName)
	}
	if !ok {
		return details
	}

	// The stored colour name, not the one the client sent: this is the colour
	// the customer is buying, and it must not be overridable from the request.
	details.Color = strings.TrimSpace(variant.ColorName)
	if details.Color == "" {
		details.Color = strings.TrimSpace(variant.Color)
	}

	if variant.AIMetadata == nil {
		return details
	}

	// English standard value plus the Persian term when they differ. They can be
	// identical when no product_type vocabulary entry matched, and "پیراهن
	// (پیراهن)" is worse than naming it once.
	details.Type = strings.TrimSpace(variant.AIMetadata.ProductTypeStandard)
	if persian := strings.TrimSpace(variant.AIMetadata.ProductTypePersian); persian != "" {
		switch {
		case details.Type == "":
			details.Type = persian
		case !strings.EqualFold(details.Type, persian):
			details.Type = fmt.Sprintf("%s (%s)", details.Type, persian)
		}
	}

	details.Material = strings.TrimSpace(variant.AIMetadata.MaterialPersian)
	details.Pattern = strings.TrimSpace(variant.AIMetadata.PatternPersian)

	// Fit deliberately has no fallback to AIMetadata.FitType. That field is
	// force-defaulted to "معمولی" by validateMetadata whenever the model
	// declines to answer, so falling back to it would state a constant this
	// code invented as a fact about the garment. FitDescription is the only fit
	// source, and it is never defaulted — see validateMetadata.
	//
	// Material and Pattern above are safe by the same test: canonicalVocabularyPair
	// keeps the model's own term when nothing matches, and normalizeVariantPattern
	// returns "" rather than guessing. Neither can invent a value.

	return details
}

func tryOnDebug(format string, args ...interface{}) {
	if os.Getenv("TRYON_DEBUG") == "true" {
		fmt.Printf(format+"\n", args...)
	}
}

type tryOnTask struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"` // "processing", "done", "error"
	Image     string    `json:"image,omitempty"`
	Error     string    `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

var tryOnTasks sync.Map

var virtualTryonService *services.VirtualTryonService
var tryonChatService *services.TryonChatService

func InitVirtualTryonService(db *mongo.Database) {
	virtualTryonService = services.NewVirtualTryonService(db)
	tryonChatService = services.NewTryonChatService(db)
}

func init() {
	go cleanupTryOnTasks()
}

func generateTryOnUUID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return "tryon-" + hex.EncodeToString(b)
}

func generateChatUUID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return "tchat-" + hex.EncodeToString(b)
}

func savePersonImage(personBytes []byte) (url string, hash string, err error) {
	hashBytes := sha256.Sum256(personBytes)
	hash = hex.EncodeToString(hashBytes[:])

	ext := ".jpg"
	mime := http.DetectContentType(personBytes)
	if strings.Contains(mime, "png") {
		ext = ".png"
	} else if strings.Contains(mime, "webp") {
		ext = ".webp"
	}

	uploadDir := "uploads/tryon/persons"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("mkdir error: %v", err)
	}

	filename := fmt.Sprintf("%s/%s%s", uploadDir, strings.ReplaceAll(hash, "/", "_"), ext)
	filename = strings.ReplaceAll(filename, "\\", "_")
	// Hash is 64 hex chars, no slashes, but defensive

	if _, err := os.Stat(filename); err == nil {
		// already persisted (dedup hit)
		return "/" + filename, hash, nil
	}

	if err := os.WriteFile(filename, personBytes, 0644); err != nil {
		return "", "", fmt.Errorf("write error: %v", err)
	}
	return "/" + filename, hash, nil
}

func generateTryOnTaskID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func cleanupTryOnTasks() {
	ticker := time.NewTicker(tryOnCleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		hardCutoff := now.Add(-tryOnTaskTTL)
		finishedCutoff := now.Add(-tryOnFinishedGrace)
		var removedStale, removedFinished int
		tryOnTasks.Range(func(key, value interface{}) bool {
			task := value.(*tryOnTask)
			switch task.Status {
			case "done", "error":
				if task.CreatedAt.Before(finishedCutoff) {
					tryOnTasks.Delete(key)
					removedFinished++
				}
			default:
				if task.CreatedAt.Before(hardCutoff) {
					tryOnTasks.Delete(key)
					removedStale++
				}
			}
			return true
		})
		if removedFinished > 0 || removedStale > 0 {
			fmt.Printf("[tryon-cleanup] removed %d finished, %d stale\n", removedFinished, removedStale)
		}
	}
}

func VirtualTryOn(w http.ResponseWriter, r *http.Request) {
	fmt.Println("[tryon] --- VirtualTryOn START ---")

	userID, _, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "لطفاً وارد شوید")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		fmt.Printf("[tryon] ParseMultipartForm error: %v\n", err)
		utils.ErrorResponse(w, http.StatusBadRequest, "حداکثر حجم آپلود ۱۰ مگابایت است")
		return
	}
	fmt.Println("[tryon] form parsed OK")

	personFile, _, err := r.FormFile("person_image")
	if err != nil {
		fmt.Printf("[tryon] person_image missing: %v\n", err)
		utils.ErrorResponse(w, http.StatusBadRequest, "تصویر شخص الزامی است")
		return
	}
	defer personFile.Close()
	fmt.Println("[tryon] person_image received")

	garmentURL := r.FormValue("garment_image_url")
	var garmentBytes []byte
	if garmentURL != "" {
		fmt.Printf("[tryon] fetching garment from URL: %s\n", garmentURL)
		garmentBytes, err = fetchImageFromURL(garmentURL)
		if err != nil {
			fmt.Printf("[tryon] fetch garment URL error: %v\n", err)
			utils.ErrorResponse(w, http.StatusBadRequest, "خطا در دریافت تصویر لباس")
			return
		}
		fmt.Printf("[tryon] fetched garment image size: %d bytes\n", len(garmentBytes))
	} else {
		garmentFile, _, err := r.FormFile("garment_image")
		if err != nil {
			fmt.Printf("[tryon] garment_image missing: %v\n", err)
			utils.ErrorResponse(w, http.StatusBadRequest, "تصویر لباس الزامی است")
			return
		}
		defer garmentFile.Close()
		fmt.Println("[tryon] garment_image received")
		garmentBytes, err = io.ReadAll(garmentFile)
		if err != nil {
			fmt.Printf("[tryon] read garment bytes error: %v\n", err)
			utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در خواندن تصویر لباس")
			return
		}
		fmt.Printf("[tryon] garment image size: %d bytes\n", len(garmentBytes))
	}

	personBytes, err := io.ReadAll(personFile)
	if err != nil {
		fmt.Printf("[tryon] read person bytes error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در خواندن تصویر شخص")
		return
	}
	fmt.Printf("[tryon] person image size: %d bytes\n", len(personBytes))

	personImageURL, personImageHash, err := savePersonImage(personBytes)
	if err != nil {
		fmt.Printf("[tryon] save person image error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره تصویر شخص")
		return
	}
	fmt.Printf("[tryon] person image persisted at %s\n", personImageURL)

	garmentType := r.FormValue("garment_type")
	if garmentType == "" {
		garmentType = "upper_body"
	}
	fmt.Printf("[tryon] garment_type: %s\n", garmentType)

	garmentProductIDStr := r.FormValue("garment_product_id")
	garmentProductName := r.FormValue("garment_product_name")
	garmentVariantID := r.FormValue("garment_variant_id")
	garmentColor := r.FormValue("garment_color")
	garmentColorName := r.FormValue("garment_color_name")
	garmentSize := r.FormValue("garment_size")
	chatIDParam := r.FormValue("chat_id")

	taskID := generateTryOnTaskID()
	tryonID := generateTryOnUUID()
	chatID := chatIDParam
	if chatID == "" {
		chatID = generateChatUUID()
	}
	fmt.Printf("[tryon] tryon_id=%s chat_id=%s\n", tryonID, chatID)

	var garmentProductObjID primitive.ObjectID
	if garmentProductIDStr != "" {
		if objID, err := primitive.ObjectIDFromHex(garmentProductIDStr); err == nil {
			garmentProductObjID = objID
		}
	}

	// Resolved here rather than inside the goroutine below: this reads Mongo
	// through the request context, which is cancelled once the handler returns.
	garmentInfo := resolveGarmentDetails(r.Context(), garmentProductObjID, garmentVariantID, garmentColor, garmentColorName, garmentProductName)
	fmt.Printf("[tryon] garment details name=%q type=%q fit=%q\n", garmentInfo.Name, garmentInfo.Type, garmentInfo.Fit)

	tryonDoc := &models.VirtualTryon{
		TryonID:           tryonID,
		UserID:            userID,
		TaskID:            taskID,
		Status:            models.TryonStatusProcessing,
		PersonImageURL:    personImageURL,
		PersonImageHash:   personImageHash,
		GarmentImageURL:   garmentURL,
		GarmentProductID:  garmentProductObjID,
		GarmentProductName: garmentProductName,
		GarmentColor:      garmentColor,
		GarmentSize:       garmentSize,
		GarmentType:       garmentType,
		CreatedAt:         time.Now(),
	}
	if virtualTryonService != nil {
		if err := virtualTryonService.Create(r.Context(), tryonDoc); err != nil {
			fmt.Printf("[tryon] persist virtual_tryons error: %v\n", err)
		}
	}
	if tryonChatService != nil {
		if err := tryonChatService.LinkTryon(r.Context(), chatID, userID, tryonID); err != nil {
			fmt.Printf("[tryon] link tryon to chat error: %v\n", err)
		}
	}

	task := &tryOnTask{
		ID:        taskID,
		Status:    "processing",
		CreatedAt: time.Now(),
	}
	tryOnTasks.Store(taskID, task)
	fmt.Printf("[tryon] task %s created, starting goroutine\n", taskID)

	go func() {
		startTime := time.Now()
		defer func() {
			if rec := recover(); rec != nil {
				fmt.Printf("[tryon-%s] PANIC: %v\n%s\n", taskID, rec, string(debug.Stack()))
				task.Status = "error"
				task.Error = "خطای داخلی سرور"
				tryOnTasks.Store(taskID, task)
				if virtualTryonService != nil {
					_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
				}
			}
		}()

		if isTryOnDevMode() {
			fmt.Printf("[tryon-%s] DEV MODE: returning placeholder image\n", taskID)
			task.Status = "done"
			task.Image = getDevPlaceholderPath()
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Complete(context.Background(), tryonID, task.Image, "dev-placeholder", "", time.Since(startTime).Milliseconds())
			}
			return
		}

		fmt.Printf("[tryon-%s] resizing images...\n", taskID)
		resizedPerson, _, err := resizeImageToMaxDimension(personBytes, tryOnMaxImageDimension)
		if err != nil {
			fmt.Printf("[tryon-%s] resize person error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در پردازش تصویر شخص"
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
			}
			return
		}
		resizedGarment, _, err := resizeImageToMaxDimension(garmentBytes, tryOnMaxImageDimension)
		if err != nil {
			fmt.Printf("[tryon-%s] resize garment error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در پردازش تصویر لباس"
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
			}
			return
		}
		fmt.Printf("[tryon-%s] resized person=%d garment=%d bytes\n", taskID, len(resizedPerson), len(resizedGarment))

		prompt := buildTryOnPrompt(garmentType, garmentInfo)

		personBase64 := base64.StdEncoding.EncodeToString(resizedPerson)
		garmentBase64 := base64.StdEncoding.EncodeToString(resizedGarment)

		personDataURL := fmt.Sprintf("data:image/jpeg;base64,%s", personBase64)
		garmentDataURL := fmt.Sprintf("data:image/jpeg;base64,%s", garmentBase64)

		requestBody := map[string]interface{}{
			"model": tryOnModel,
			"messages": []map[string]interface{}{
				{
					"role": "user",
					"content": []map[string]interface{}{
						{
							"type": "text",
							"text": prompt,
						},
						{
							"type": "image_url",
							"image_url": map[string]string{
								"url": personDataURL,
							},
						},
						{
							"type": "image_url",
							"image_url": map[string]string{
								"url": garmentDataURL,
							},
						},
					},
				},
			},
			"modalities": []string{"image", "text"},
		}

		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			fmt.Printf("[tryon-%s] json marshal error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطای داخلی"
			tryOnTasks.Store(taskID, task)
			return
		}

		apiKey := os.Getenv("OPENROUTER_API_KEY")
		if apiKey == "" {
			fmt.Printf("[tryon-%s] OPENROUTER_API_KEY not set\n", taskID)
			task.Status = "error"
			task.Error = "سرویس پرو مجازی در حال حاضر در دسترس نیست"
			tryOnTasks.Store(taskID, task)
			return
		}
		appURL := os.Getenv("APP_URL")

		httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			fmt.Printf("[tryon-%s] http.NewRequest error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطای داخلی"
			tryOnTasks.Store(taskID, task)
			return
		}

		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("HTTP-Referer", appURL)
		httpReq.Header.Set("X-Title", "Voxcina Virtual Try-On")

		fmt.Printf("[tryon-%s] sending request to OpenRouter...\n", taskID)
		client := &http.Client{Timeout: 180 * time.Second}
		resp, err := client.Do(httpReq)
		if err != nil {
			fmt.Printf("[tryon-%s] OpenRouter request error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در ارتباط با سرویس پرو مجازی"
			tryOnTasks.Store(taskID, task)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("[tryon-%s] read response body error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در دریافت پاسخ"
			tryOnTasks.Store(taskID, task)
			return
		}

		if resp.StatusCode != http.StatusOK {
			fmt.Printf("[tryon-%s] OpenRouter non-OK: %d body: %s\n", taskID, resp.StatusCode, string(body)[:min(len(body), 500)])
			errMsg := fmt.Sprintf("سرویس پرو مجازی با خطا مواجه شد (کد %d)", resp.StatusCode)
			bodyStr := string(body)
			if strings.Contains(bodyStr, "limit exceeded") || strings.Contains(bodyStr, "rate") {
				errMsg = "ظرفیت سرویس پرو مجازی به پایان رسیده است. لطفاً بعداً تلاش کنید."
			}
			task.Status = "error"
			task.Error = errMsg
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Fail(context.Background(), tryonID, errMsg, time.Since(startTime).Milliseconds())
			}
			return
		}

		var orResp openRouterTryOnResponse
		if err := json.Unmarshal(body, &orResp); err != nil {
			fmt.Printf("[tryon-%s] json unmarshal error: %v\n", taskID, err)
			task.Status = "error"
			task.Error = "خطا در پردازش پاسخ"
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
			}
			return
		}

		if orResp.Error != nil {
			fmt.Printf("[tryon-%s] OpenRouter API error: %s\n", taskID, orResp.Error.Message)
			task.Status = "error"
			task.Error = "سرویس پرو مجازی با خطا مواجه شد"
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
			}
			return
		}

		if len(orResp.Choices) == 0 {
			fmt.Printf("[tryon-%s] no choices in response\n", taskID)
			task.Status = "error"
			task.Error = "پاسخی از سرویس دریافت نشد"
			tryOnTasks.Store(taskID, task)
			if virtualTryonService != nil {
				_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
			}
			return
		}

		rawContent := orResp.Choices[0].Message.Content

		var savedPath string

		if len(orResp.Choices[0].Message.Images) > 0 {
			imageURL := orResp.Choices[0].Message.Images[0].ImageURL.URL
			if imageURL != "" {
				savedPath, err = saveTryOnImage(imageURL)
				if err != nil {
					fmt.Printf("[tryon-%s] save error (from images field): %v\n", taskID, err)
					task.Status = "error"
					task.Error = "خطا در ذخیره تصویر"
					tryOnTasks.Store(taskID, task)
					if virtualTryonService != nil {
						_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
					}
					return
				}
			}
		}

		if savedPath == "" {
			imageDataURL := extractBase64Image(rawContent)
			if imageDataURL == "" {
				fmt.Printf("[tryon-%s] no image in response\n", taskID)
				task.Status = "error"
				task.Error = "تصویری توسط سرویس تولید نشد"
				tryOnTasks.Store(taskID, task)
				if virtualTryonService != nil {
					_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
				}
				return
			}
			savedPath, err = saveTryOnImage(imageDataURL)
			if err != nil {
				fmt.Printf("[tryon-%s] save error (from content): %v\n", taskID, err)
				task.Status = "error"
				task.Error = "خطا در ذخیره تصویر"
				tryOnTasks.Store(taskID, task)
				if virtualTryonService != nil {
					_ = virtualTryonService.Fail(context.Background(), tryonID, task.Error, time.Since(startTime).Milliseconds())
				}
				return
			}
		}

		fmt.Printf("[tryon-%s] saved to: %s\n", taskID, savedPath)
		task.Status = "done"
		task.Image = savedPath
		tryOnTasks.Store(taskID, task)
		if virtualTryonService != nil {
			_ = virtualTryonService.Complete(context.Background(), tryonID, savedPath, tryOnModel, prompt, time.Since(startTime).Milliseconds())
		}
		fmt.Printf("[tryon-%s] task completed\n", taskID)
	}()

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"task_id":  taskID,
		"tryon_id": tryonID,
		"chat_id":  chatID,
	})
	fmt.Printf("[tryon] --- VirtualTryOn END (task=%s tryon=%s chat=%s) ---\n", taskID, tryonID, chatID)
}

func VirtualTryOnStatus(w http.ResponseWriter, r *http.Request) {
	taskID := r.URL.Query().Get("task_id")
	if taskID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "task_id الزامی است")
		return
	}

	task, ok := loadTryOnTask(taskID)
	if !ok {
		utils.ErrorResponse(w, http.StatusNotFound, "تسک یافت نشد")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status": task.Status,
		"image":  task.Image,
		"error":  task.Error,
	})
}

func VirtualTryOnStatusStream(w http.ResponseWriter, r *http.Request) {
	taskID := r.URL.Query().Get("task_id")
	if taskID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "task_id الزامی است")
		return
	}

	task, ok := loadTryOnTask(taskID)
	if !ok {
		utils.ErrorResponse(w, http.StatusNotFound, "تسک یافت نشد")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		utils.ErrorResponse(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	sendTaskEvent := func(t *tryOnTask) {
		data, _ := json.Marshal(map[string]string{
			"status": t.Status,
			"image":  t.Image,
			"error":  t.Error,
		})
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	if task.Status != "processing" {
		sendTaskEvent(task)
		return
	}

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	timeout := time.After(5 * time.Minute)

	for {
		select {
		case <-r.Context().Done():
			return
		case <-timeout:
			sendTaskEvent(&tryOnTask{Status: "error", Error: "زمان انتظار به پایان رسید"})
			return
		case <-ticker.C:
			t, ok := loadTryOnTask(taskID)
			if !ok {
				sendTaskEvent(&tryOnTask{Status: "error", Error: "تسک یافت نشد"})
				return
			}
			if t.Status != "processing" {
				sendTaskEvent(t)
				return
			}
		}
	}
}

func loadTryOnTask(taskID string) (*tryOnTask, bool) {
	val, ok := tryOnTasks.Load(taskID)
	if !ok {
		return nil, false
	}
	task := val.(*tryOnTask)
	if time.Since(task.CreatedAt) > tryOnTaskTTL {
		tryOnTasks.Delete(taskID)
		return nil, false
	}
	return task, true
}

type openRouterTryOnResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
			Images  []struct {
				ImageURL struct {
					URL string `json:"url"`
				} `json:"image_url"`
			} `json:"images"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

var base64ImageRegex = regexp.MustCompile(`data:image/\w+;base64,[A-Za-z0-9+/=\s]+`)

func extractBase64Image(content string) string {
	match := base64ImageRegex.FindString(content)
	if match != "" {
		return strings.Join(strings.Fields(match), "")
	}

	trimmed := strings.TrimSpace(content)
	if strings.HasPrefix(trimmed, "data:image/") && len(trimmed) > 100 {
		return trimmed
	}

	return ""
}

func cropToAspectRatio(data []byte, targetW, targetH int) ([]byte, string, error) {
	mime := http.DetectContentType(data)

	var src image.Image
	var err error
	switch {
	case strings.Contains(mime, "jpeg") || strings.Contains(mime, "jpg"):
		src, err = jpeg.Decode(bytes.NewReader(data))
	case strings.Contains(mime, "png"):
		src, err = png.Decode(bytes.NewReader(data))
	case strings.Contains(mime, "webp"):
		src, err = webp.Decode(bytes.NewReader(data))
	default:
		src, _, err = image.Decode(bytes.NewReader(data))
	}
	if err != nil {
		return nil, "", fmt.Errorf("decode error: %v", err)
	}

	bounds := src.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	targetRatio := float64(targetW) / float64(targetH)
	currentRatio := float64(w) / float64(h)

	const tolerance = 0.05
	if currentRatio >= targetRatio-tolerance && currentRatio <= targetRatio+tolerance {
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, src, &jpeg.Options{Quality: tryOnImageQuality}); err != nil {
			return nil, "", fmt.Errorf("encode error: %v", err)
		}
		return buf.Bytes(), "image/jpeg", nil
	}

	var cropW, cropH int
	if currentRatio > targetRatio {
		cropH = h
		cropW = int(float64(h) * targetRatio)
	} else {
		cropW = w
		cropH = int(float64(w) / targetRatio)
	}

	x0 := bounds.Min.X + (w-cropW)/2
	y0 := bounds.Min.Y + (h-cropH)/2
	cropped := image.NewRGBA(image.Rect(0, 0, cropW, cropH))
	draw.Draw(cropped, cropped.Bounds(), src, image.Point{x0, y0}, draw.Src)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, cropped, &jpeg.Options{Quality: tryOnImageQuality}); err != nil {
		return nil, "", fmt.Errorf("encode error: %v", err)
	}
	return buf.Bytes(), "image/jpeg", nil
}

func saveTryOnImage(dataURL string) (string, error) {
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid data URL")
	}

	rawData, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("base64 decode error: %v", err)
	}

	croppedData, _, err := cropToAspectRatio(rawData, 3, 4)
	if err != nil {
		return "", fmt.Errorf("crop error: %v", err)
	}

	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	filename := fmt.Sprintf("%s/%d.jpg", uploadDir, time.Now().UnixNano())
	if err := os.WriteFile(filename, croppedData, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}

	return "/" + filename, nil
}

func isTryOnDevMode() bool {
	return os.Getenv("TRYON_DEV_MODE") == "true"
}

var (
	devPlaceholderPath     string
	devPlaceholderPathOnce sync.Once
)

func getDevPlaceholderPath() string {
	devPlaceholderPathOnce.Do(func() {
		path, err := generatePlaceholderImageFixed()
		if err != nil {
			fmt.Printf("[tryon] fixed placeholder error: %v, using timestamped fallback\n", err)
			path, _ = generatePlaceholderImage()
		}
		devPlaceholderPath = path
	})
	return devPlaceholderPath
}

func generatePlaceholderImageFixed() (string, error) {
	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	filename := uploadDir + "/dev_placeholder.png"
	if _, err := os.Stat(filename); err == nil {
		return "/" + filename, nil
	}

	img, err := generatePlaceholderImageBytes()
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(filename, img, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}
	return "/" + filename, nil
}

func generatePlaceholderImage() (string, error) {
	uploadDir := "uploads/products/tryon"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("mkdir error: %v", err)
	}

	img, err := generatePlaceholderImageBytes()
	if err != nil {
		return "", err
	}

	filename := fmt.Sprintf("%s/dev_%d.png", uploadDir, time.Now().UnixNano())
	if err := os.WriteFile(filename, img, 0644); err != nil {
		return "", fmt.Errorf("write error: %v", err)
	}

	return "/" + filename, nil
}

func generatePlaceholderImageBytes() ([]byte, error) {
	width, height := 384, 512

	img := image.NewRGBA(image.Rect(0, 0, width, height))

	bgColor := color.RGBA{R: 26, G: 60, B: 105, A: 255}
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, bgColor)
		}
	}

	borderColor := color.RGBA{R: 244, G: 241, B: 236, A: 255}
	borderWidth := 3
	for y := borderWidth; y < height-borderWidth; y++ {
		for x := borderWidth; x < borderWidth+2; x++ {
			img.Set(x, y, borderColor)
			img.Set(width-1-x, y, borderColor)
		}
	}
	for x := borderWidth; x < width-borderWidth; x++ {
		for y := borderWidth; y < borderWidth+2; y++ {
			img.Set(x, y, borderColor)
			img.Set(x, height-1-y, borderColor)
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, fmt.Errorf("png encode error: %v", err)
	}
	return buf.Bytes(), nil
}

func resizeImageToMaxDimension(data []byte, maxDim int) ([]byte, string, error) {
	mime := http.DetectContentType(data)

	var src image.Image
	var err error
	switch {
	case strings.Contains(mime, "jpeg") || strings.Contains(mime, "jpg"):
		src, err = jpeg.Decode(bytes.NewReader(data))
	case strings.Contains(mime, "png"):
		src, err = png.Decode(bytes.NewReader(data))
	case strings.Contains(mime, "webp"):
		src, err = webp.Decode(bytes.NewReader(data))
	default:
		src, _, err = image.Decode(bytes.NewReader(data))
	}
	if err != nil {
		return nil, "", fmt.Errorf("decode error (%s): %v", mime, err)
	}

	bounds := src.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	src = flattenOnWhite(src, bounds)
	bounds = src.Bounds()

	if w <= maxDim && h <= maxDim {
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, src, &jpeg.Options{Quality: tryOnImageQuality}); err != nil {
			return nil, "", fmt.Errorf("encode error: %v", err)
		}
		return buf.Bytes(), "image/jpeg", nil
	}

	var newW, newH int
	if w > h {
		newW = maxDim
		newH = int(float64(h) * float64(maxDim) / float64(w))
	} else {
		newH = maxDim
		newW = int(float64(w) * float64(maxDim) / float64(h))
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: tryOnImageQuality}); err != nil {
		return nil, "", fmt.Errorf("encode error: %v", err)
	}
	return buf.Bytes(), "image/jpeg", nil
}

func flattenOnWhite(src image.Image, bounds image.Rectangle) image.Image {
	hasAlpha := false
	for y := bounds.Min.Y; y < bounds.Max.Y && !hasAlpha; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := src.At(x, y).RGBA()
			if a != 0xffff {
				hasAlpha = true
				break
			}
		}
	}
	if !hasAlpha {
		return src
	}
	white := image.NewRGBA(bounds)
	draw.Draw(white, bounds, image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.Draw(white, bounds, src, bounds.Min, draw.Over)
	return white
}

func fetchImageFromURL(imageURL string) ([]byte, error) {
	if strings.HasPrefix(imageURL, "/uploads/") {
		cleanPath := filepath.Clean(imageURL)
		if !strings.HasPrefix(cleanPath, "/uploads/") {
			return nil, fmt.Errorf("invalid uploads path: %s", imageURL)
		}
		return os.ReadFile("/app" + cleanPath)
	}

	if strings.HasPrefix(imageURL, "/") {
		baseURL := os.Getenv("APP_URL")
		if baseURL == "" {
			baseURL = "http://localhost:8080"
		}
		imageURL = strings.TrimSuffix(baseURL, "/") + imageURL
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(imageURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// ListUserTryons handles GET /api/tryon/history
// Returns all tryons for the authenticated user, paginated.
func ListUserTryons(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	page := utils.GetIntFromQuery(r, "page", 1)
	limit := utils.GetIntFromQuery(r, "limit", 20)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tryons, total, err := virtualTryonService.ListByUser(ctx, userID, page, limit)
	if err != nil {
		fmt.Printf("[tryon-history] error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت تاریخچه پرو")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"tryons":  tryons,
		"total":   total,
		"page":    page,
		"limit":   limit,
		"pages":   (total + int64(limit) - 1) / int64(limit),
	})
}

// GetTryonByID handles GET /api/tryon/{tryonId}
// Returns one tryon + the chat_id of its room.
func GetTryonByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	vars := mux.Vars(r)
	tryonID := vars["tryonId"]
	if tryonID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "tryon_id الزامی است")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	t, err := virtualTryonService.GetByTryonID(ctx, tryonID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت پرو")
		return
	}
	if t == nil {
		utils.ErrorResponse(w, http.StatusNotFound, "پرو یافت نشد")
		return
	}
	if t.UserID != userID {
		utils.ErrorResponse(w, http.StatusForbidden, "دسترسی غیرمجاز")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"tryon":   t,
	})
}

// ListTryonSessions handles GET /api/tryon/sessions
// Returns a list of fitting rooms for the authenticated user.
func ListTryonSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	page := utils.GetIntFromQuery(r, "page", 1)
	limit := utils.GetIntFromQuery(r, "limit", 20)
	includeArchived := r.URL.Query().Get("include_archived") == "true"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	sessions, total, err := tryonChatService.ListSessionsByUser(ctx, userID, page, limit, includeArchived)
	if err != nil {
		fmt.Printf("[tryon-sessions] error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت جلسات پرو")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"sessions": sessions,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"pages":    (total + int64(limit) - 1) / int64(limit),
	})
}

// GetTryonSession handles GET /api/tryon/sessions/{chatId}
// Returns the full chat transcript + linked tryons for one room.
func GetTryonSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	vars := mux.Vars(r)
	chatID := vars["chatId"]
	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id الزامی است")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	chat, err := tryonChatService.GetByChatID(ctx, chatID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در دریافت جلسه پرو")
		return
	}
	if chat == nil || chat.UserID != userID {
		utils.ErrorResponse(w, http.StatusNotFound, "جلسه پرو یافت نشد")
		return
	}

	tryons, _ := virtualTryonService.ListByChat(ctx, userID, chat.TryonIDs)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chat":    chat,
		"tryons":  tryons,
	})
}

// DeleteTryonSession handles DELETE /api/tryon/sessions/{chatId}
func DeleteTryonSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	vars := mux.Vars(r)
	chatID := vars["chatId"]
	if chatID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id الزامی است")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := tryonChatService.Delete(ctx, chatID, userID); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در حذف جلسه پرو")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "جلسه پرو حذف شد",
	})
}

// AppendTryonMessages handles POST /api/tryon/sessions/messages
// Appends one or more messages to a fitting-room chat. Used by the
// frontend to persist chat turns, tryon cards, and tool calls.
func AppendTryonMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}

	var req struct {
		ChatID  string                   `json:"chat_id"`
		Messages []models.TryonChatMessage `json:"messages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	if req.ChatID == "" || len(req.Messages) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id و messages الزامی هستند")
		return
	}

	// Default timestamps + IDs
	now := time.Now()
	for i := range req.Messages {
		if req.Messages[i].ID == "" {
			req.Messages[i].ID = primitive.NewObjectID().Hex()
		}
		if req.Messages[i].Timestamp.IsZero() {
			req.Messages[i].Timestamp = now
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := tryonChatService.AppendMessages(ctx, req.ChatID, req.Messages, userID); err != nil {
		fmt.Printf("[tryon-messages] append error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در ذخیره پیام‌ها")
		return
	}

	// Record coupons + recommended products into metadata
	for _, m := range req.Messages {
		if m.ToolCall != nil && m.ToolCall.Name == "offer_coupon" {
			if r, ok := m.ToolCall.Result["code"].(string); ok && r != "" {
				_ = tryonChatService.AddCouponCode(ctx, req.ChatID, r)
			}
		}
		if m.TryonData != nil && m.TryonData.ProductID != primitive.NilObjectID {
			_ = tryonChatService.AddRecommendedProduct(ctx, req.ChatID, m.TryonData.ProductID.Hex())
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"chat_id": req.ChatID,
		"count":   len(req.Messages),
	})
}

// LinkTryon handles POST /api/tryon/link
// Adds a tryon_id to a chat's tryon_ids list.
func LinkTryon(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	userID, statusCode, err := getUserIDFromContext(r)
	if err != nil {
		utils.ErrorResponse(w, statusCode, "لطفاً وارد شوید")
		return
	}
	var req struct {
		ChatID  string `json:"chat_id"`
		TryonID string `json:"tryon_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرمت درخواست نامعتبر است")
		return
	}
	if req.ChatID == "" || req.TryonID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "chat_id و tryon_id الزامی هستند")
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := tryonChatService.LinkTryon(ctx, req.ChatID, userID, req.TryonID); err != nil {
		fmt.Printf("[tryon-link] error: %v\n", err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "خطا در اتصال پرو به جلسه")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"success": true})
}

// TryonStatusFromDB is a helper used by status-stream to also surface
// the persisted status. Currently a no-op wrapper; reserved for
// future use.
func tryonStatusFromDB(taskID string) *models.VirtualTryon {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if virtualTryonService == nil {
		return nil
	}
	t, err := virtualTryonService.GetByTaskID(ctx, taskID)
	if err != nil || t == nil {
		return nil
	}
	return t
}
