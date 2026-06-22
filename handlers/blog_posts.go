package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
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
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// Utility function to generate a URL-friendly slug from title
func generateSlug(title string) string {
	// Convert to lowercase and replace spaces with hyphens
	slug := strings.ToLower(strings.TrimSpace(title))
	slug = strings.ReplaceAll(slug, " ", "-")
	
	// Remove special characters, keep only alphanumeric and hyphens
	reg := regexp.MustCompile("[^a-z0-9-]+")
	slug = reg.ReplaceAllString(slug, "")
	
	// Remove multiple consecutive hyphens
	reg = regexp.MustCompile("-+")
	slug = reg.ReplaceAllString(slug, "-")
	
	// Remove leading/trailing hyphens
	slug = strings.Trim(slug, "-")
	
	return slug
}

// Utility function to estimate read time based on word count
func estimateReadTime(content string) int {
	// Average reading speed is about 200-250 words per minute
	words := strings.Fields(content)
	wordCount := len(words)
	readTime := wordCount / 200 // Using 200 WPM
	if readTime < 1 {
		readTime = 1 // Minimum 1 minute
	}
	return readTime
}

// GetBlogPosts handles GET /api/blog-posts
// Returns a paginated list of published blog posts
func GetBlogPosts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters for pagination and filtering
	pageQuery := r.URL.Query().Get("page")
	limitQuery := r.URL.Query().Get("limit")
	categoryQuery := r.URL.Query().Get("category")
	tagQuery := r.URL.Query().Get("tag")
	searchQuery := r.URL.Query().Get("search")

	page, err := strconv.ParseInt(pageQuery, 10, 64)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.ParseInt(limitQuery, 10, 64)
	if err != nil || limit < 1 {
		limit = 10
	}
	skip := (page - 1) * limit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	// Build filter for published and active posts
	filter := bson.M{
		"is_published": true,
		"is_active":    true,
	}

	// Add category filter if specified
	if categoryQuery != "" {
		filter["category"] = bson.M{"$regex": categoryQuery, "$options": "i"}
	}

	// Add tag filter if specified
	if tagQuery != "" {
		filter["tags"] = bson.M{"$in": []string{tagQuery}}
	}

	// Add search filter if specified (search in title, excerpt, and content)
	if searchQuery != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": searchQuery, "$options": "i"}},
			{"excerpt": bson.M{"$regex": searchQuery, "$options": "i"}},
			{"content": bson.M{"$regex": searchQuery, "$options": "i"}},
		}
	}

	// Set find options
	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "published_at", Value: -1}}) // Sort by published date, newest first

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog posts: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var blogPosts []models.BlogPost
	if err = cursor.All(ctx, &blogPosts); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding blog posts: "+err.Error())
		return
	}

	if blogPosts == nil {
		blogPosts = []models.BlogPost{}
	}

	// Get total count for pagination
	totalPosts, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog posts count: "+err.Error())
		return
	}

	// Prepare pagination response
	response := struct {
		Data       []models.BlogPost `json:"data"`
		Total      int64             `json:"total"`
		Page       int64             `json:"page"`
		Limit      int64             `json:"limit"`
		TotalPages int64             `json:"totalPages"`
	}{
		Data:       blogPosts,
		Total:      totalPosts,
		Page:       page,
		Limit:      limit,
		TotalPages: (totalPosts + limit - 1) / limit,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// GetBlogPostBySlug handles GET /api/blog-posts/{slug}
// Returns a single blog post by its slug
func GetBlogPostBySlug(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["slug"]

	if slug == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Blog post slug is required")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	var blogPost models.BlogPost
	filter := bson.M{
		"slug":         slug,
		"is_published": true,
		"is_active":    true,
	}

	if err := collection.FindOne(ctx, filter).Decode(&blogPost); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog post: "+err.Error())
		}
		return
	}

	utils.JSONResponse(w, http.StatusOK, blogPost)
}

