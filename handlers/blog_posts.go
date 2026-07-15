package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
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
	"backEnd/services"
	"backEnd/utils"
)

// BlogUploadDir is where blog media files are stored.
const BlogUploadDir = "./uploads/blog-media"

var allowedBlogImageMimes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// ---------- Public Handlers ----------

// GetBlogPosts returns paginated published blog posts.
func GetBlogPosts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	page, _ := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit < 1 || limit > 50 {
		limit = 10
	}

	repo := services.NewBlogRepository(db.Database)
	posts, total, err := repo.FindPublishedPosts(ctx, page, limit,
		r.URL.Query().Get("category"),
		r.URL.Query().Get("tag"),
		r.URL.Query().Get("search"),
	)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
				"data":       []models.BlogPost{},
				"total":      0,
				"page":       page,
				"limit":      limit,
				"totalPages": 0,
			})
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog posts: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data":       posts,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + limit - 1) / limit,
	})
}

// GetBlogPostBySlug returns a single published blog post with blocks and media.
func GetBlogPostBySlug(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["slug"]
	if slug == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Blog post slug is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	post, err := repo.FindPostBySlug(ctx, slug)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Blog post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog post: "+err.Error())
		}
		return
	}

	// Fetch associated media
	media, err := repo.FindMediaByPostID(ctx, post.ID)
	if err == nil && len(media) > 0 {
		// Attach media to blocks (public paths only)
		mediaMap := make(map[string]models.BlogMedia)
		for _, m := range media {
			mediaMap[m.Slot] = m
		}
		for i := range post.Blocks {
			if post.Blocks[i].Type == models.BlockTypeImage {
				if m, ok := mediaMap[post.Blocks[i].ImageSlotID]; ok {
					post.Blocks[i].ImageID = m.PublicPath
				}
			}
		}
		if m, ok := mediaMap["cover"]; ok {
			post.CoverImageID = m.PublicPath
		}
	}

	utils.JSONResponse(w, http.StatusOK, post)
}

// GetBlogCategories returns distinct categories from published posts.
func GetBlogCategories(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	categories, err := repo.GetDistinctCategories(ctx)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching categories: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, categories)
}

// GetBlogTags returns distinct tags from published posts.
func GetBlogTags(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	tags, err := repo.GetDistinctTags(ctx)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching tags: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, tags)
}

// ---------- Admin: Pipeline Runs ----------

// CreatePipelineRun starts a new blog pipeline run.
func CreatePipelineRun(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var brief models.GenerationBrief
	if err := json.NewDecoder(r.Body).Decode(&brief); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if brief.Topic == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Topic is required")
		return
	}
	if brief.Locale == "" {
		brief.Locale = "fa"
	}
	if brief.Tone == "" {
		brief.Tone = "professional"
	}
	if brief.DesiredLength <= 0 {
		brief.DesiredLength = 1000
	}

	repo := services.NewBlogRepository(db.Database)
	run := &models.BlogPipelineRun{
		Topic:             brief.Topic,
		Locale:            brief.Locale,
		TargetAudience:    brief.TargetAudience,
		DesiredLength:     brief.DesiredLength,
		Tone:              brief.Tone,
		Keywords:          brief.Keywords,
		Category:          brief.Category,
		SourcePreferences: brief.SourcePreferences,
		AdditionalNotes:   brief.AdditionalNotes,
		Status:            models.PipelineBrief,
		CreatedBy:         getAdminUserID(r),
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := repo.InsertPipelineRun(ctx, run); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating pipeline run: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, run)
}

// GetPipelineRuns returns paginated pipeline runs.
func GetPipelineRuns(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	page, _ := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit < 1 || limit > 50 {
		limit = 10
	}

	repo := services.NewBlogRepository(db.Database)
	runs, total, err := repo.ListPipelineRuns(ctx, page, limit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching pipeline runs: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data":       runs,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + limit - 1) / limit,
	})
}

