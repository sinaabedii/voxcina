package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// validateSlider checks the fields an admin controls before a slide is stored.
//
// ButtonLink is the important one: a slide is rendered on every homepage view,
// so a typo'd destination becomes a site-wide dead CTA. Only internal absolute
// paths and https URLs are accepted — protocol-relative and javascript: URLs
// are rejected outright.
func validateSlider(s *models.Slider) string {
	if strings.TrimSpace(s.Title) == "" {
		return "Title is required"
	}

	link := strings.TrimSpace(s.ButtonLink)
	if link == "" {
		return "Button link is required"
	}
	isInternal := strings.HasPrefix(link, "/") && !strings.HasPrefix(link, "//")
	if !isInternal && !strings.HasPrefix(link, "https://") {
		return "Button link must be an internal path starting with / or an https:// URL"
	}

	if s.ContentPosition != "" && !models.IsValidContentPosition(s.ContentPosition) {
		return "Content position must be 'right', 'left' or 'center'"
	}
	if s.OverlayStrength != "" && !models.IsValidOverlayStrength(s.OverlayStrength) {
		return "Overlay strength must be 'none', 'light' or 'dark'"
	}
	if s.StartAt != nil && s.EndAt != nil && s.EndAt.Before(*s.StartAt) {
		return "End date must be after start date"
	}

	return ""
}

// publicSliderFilter matches slides that should be visible to visitors right
// now: published, and inside their scheduling window if one was set. Absent
// startAt/endAt fields count as unbounded, so unscheduled slides always pass.
func publicSliderFilter(now time.Time) bson.M {
	return bson.M{
		"isActive": true,
		"$and": []bson.M{
			{"$or": []bson.M{
				{"startAt": bson.M{"$exists": false}},
				{"startAt": nil},
				{"startAt": bson.M{"$lte": now}},
			}},
			{"$or": []bson.M{
				{"endAt": bson.M{"$exists": false}},
				{"endAt": nil},
				{"endAt": bson.M{"$gte": now}},
			}},
		},
	}
}

// sliderDisplaySort orders slides the way they are presented publicly.
var sliderDisplaySort = bson.D{{Key: "order", Value: 1}, {Key: "createdAt", Value: 1}}

// findSliders runs a slider query and writes the JSON response.
func findSliders(w http.ResponseWriter, filter bson.M) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	cursor, err := collection.Find(ctx, filter, options.Find().SetSort(sliderDisplaySort))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching sliders")
		return
	}
	defer cursor.Close(ctx)

	var sliders []models.Slider
	if err = cursor.All(ctx, &sliders); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding sliders")
		return
	}

	if sliders == nil {
		sliders = []models.Slider{}
	}

	utils.JSONResponse(w, http.StatusOK, sliders)
}

// GetSliders returns the slides currently visible to visitors.
// GET /api/sliders
func GetSliders(w http.ResponseWriter, r *http.Request) {
	findSliders(w, publicSliderFilter(time.Now()))
}

// GetAllSliders returns every slide, published or not, for the admin panel.
// The public endpoint hides unpublished and out-of-window slides, so the admin
// list needs its own unfiltered view to manage drafts and scheduled slides.
// GET /api/admin/sliders
func GetAllSliders(w http.ResponseWriter, r *http.Request) {
	findSliders(w, bson.M{})
}

// GetSliderByID returns a single slider by its ID.
// GET /api/sliders/{id}
func GetSliderByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slider ID not provided in path")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	var slider models.Slider

	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&slider); err != nil {
		if err.Error() == "mongo: no documents in result" {
			utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching slider: "+err.Error())
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, slider)
}

// SliderUploadDir is where slide background images are written.
const SliderUploadDir = "./uploads/sliders"