// CreateBlogPost handles POST /api/admin/blog-posts
// Creates a new blog post (admin only)
func CreateBlogPost(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 5MB)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
		return
	}
	// Extract form fields
	title := r.FormValue("title")
	excerpt := r.FormValue("excerpt")
	content := r.FormValue("content")
	slug := r.FormValue("slug")
	if title == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Title is required")
		return
	}
	if content == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Content is required")
		return
	}
	if slug == "" {
		slug = generateSlug(title)
		if slug == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "Could not generate valid slug from title")
			return
		}
	}
	// Parse tags JSON
	var tags []string
	if tagsJSON := r.FormValue("tags"); tagsJSON != "" {
		if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid tags format: "+err.Error())
			return
		}
	}
	// Parse isPublished flag
	isPublished := false
	if val := r.FormValue("isPublished"); val != "" {
		isPublished, _ = strconv.ParseBool(val)
	}
	// Handle coverImage upload
	var coverImagePath string
	file, header, err := r.FormFile("coverImage")
	if err != nil && err != http.ErrMissingFile {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error retrieving cover image: "+err.Error())
		return
	}
	if file != nil {
		defer file.Close()
		uploadDir := "./uploads/blog"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory: "+err.Error())
			return
		}
		ext := filepath.Ext(header.Filename)
		filename := fmt.Sprintf("%s-%d%s", slug, time.Now().UnixNano(), ext)
		filePath := filepath.Join(uploadDir, filename)
		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating file: "+err.Error())
			return
		}
		defer dst.Close()
		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving file: "+err.Error())
			return
		}
		coverImagePath = "/uploads/blog/" + filename
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	collection := db.Database.Collection("blog_posts")

	// Check if slug already exists
	existingCount, err := collection.CountDocuments(ctx, bson.M{"slug": slug})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error checking slug uniqueness: "+err.Error())
		return
	}
	if existingCount > 0 {
		// Add timestamp to make slug unique
		slug = slug + "-" + strconv.FormatInt(time.Now().Unix(), 10)
	}

	// Calculate read time
	readTime := estimateReadTime(content)

	// Create blog post
	now := time.Now()
	var publishedAt *time.Time
	if isPublished {
		publishedAt = &now
	}

	blogPost := models.BlogPost{
		ID:          primitive.NewObjectID(),
		Title:       title,
		Slug:        slug,
		Excerpt:     excerpt,
		Content:     content,
		CoverImage:  coverImagePath,
		Author:      models.BlogAuthor{},
		Category:    r.FormValue("category"),
		Tags:        tags,
		ReadTime:    readTime,
		IsPublished: isPublished,
		IsActive:    true,
		PublishedAt: publishedAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	_, err = collection.InsertOne(ctx, blogPost)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating blog post: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, blogPost)
}

// UpdateBlogPost handles PUT /api/admin/blog-posts/{id}
// Updates an existing blog post (admin only)
func UpdateBlogPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	blogPostID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID format")
		return
	}
	// Parse multipart form for updates (max 5MB)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	// Fetch existing blog post
	var existingPost models.BlogPost
	if err := collection.FindOne(ctx, bson.M{"_id": blogPostID}).Decode(&existingPost); err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog post: "+err.Error())
		}
		return
	}

	// Build update document
	updateFields := bson.M{}

	if val := r.FormValue("title"); val != "" {
		updateFields["title"] = val
		// Update slug if title changes
		newSlug := generateSlug(val)
		if newSlug != existingPost.Slug {
			// Check if new slug already exists
			count, err := collection.CountDocuments(ctx, bson.M{
				"slug": newSlug,
				"_id":  bson.M{"$ne": blogPostID},
			})
			if err == nil && count == 0 {
				updateFields["slug"] = newSlug
			}
		}
	}

	if val := r.FormValue("excerpt"); val != "" {
		updateFields["excerpt"] = val
	}

	if val := r.FormValue("content"); val != "" {
		updateFields["content"] = val
		// Recalculate read time if content changes
		updateFields["read_time"] = estimateReadTime(val)
	}

	// Handle new cover image upload
	if file, header, err := r.FormFile("coverImage"); err == nil && file != nil {
		defer file.Close()
		uploadDir := "./uploads/blog"
		if err := os.MkdirAll(uploadDir, 0755); err == nil {
			ext := filepath.Ext(header.Filename)
			filename := fmt.Sprintf("%s-%d%s", blogPostID.Hex(), time.Now().UnixNano(), ext)
			filePath := filepath.Join(uploadDir, filename)
			if dst, err := os.Create(filePath); err == nil {
				io.Copy(dst, file)
				dst.Close()
				updateFields["cover_image"] = "/uploads/blog/" + filename
			}
		}
	}

	if val := r.FormValue("category"); val != "" {
		updateFields["category"] = val
	}

	if val := r.FormValue("isPublished"); val != "" {
		isPub, _ := strconv.ParseBool(val)
		updateFields["is_published"] = isPub
		// Set published_at if changing from unpublished to published
		if isPub && !existingPost.IsPublished {
			now := time.Now()
			updateFields["published_at"] = now
		} else if !isPub {
			updateFields["published_at"] = nil
		}
	}

	if len(updateFields) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "No valid fields to update")
		return
	}

	updateFields["updated_at"] = time.Now()

	// Perform update
	result, err := collection.UpdateOne(ctx, bson.M{"_id": blogPostID}, bson.M{"$set": updateFields})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating blog post: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		return
	}

	// Fetch and return updated blog post
	var updatedPost models.BlogPost
	if err := collection.FindOne(ctx, bson.M{"_id": blogPostID}).Decode(&updatedPost); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching updated blog post: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedPost)
}

