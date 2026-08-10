package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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
	"go.mongodb.org/mongo-driver/mongo/options"
)

const HeroUploadDir = "./uploads/hero"

// Allowed image MIME types for hero images
var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// GetHeroImages returns active hero images for public display.
// GET /api/hero-images
// Query params:
//   - device: filter by device type ("desktop" or "mobile")
func GetHeroImages(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("hero_images")

	// Build filter - only active images for public endpoint
	filter := bson.M{"isActive": true}

	// Optional device type filter
	deviceType := r.URL.Query().Get("device")
	if deviceType != "" {
		if !models.IsValidDeviceType(deviceType) {
			utils.ErrorResponse(w, http.StatusBadRequest, "Device type must be 'desktop' or 'mobile'")
			return
		}
		filter["deviceType"] = deviceType
	}

	// Sort by display order ascending
	findOptions := options.Find().SetSort(bson.D{{Key: "displayOrder", Value: 1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"heroImages": []models.HeroImage{},
		})
		return
	}
	defer cursor.Close(ctx)

	var heroImages []models.HeroImage
	if err = cursor.All(ctx, &heroImages); err != nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"heroImages": []models.HeroImage{},
		})
		return
	}

	// Return empty array instead of null
	if heroImages == nil {
		heroImages = []models.HeroImage{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"heroImages": heroImages,
	})
}

// GetAllHeroImages returns all hero images for admin panel.
// GET /api/admin/hero-images
// Query params:
//   - device: filter by device type ("desktop" or "mobile")
func GetAllHeroImages(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("hero_images")

	// Build filter - no active filter for admin
	filter := bson.M{}

	// Optional device type filter
	deviceType := r.URL.Query().Get("device")
	if deviceType != "" {
		if !models.IsValidDeviceType(deviceType) {
			utils.ErrorResponse(w, http.StatusBadRequest, "Device type must be 'desktop' or 'mobile'")
			return
		}
		filter["deviceType"] = deviceType
	}

	// Sort by display order ascending
	findOptions := options.Find().SetSort(bson.D{{Key: "displayOrder", Value: 1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching hero images")
		return
	}
	defer cursor.Close(ctx)

	var heroImages []models.HeroImage
	if err = cursor.All(ctx, &heroImages); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding hero images")
		return
	}

	// Return empty array instead of null
	if heroImages == nil {
		heroImages = []models.HeroImage{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"heroImages": heroImages,
	})
}


// CreateHeroImage handles creating a new hero image with file upload.
// POST /api/admin/hero-images
func CreateHeroImage(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
		return
	}

	// Get form values
	deviceType := r.FormValue("deviceType")
	isActiveStr := r.FormValue("isActive")
	gradient := r.FormValue("gradient")
	noGradientStr := r.FormValue("noGradient")
	displayOrderStr := r.FormValue("displayOrder")
	contentStr := r.FormValue("content")

	// Validate required fields
	if deviceType == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Missing required field: deviceType")
		return
	}

	if !models.IsValidDeviceType(deviceType) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Device type must be 'desktop' or 'mobile'")
		return
	}

	// Get image file
	file, handler, err := r.FormFile("image")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Missing required field: image")
		return
	}
	defer file.Close()

	// Validate file type
	contentType := handler.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image file format. Allowed: JPEG, PNG, WebP")
		return
	}

	// Parse optional fields
	isActive := false
	if isActiveStr != "" {
		isActive, _ = strconv.ParseBool(isActiveStr)
	}

	noGradient := false
	if noGradientStr != "" {
		noGradient, _ = strconv.ParseBool(noGradientStr)
	}

	displayOrder := 0
	if displayOrderStr != "" {
		displayOrder, _ = strconv.Atoi(displayOrderStr)
	}

	var content interface{}
	if contentStr != "" {
		if err := json.Unmarshal([]byte(contentStr), &content); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid content payload: "+err.Error())
			return
		}
	}

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(HeroUploadDir, 0755); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory")
		return
	}

	// Generate unique filename
	heroImageID := primitive.NewObjectID()
	ext := filepath.Ext(handler.Filename)
	if ext == "" {
		// Determine extension from content type
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
	}
	filename := fmt.Sprintf("%s-%d%s", heroImageID.Hex(), time.Now().UnixNano(), ext)
	filePath := filepath.Join(HeroUploadDir, filename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating image file")
		return
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath) // Clean up on failure
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving image file")
		return
	}

	// Create web path for database storage
	webPath := "/uploads/hero/" + filename

	// Create hero image document
	heroImage := models.HeroImage{
		ID:           heroImageID,
		Image:        webPath,
		DeviceType:   deviceType,
		IsActive:     isActive,
		Gradient:     gradient,
		NoGradient:   noGradient,
		DisplayOrder: displayOrder,
		Content:      content,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Insert into database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("hero_images")
	_, err = collection.InsertOne(ctx, heroImage)
	if err != nil {
		os.Remove(filePath) // Clean up file on DB failure
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating hero image: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, heroImage)
}