// Allowed image MIME types for slide backgrounds. Matches allowedImageTypes
// used by hero images; kept separate so the two can diverge.
var allowedSliderImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// parseTimePtr reads an optional RFC3339 timestamp form value. An empty string
// clears the field (returns nil, nil) so an admin can remove a schedule bound.
func parseTimePtr(value string) (*time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// saveSliderImage persists an uploaded slide background and returns its web
// path. The caller removes the file if the surrounding DB write then fails.
func saveSliderImage(file multipart.File, handler *multipart.FileHeader, id primitive.ObjectID) (webPath, diskPath string, err error) {
	if err := os.MkdirAll(SliderUploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("creating upload directory: %w", err)
	}

	ext := filepath.Ext(handler.Filename)
	if ext == "" {
		switch handler.Header.Get("Content-Type") {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
	}

	filename := fmt.Sprintf("%s-%d%s", id.Hex(), time.Now().UnixNano(), ext)
	diskPath = filepath.Join(SliderUploadDir, filename)

	dst, err := os.Create(diskPath)
	if err != nil {
		return "", "", fmt.Errorf("creating image file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(diskPath)
		return "", "", fmt.Errorf("saving image file: %w", err)
	}

	return "/uploads/sliders/" + filename, diskPath, nil
}

// applySliderFormValues reads the slide's scalar fields off a parsed multipart
// form onto s. Only keys actually present are touched, so the same helper backs
// both a full create and a partial update.
func applySliderFormValues(r *http.Request, s *models.Slider) error {
	text := map[string]*string{
		"title":           &s.Title,
		"subtitle":        &s.Subtitle,
		"description":     &s.Description,
		"buttonText":      &s.ButtonText,
		"buttonLink":      &s.ButtonLink,
		"badge":           &s.Badge,
		"bgColor":         &s.BgColor,
		"accentColor":     &s.AccentColor,
		"discount":        &s.Discount,
		"contentPosition": &s.ContentPosition,
		"overlayStrength": &s.OverlayStrength,
	}
	for key, target := range text {
		if r.Form.Has(key) {
			*target = r.FormValue(key)
		}
	}

	if r.Form.Has("isActive") {
		s.IsActive, _ = strconv.ParseBool(r.FormValue("isActive"))
	}

	if r.Form.Has("order") {
		order, err := strconv.Atoi(r.FormValue("order"))
		if err != nil {
			return fmt.Errorf("order must be a whole number")
		}
		s.Order = order
	}

	// features and stats are structured, so they ride along as JSON strings.
	if r.Form.Has("features") {
		var features []string
		if raw := r.FormValue("features"); raw != "" {
			if err := json.Unmarshal([]byte(raw), &features); err != nil {
				return fmt.Errorf("features must be a JSON array of strings")
			}
		}
		s.Features = features
	}

	if r.Form.Has("stats") {
		var stats models.SliderStats
		if raw := r.FormValue("stats"); raw != "" {
			if err := json.Unmarshal([]byte(raw), &stats); err != nil {
				return fmt.Errorf("stats must be a JSON object")
			}
		}
		s.Stats = stats
	}

	if r.Form.Has("startAt") {
		startAt, err := parseTimePtr(r.FormValue("startAt"))
		if err != nil {
			return fmt.Errorf("startAt must be an RFC3339 timestamp")
		}
		s.StartAt = startAt
	}

	if r.Form.Has("endAt") {
		endAt, err := parseTimePtr(r.FormValue("endAt"))
		if err != nil {
			return fmt.Errorf("endAt must be an RFC3339 timestamp")
		}
		s.EndAt = endAt
	}

	return nil
}

// CreateSlider adds a new slider from a multipart form.
//
// The background image may arrive either as an uploaded `image` file or, as a
// fallback, an `image` form value holding an existing path.
// POST /api/admin/sliders
func CreateSlider(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
		return
	}

	sliderID := primitive.NewObjectID()
	slider := models.Slider{ID: sliderID}

	if err := applySliderFormValues(r, &slider); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	var diskPath string
	if file, handler, err := r.FormFile("image"); err == nil {
		defer file.Close()

		if !allowedSliderImageTypes[handler.Header.Get("Content-Type")] {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image file format. Allowed: JPEG, PNG, WebP")
			return
		}

		webPath, saved, err := saveSliderImage(file, handler, sliderID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving image: "+err.Error())
			return
		}
		slider.Image, diskPath = webPath, saved
	} else {
		// URL fallback: no file uploaded, so `image` must name an existing path.
		slider.Image = strings.TrimSpace(r.FormValue("image"))
	}

	if slider.Image == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "A background image file or image path is required")
		return
	}

	if msg := validateSlider(&slider); msg != "" {
		if diskPath != "" {
			os.Remove(diskPath)
		}
		utils.ErrorResponse(w, http.StatusBadRequest, msg)
		return
	}

	slider.CreatedAt = time.Now()
	slider.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	if _, err := collection.InsertOne(ctx, slider); err != nil {
		if diskPath != "" {
			os.Remove(diskPath) // Don't leak the file when the write fails.
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating slider: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, slider)
}

// UpdateSlider updates an existing slider.
// PUT /api/sliders/{id}
func UpdateSlider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slider ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID")
		return
	}

	ctxLoad, cancelLoad := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelLoad()

	// Load the current slide first so omitted form keys keep their stored value
	// — the form posts only what the admin actually edited.
	var slider models.Slider
	if err := db.Database.Collection("sliders").FindOne(ctxLoad, bson.M{"_id": objID}).Decode(&slider); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		return
	}
	previousImage := slider.Image

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
		return
	}

	if err := applySliderFormValues(r, &slider); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// A replacement background is optional on update.
	var diskPath string
	if file, handler, err := r.FormFile("image"); err == nil {
		defer file.Close()

		if !allowedSliderImageTypes[handler.Header.Get("Content-Type")] {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image file format. Allowed: JPEG, PNG, WebP")
			return
		}

		webPath, saved, err := saveSliderImage(file, handler, objID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving image: "+err.Error())
			return
		}
		slider.Image, diskPath = webPath, saved
	} else if r.Form.Has("image") {
		slider.Image = strings.TrimSpace(r.FormValue("image"))
	}

	if msg := validateSlider(&slider); msg != "" {
		if diskPath != "" {
			os.Remove(diskPath)
		}
		utils.ErrorResponse(w, http.StatusBadRequest, msg)
		return
	}

	slider.UpdatedAt = time.Now()

	// Explicit whitelist: the request must never be able to overwrite _id
	// or createdAt.
	update := bson.M{
		"$set": bson.M{
			"title":           slider.Title,
			"subtitle":        slider.Subtitle,
			"description":     slider.Description,
			"image":           slider.Image,
			"buttonText":      slider.ButtonText,
			"buttonLink":      slider.ButtonLink,
			"badge":           slider.Badge,
			"bgColor":         slider.BgColor,
			"accentColor":     slider.AccentColor,
			"discount":        slider.Discount,
			"features":        slider.Features,
			"stats":           slider.Stats,
			"order":           slider.Order,
			"contentPosition": slider.ContentPosition,
			"overlayStrength": slider.OverlayStrength,
			"startAt":         slider.StartAt,
			"endAt":           slider.EndAt,
			"isActive":        slider.IsActive,
			"updatedAt":       slider.UpdatedAt,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	result, err := collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		if diskPath != "" {
			os.Remove(diskPath)
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating slider: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		if diskPath != "" {
			os.Remove(diskPath)
		}
		utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		return
	}

	// The replaced upload is unreferenced now that the write landed. Only remove
	// files this module owns — a URL-fallback path may point anywhere.
	if diskPath != "" && previousImage != "" && previousImage != slider.Image &&
		strings.HasPrefix(previousImage, "/uploads/sliders/") {
		os.Remove("." + previousImage)
	}

	utils.JSONResponse(w, http.StatusOK, slider)
}

// ReorderSliders applies a new display order to several slides at once.
//
// Reordering is inherently multi-document: swapping two slides changes both, and
// applying those as separate requests can leave the list inconsistent if one
// fails. A single bulk write keeps the sequence coherent.
// PATCH /api/admin/sliders/reorder
func ReorderSliders(w http.ResponseWriter, r *http.Request) {
	var payload []struct {
		ID    string `json:"id"`
		Order int    `json:"order"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if len(payload) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "At least one slider is required")
		return
	}

	now := time.Now()
	writes := make([]mongo.WriteModel, 0, len(payload))
	for _, item := range payload {
		objID, err := primitive.ObjectIDFromHex(item.ID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID: "+item.ID)
			return
		}

		writes = append(writes, mongo.NewUpdateOneModel().
			SetFilter(bson.M{"_id": objID}).
			SetUpdate(bson.M{"$set": bson.M{"order": item.Order, "updatedAt": now}}))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")
	result, err := collection.BulkWrite(ctx, writes, options.BulkWrite().SetOrdered(false))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error reordering sliders: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":  "Sliders reordered successfully",
		"matched":  result.MatchedCount,
		"modified": result.ModifiedCount,
	})
}

// DeleteSlider deletes a slider by its ID.
// DELETE /api/sliders/{id}
func DeleteSlider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slider ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid Slider ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("sliders")

	// Read the image path before the document goes away so the upload it owns
	// can be removed too, instead of accumulating in uploads/sliders forever.
	var existing models.Slider
	_ = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting slider")
		return
	}

	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Slider not found")
		return
	}

	if strings.HasPrefix(existing.Image, "/uploads/sliders/") {
		os.Remove("." + existing.Image)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Slider deleted successfully"})
}