// GetPipelineRunByID returns a single pipeline run with executions and sources.
func GetPipelineRunByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid pipeline run ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	run, err := repo.FindPipelineRunByID(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.ErrorResponse(w, http.StatusNotFound, "Pipeline run not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching pipeline run: "+err.Error())
		}
		return
	}

	// Include executions (excluding raw_response for public consumption)
	executions, _ := repo.FindExecutionsByRunID(ctx, id)
	sources, _ := repo.FindSourcesByRunID(ctx, id)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"run":        run,
		"executions": executions,
		"sources":    sources,
	})
}

// ApprovePipelineRun approves a pipeline run and advances its status.
func ApprovePipelineRun(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid pipeline run ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	run, err := repo.FindPipelineRunByID(ctx, id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Pipeline run not found")
		return
	}

	now := time.Now()
	set := bson.M{
		"status":     models.PipelineResearchApproved,
		"approved_at": &now,
		"updated_at": now,
	}

	if err := repo.UpdatePipelineRunStatus(ctx, id, set); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error approving pipeline run: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, run)
}

// ---------- Admin: Blog Posts ----------

// GetAdminBlogPosts returns all blog posts for admin.
func GetAdminBlogPosts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	page, _ := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit < 1 || limit > 50 {
		limit = 10
	}

	collection := db.Database.Collection("blog_posts")
	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching blog posts: "+err.Error())
		return
	}
	defer cursor.Close(ctx)

	var posts []models.BlogPost
	if err := cursor.All(ctx, &posts); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error decoding blog posts: "+err.Error())
		return
	}
	if posts == nil {
		posts = []models.BlogPost{}
	}

	total, _ := collection.CountDocuments(ctx, bson.M{})

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data":       posts,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + limit - 1) / limit,
	})
}