// UpdateHeroImage handles updating an existing hero image.
// PUT /api/admin/hero-images/{id}
func UpdateHeroImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Hero image ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid hero image ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("hero_images")

	// Fetch existing hero image
	var existingHeroImage models.HeroImage
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&existingHeroImage)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Hero image not found")
		return
	}

	// Check content type to determine how to process the request
	contentType := r.Header.Get("Content-Type")

	var updateFields bson.M
	var newFilePath string
	var oldFilePath string

	if strings.Contains(contentType, "multipart/form-data") {
		// Handle multipart form (with potential file upload)
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
			return
		}

		updateFields = bson.M{}

		// Handle optional image file upload
		file, handler, err := r.FormFile("image")
		if err == nil {
			defer file.Close()

			// Validate file type
			fileContentType := handler.Header.Get("Content-Type")
			if !allowedImageTypes[fileContentType] {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image file format. Allowed: JPEG, PNG, WebP")
				return
			}

			// Create upload directory if it doesn't exist
			if err := os.MkdirAll(HeroUploadDir, 0755); err != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory")
				return
			}

			// Generate unique filename
			ext := filepath.Ext(handler.Filename)
			if ext == "" {
				switch fileContentType {
				case "image/jpeg":
					ext = ".jpg"
				case "image/png":
					ext = ".png"
				case "image/webp":
					ext = ".webp"
				}
			}
			filename := fmt.Sprintf("%s-%d%s", objID.Hex(), time.Now().UnixNano(), ext)
			newFilePath = filepath.Join(HeroUploadDir, filename)

			// Create destination file
			dst, err := os.Create(newFilePath)
			if err != nil {
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating image file")
				return
			}
			defer dst.Close()

			// Copy file content
			if _, err := io.Copy(dst, file); err != nil {
				os.Remove(newFilePath)
				utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving image file")
				return
			}

			// Store old file path for cleanup after successful update
			oldFilePath = "." + existingHeroImage.Image
			updateFields["image"] = "/uploads/hero/" + filename
		}

		// Update other fields from form
		if deviceType := r.FormValue("deviceType"); deviceType != "" {
			if !models.IsValidDeviceType(deviceType) {
				if newFilePath != "" {
					os.Remove(newFilePath)
				}
				utils.ErrorResponse(w, http.StatusBadRequest, "Device type must be 'desktop' or 'mobile'")
				return
			}
			updateFields["deviceType"] = deviceType
		}

		if isActiveStr := r.FormValue("isActive"); isActiveStr != "" {
			isActive, _ := strconv.ParseBool(isActiveStr)
			updateFields["isActive"] = isActive
		}

		if gradient := r.FormValue("gradient"); gradient != "" || r.Form.Has("gradient") {
			updateFields["gradient"] = gradient
		}

		if noGradientStr := r.FormValue("noGradient"); noGradientStr != "" {
			noGradient, _ := strconv.ParseBool(noGradientStr)
			updateFields["noGradient"] = noGradient
		}

		if displayOrderStr := r.FormValue("displayOrder"); displayOrderStr != "" {
			displayOrder, _ := strconv.Atoi(displayOrderStr)
			updateFields["displayOrder"] = displayOrder
		}

		if contentStr := r.FormValue("content"); contentStr != "" {
			var content interface{}
			if err := json.Unmarshal([]byte(contentStr), &content); err != nil {
				if newFilePath != "" {
					os.Remove(newFilePath)
				}
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid content payload: "+err.Error())
				return
			}
			updateFields["content"] = content
		}

	} else {
		// Handle JSON request (no file upload)
		var updateData struct {
			DeviceType   *string         `json:"deviceType"`
			IsActive     *bool           `json:"isActive"`
			Gradient     *string         `json:"gradient"`
			NoGradient   *bool           `json:"noGradient"`
			DisplayOrder *int            `json:"displayOrder"`
			Content      json.RawMessage `json:"content"`
		}

		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		updateFields = bson.M{}

		if updateData.DeviceType != nil {
			if !models.IsValidDeviceType(*updateData.DeviceType) {
				utils.ErrorResponse(w, http.StatusBadRequest, "Device type must be 'desktop' or 'mobile'")
				return
			}
			updateFields["deviceType"] = *updateData.DeviceType
		}

		if updateData.IsActive != nil {
			updateFields["isActive"] = *updateData.IsActive
		}

		if updateData.Gradient != nil {
			updateFields["gradient"] = *updateData.Gradient
		}

		if updateData.NoGradient != nil {
			updateFields["noGradient"] = *updateData.NoGradient
		}

		if updateData.DisplayOrder != nil {
			updateFields["displayOrder"] = *updateData.DisplayOrder
		}

		if len(updateData.Content) > 0 {
			var content interface{}
			if err := json.Unmarshal(updateData.Content, &content); err != nil {
				utils.ErrorResponse(w, http.StatusBadRequest, "Invalid content payload: "+err.Error())
				return
			}
			updateFields["content"] = content
		}
	}

	// Always update the updatedAt timestamp
	updateFields["updatedAt"] = time.Now()

	// Perform update
	update := bson.M{"$set": updateFields}
	result, err := collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		if newFilePath != "" {
			os.Remove(newFilePath)
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating hero image: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		if newFilePath != "" {
			os.Remove(newFilePath)
		}
		utils.ErrorResponse(w, http.StatusNotFound, "Hero image not found")
		return
	}

	// Clean up old file if new one was uploaded successfully
	if oldFilePath != "" && newFilePath != "" {
		os.Remove(oldFilePath)
	}

	// Fetch and return updated hero image
	var updatedHeroImage models.HeroImage
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&updatedHeroImage)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching updated hero image")
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedHeroImage)
}


// DeleteHeroImage handles deleting a hero image and its file.
// DELETE /api/admin/hero-images/{id}
func DeleteHeroImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Hero image ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid hero image ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("hero_images")

	// Fetch hero image to get file path before deletion
	var heroImage models.HeroImage
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&heroImage)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Hero image not found")
		return
	}

	// Delete from database
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting hero image")
		return
	}

	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Hero image not found")
		return
	}

	// Delete the image file (best effort - don't fail if file doesn't exist)
	if heroImage.Image != "" {
		filePath := "." + heroImage.Image
		if err := os.Remove(filePath); err != nil {
			// Log but don't fail - file might already be deleted
			fmt.Printf("Warning: Could not delete hero image file %s: %v\n", filePath, err)
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Hero image deleted successfully",
	})
}

// GetHeroImageByID returns a single hero image by ID.
// GET /api/admin/hero-images/{id}
func GetHeroImageByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Hero image ID not provided")
		return
	}

	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid hero image ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("hero_images")
	var heroImage models.HeroImage

	if err := collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&heroImage); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Hero image not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, heroImage)
}