// DeleteBlogPost handles DELETE /api/admin/blog-posts/{id}
// Soft deletes a blog post (admin only)
func DeleteBlogPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	blogPostID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	// Perform soft delete
	result, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": blogPostID},
		bson.M{
			"$set": bson.M{
				"is_active":  false,
				"updated_at": time.Now(),
			},
		},
	)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting blog post: "+err.Error())
		return
	}

	if result.MatchedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Blog post deleted successfully",
	})
}

// GetAllBlogPosts handles GET /api/admin/blog-posts
// Returns all blog posts (including unpublished) for admin use
func GetAllBlogPosts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	pageQuery := r.URL.Query().Get("page")
	limitQuery := r.URL.Query().Get("limit")
	statusQuery := r.URL.Query().Get("status") // published, unpublished, all

	page, err := strconv.ParseInt(pageQuery, 10, 64)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.ParseInt(limitQuery, 10, 64)
	if err != nil || limit < 1 {
		limit = 10
	}
	skip := (page - 1) * limit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	// Build filter
	filter := bson.M{"is_active": true}
	switch statusQuery {
	case "published":
		filter["is_published"] = true
	case "unpublished":
		filter["is_published"] = false
	case "all":
		// No additional filter
	default:
		// Default to all active posts
	}

	// Set find options
	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limit)
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort by creation date, newest first

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog posts: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var blogPosts []models.BlogPost
	if err = cursor.All(ctx, &blogPosts); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding blog posts: "+err.Error())
		return
	}

	if blogPosts == nil {
		blogPosts = []models.BlogPost{}
	}

	// Get total count for pagination
	totalPosts, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog posts count: "+err.Error())
		return
	}

	// Prepare pagination response
	response := struct {
		Data       []models.BlogPost `json:"data"`
		Total      int64             `json:"total"`
		Page       int64             `json:"page"`
		Limit      int64             `json:"limit"`
		TotalPages int64             `json:"totalPages"`
	}{
		Data:       blogPosts,
		Total:      totalPosts,
		Page:       page,
		Limit:      limit,
		TotalPages: (totalPosts + limit - 1) / limit,
	}

	utils.JSONResponse(w, http.StatusOK, response)
}

// GetBlogCategories handles GET /api/blog/categories
// Returns all unique blog categories
func GetBlogCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	// Get distinct categories from published posts
	categories, err := collection.Distinct(ctx, "category", bson.M{
		"is_published": true,
		"is_active":    true,
		"category":     bson.M{"$ne": ""},
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog categories: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, categories)
}

// GetBlogTags handles GET /api/blog/tags
// Returns all unique blog tags
func GetBlogTags(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := db.Database.Collection("blog_posts")

	// Aggregate to get all unique tags
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"is_published": true,
				"is_active":    true,
			},
		},
		{
			"$unwind": "$tags",
		},
		{
			"$group": bson.M{
				"_id": "$tags",
			},
		},
		{
			"$sort": bson.M{
				"_id": 1,
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog tags: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err = cursor.All(ctx, &result); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding blog tags: "+err.Error())
		return
	}

	// Extract tags from the aggregation result
	var tags []string
	for _, item := range result {
		if tag, ok := item["_id"].(string); ok && tag != "" {
			tags = append(tags, tag)
		}
	}

	if tags == nil {
		tags = []string{}
	}

	utils.JSONResponse(w, http.StatusOK, tags)
} 