// UpdateBlogPostBlocks updates the blocks of a blog post.
func UpdateBlogPostBlocks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var payload struct {
		Blocks []models.BlogBlock `json:"blocks"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate blocks
	if err := validateAndReorderBlocks(payload.Blocks); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Compute content hash
	contentHash := services.ComputeContentHash(payload.Blocks)

	repo := services.NewBlogRepository(db.Database)
	set := bson.M{
		"blocks":          payload.Blocks,
		"content_hash":    contentHash,
		"content_revision": bson.M{"$inc": 1},
		"updated_at":      time.Now(),
	}

	if err := repo.UpdatePost(ctx, id, set); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error updating blog post: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Blog post updated"})
}

// PublishBlogPost publishes a blog post.
func PublishBlogPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	transitioned, err := repo.AtomicStatusTransition(ctx, id, models.StatusReady, models.StatusPublished)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error publishing blog post: "+err.Error())
		return
	}
	if !transitioned {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post is not in 'ready' status and cannot be published")
		return
	}

	// Publish associated media
	media, _ := repo.FindMediaByPostID(ctx, id)
	for _, m := range media {
		if m.Slot == "cover" || strings.HasPrefix(m.Slot, "image-") {
			now := time.Now()
			repo.UpdateMedia(ctx, m.ID, bson.M{
				"public_path":   m.FilePath,
				"published_at":  &now,
				"updated_at":    time.Now(),
			})
		}
	}

	post, _ := repo.FindPostByID(ctx, id)
	utils.JSONResponse(w, http.StatusOK, post)
}

// UnpublishBlogPost unpublishes a blog post.
func UnpublishBlogPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	transitioned, err := repo.AtomicStatusTransition(ctx, id, models.StatusPublished, models.StatusReady)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error unpublishing blog post: "+err.Error())
		return
	}
	if !transitioned {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post is not in 'published' status and cannot be unpublished")
		return
	}

	// Unpublish media
	media, _ := repo.FindMediaByPostID(ctx, id)
	for _, m := range media {
		repo.UpdateMedia(ctx, m.ID, bson.M{
			"public_path":  "",
			"published_at": nil,
			"updated_at":   time.Now(),
		})
	}

	post, _ := repo.FindPostByID(ctx, id)
	utils.JSONResponse(w, http.StatusOK, post)
}

// ArchiveBlogPost archives a blog post.
func ArchiveBlogPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	status, _ := repo.FindPostByID(ctx, id)
	fromStatus := models.StatusPublished
	if status.Status == models.StatusReady {
		fromStatus = models.StatusReady
	}

	transitioned, err := repo.AtomicStatusTransition(ctx, id, fromStatus, models.StatusArchived)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error archiving blog post: "+err.Error())
		return
	}
	if !transitioned {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post cannot be archived from current status")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Blog post archived"})
}

// RestoreBlogPost restores an archived blog post.
func RestoreBlogPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	transitioned, err := repo.AtomicStatusTransition(ctx, id, models.StatusArchived, models.StatusDraft)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error restoring blog post: "+err.Error())
		return
	}
	if !transitioned {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post is not archived and cannot be restored")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Blog post restored"})
}

// UploadBlogMedia handles media upload for a blog post.
func UploadBlogMedia(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid blog post ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Error parsing multipart form: "+err.Error())
		return
	}

	slot := r.FormValue("slot")
	if slot == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "slot is required (cover or image-{uuid})")
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Missing file upload")
		return
	}
	defer file.Close()

	// Validate MIME type
	contentType := handler.Header.Get("Content-Type")
	if !allowedBlogImageMimes[contentType] {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image format. Allowed: JPEG, PNG, WebP")
		return
	}

	// Read file content
	data, err := io.ReadAll(io.LimitReader(file, 10<<20))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error reading file: "+err.Error())
		return
	}

	// Decode image to verify and get dimensions
	reader := strings.NewReader(string(data))
	img, _, err := image.Decode(reader)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image file: "+err.Error())
		return
	}
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Compute checksum
	hash := sha256.Sum256(data)
	checksum := hex.EncodeToString(hash[:])

	// Generate content-hashed filename
	ext := filepath.Ext(handler.Filename)
	if ext == "" {
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
	}
	filename := fmt.Sprintf("%s-%s%s", id.Hex(), checksum[:16], ext)

	// Ensure upload directory exists
	if err := os.MkdirAll(BlogUploadDir, 0755); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating upload directory: "+err.Error())
		return
	}

	// Write file to draft path
	draftPath := filepath.Join(BlogUploadDir, "drafts", id.Hex())
	if err := os.MkdirAll(draftPath, 0755); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error creating draft directory: "+err.Error())
		return
	}
	filePath := filepath.Join(draftPath, filename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving file: "+err.Error())
		return
	}

	// Determine aspect ratio
	var aspectRatio string
	if width > 0 && height > 0 {
		gcd := gcd(width, height)
		aspectRatio = fmt.Sprintf("%d:%d", width/gcd, height/gcd)
	}

	// Create media record
	repo := services.NewBlogRepository(db.Database)
	media := &models.BlogMedia{
		PostID:         id,
		Slot:           slot,
		FilePath:       "/uploads/blog-media/drafts/" + id.Hex() + "/" + filename,
		Width:          width,
		Height:         height,
		AspectRatio:    aspectRatio,
		MimeType:       contentType,
		FileSize:       int64(len(data)),
		ChecksumSHA256: checksum,
		UploaderID:     getAdminUserID(r),
		UploadedAt:     time.Now(),
	}

	if err := repo.InsertMedia(ctx, media); err != nil {
		os.Remove(filePath)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error saving media record: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, media)
}

// DeleteBlogMedia removes a media asset.
func DeleteBlogMedia(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	mediaIDStr := vars["mediaId"]
	mediaID, err := primitive.ObjectIDFromHex(mediaIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid media ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	deleted, err := repo.DeleteMediaByID(ctx, mediaID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error deleting media: "+err.Error())
		return
	}
	if !deleted {
		utils.ErrorResponse(w, http.StatusNotFound, "Media not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Media deleted"})
}

// ---------- Admin: Agent Triggers ----------

// TriggerResearch starts the research agent for a pipeline run
func TriggerResearch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	runIDStr := vars["id"]
	runID, err := primitive.ObjectIDFromHex(runIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid pipeline run ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	run, err := repo.FindPipelineRunByID(ctx, runID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Pipeline run not found")
		return
	}

	if run.Status != models.PipelineBrief {
		utils.ErrorResponse(w, http.StatusBadRequest, "Can only trigger research from 'brief' status")
		return
	}

	// Queue research execution
	execution := models.BlogAgentExecution{
		PipelineRunID: runID,
		Stage:         models.StageResearch,
		Attempt:       1,
		Status:        models.ExecutionPending,
		CreatedAt:     time.Now(),
	}

	if err := repo.InsertAgentExecution(ctx, &execution); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error queuing research: "+err.Error())
		return
	}

	// Update run status
	run.Status = models.PipelineResearching
	run.UpdatedAt = time.Now()
	repo.UpdatePipelineRunStatus(ctx, runID, bson.M{"status": run.Status, "updated_at": run.UpdatedAt})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Research queued"})
}

// TriggerWriting starts the writing agent for a pipeline run
func TriggerWriting(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	runIDStr := vars["id"]
	runID, err := primitive.ObjectIDFromHex(runIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid pipeline run ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	run, err := repo.FindPipelineRunByID(ctx, runID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Pipeline run not found")
		return
	}

	if run.Status != models.PipelineResearchApproved {
		utils.ErrorResponse(w, http.StatusBadRequest, "Can only trigger writing from 'research_approved' status")
		return
	}

	// Queue write execution
	execution := models.BlogAgentExecution{
		PipelineRunID: runID,
		Stage:         models.StageWrite,
		Attempt:       1,
		Status:        models.ExecutionPending,
		CreatedAt:     time.Now(),
	}

	if err := repo.InsertAgentExecution(ctx, &execution); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error queuing writing: "+err.Error())
		return
	}

	// Update run status
	run.Status = models.PipelineWriting
	run.UpdatedAt = time.Now()
	repo.UpdatePipelineRunStatus(ctx, runID, bson.M{"status": run.Status, "updated_at": run.UpdatedAt})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Writing queued"})
}

// TriggerPromptGeneration starts the prompt generation agent for a pipeline run
func TriggerPromptGeneration(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	runIDStr := vars["id"]
	runID, err := primitive.ObjectIDFromHex(runIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid pipeline run ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	repo := services.NewBlogRepository(db.Database)
	run, err := repo.FindPipelineRunByID(ctx, runID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Pipeline run not found")
		return
	}

	if run.Status != models.PipelineContentApproved {
		utils.ErrorResponse(w, http.StatusBadRequest, "Can only trigger prompts from 'content_approved' status")
		return
	}

	// Queue prompts execution
	execution := models.BlogAgentExecution{
		PipelineRunID: runID,
		Stage:         models.StagePrompts,
		Attempt:       1,
		Status:        models.ExecutionPending,
		CreatedAt:     time.Now(),
	}

	if err := repo.InsertAgentExecution(ctx, &execution); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Error queuing prompts: "+err.Error())
		return
	}

	// Update run status
	run.Status = models.PipelinePrompts
	run.UpdatedAt = time.Now()
	repo.UpdatePipelineRunStatus(ctx, runID, bson.M{"status": run.Status, "updated_at": run.UpdatedAt})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Prompt generation queued"})
}

// ---------- Helpers ----------

func validateAndReorderBlocks(blocks []models.BlogBlock) error {
	if len(blocks) == 0 {
		return fmt.Errorf("at least one block is required")
	}

	// Reorder blocks by their Order field
	for i := range blocks {
		blocks[i].Order = i
	}

	// Validate
	vr := services.ValidateBlockOrder(blocks)
	if !vr.IsValid() {
		return fmt.Errorf("block validation failed: %s", vr.Error())
	}

	vr2 := services.ValidateHeadingHierarchy(blocks)
	if !vr2.IsValid() {
		return fmt.Errorf("heading hierarchy invalid: %s", vr2.Error())
	}

	vr3 := services.ValidateTextBlockNoHTML(blocks)
	if !vr3.IsValid() {
		return fmt.Errorf("text block contains forbidden content: %s", vr3.Error())
	}

	vr4 := services.ValidateImageCountPolicy(blocks)
	if !vr4.IsValid() {
		return fmt.Errorf("image count policy violated: %s", vr4.Error())
	}

	return nil
}

func getAdminUserID(r *http.Request) string {
	if uid, ok := r.Context().Value("userID").(string); ok {
		return uid
	}
	return "admin"
}

func gcd(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}
