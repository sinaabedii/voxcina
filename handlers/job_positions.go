package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
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
	jobPositionsCollection = "job_positions"

	// jobPositionsHardLimit caps a listing so a runaway collection can never
	// stall the admin page. A curated openings list is nowhere near this.
	jobPositionsHardLimit = 500
)

// ============================================================================
// Public endpoint
// ============================================================================

// ListOpenJobPositions handles GET /api/careers/positions.
//
// It is the single source of truth for the "موقعیت‌های شغلی باز" section and
// for the position dropdown on the job application form. Only active postings
// are returned, in the order the admin arranged them.
func ListOpenJobPositions(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	positions, err := findJobPositions(ctx, bson.M{"is_active": true}, jobPositionsHardLimit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch open positions")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"positions": positions,
	})
}

// ============================================================================
// Admin endpoints
// ============================================================================

// AdminListJobPositions handles GET /api/admin/job-positions.
// Supports ?status=active|inactive and ?search= over title/department.
func AdminListJobPositions(w http.ResponseWriter, r *http.Request) {
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
			{"department": bson.M{"$regex": escaped, "$options": "i"}},
			{"location": bson.M{"$regex": escaped, "$options": "i"}},
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	positions, err := findJobPositions(ctx, filter, jobPositionsHardLimit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch job positions")
		return
	}

	// Attach how many applications each posting has drawn, so an admin sees
	// what a deletion would orphan before confirming it.
	counts := jobPositionApplicationCounts(ctx)
	activeCount := 0
	for i := range positions {
		positions[i].ApplicationCount = counts[positions[i].ID]
		if positions[i].IsActive {
			activeCount++
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"positions": positions,
		"stats": map[string]int{
			"total":    len(positions),
			"active":   activeCount,
			"inactive": len(positions) - activeCount,
		},
	})
}

// AdminCreateJobPosition handles POST /api/admin/job-positions.
func AdminCreateJobPosition(w http.ResponseWriter, r *http.Request) {
	var payload jobPositionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	position := &models.JobPosition{
		ID:       primitive.NewObjectID(),
		IsActive: true, // a new posting is published unless explicitly held back
	}
	if errMsg := payload.apply(position); errMsg != "" {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	// Unspecified order appends to the end of the list rather than jumping to
	// the top, which is what an admin adding a role expects.
	if payload.DisplayOrder == nil {
		position.DisplayOrder = nextJobPositionOrder(ctx)
	}

	now := time.Now()
	position.CreatedAt = now
	position.UpdatedAt = now
	if adminID, _, ok := adminIdentity(ctx, r); ok {
		position.CreatedBy = &adminID
	}

	if _, err := db.Database.Collection(jobPositionsCollection).InsertOne(ctx, position); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, "موقعیت شغلی دیگری با همین عنوان وجود دارد")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create job position")
		return
	}

	utils.LogAction("JOB_POSITION_CREATED", position.Title)
	utils.JSONResponse(w, http.StatusCreated, position)
}

// AdminUpdateJobPosition handles PUT /api/admin/job-positions/{id}.
// Every field is patchable; omitted fields keep their stored value, which is
// what lets the list page toggle `is_active` without resending the whole form.
func AdminUpdateJobPosition(w http.ResponseWriter, r *http.Request) {
	positionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid position id")
		return
	}

	var payload jobPositionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	collection := db.Database.Collection(jobPositionsCollection)

	// Patch onto the stored document so validation always runs against the
	// finished posting, not just the fields that happened to be sent.
	var position models.JobPosition
	if err := collection.FindOne(ctx, bson.M{"_id": positionID}).Decode(&position); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			utils.ErrorResponse(w, http.StatusNotFound, "Position not found")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load job position")
		return
	}

	if errMsg := payload.apply(&position); errMsg != "" {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}
	position.UpdatedAt = time.Now()

	set := bson.M{
		"title":           position.Title,
		"department":      position.Department,
		"employment_type": position.EmploymentType,
		"location":        position.Location,
		"summary":         position.Summary,
		"description":     position.Description,
		"requirements":    position.Requirements,
		"is_active":       position.IsActive,
		"display_order":   position.DisplayOrder,
		"updated_at":      position.UpdatedAt,
	}

	if _, err := collection.UpdateOne(ctx, bson.M{"_id": positionID}, bson.M{"$set": set}); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.ErrorResponse(w, http.StatusConflict, "موقعیت شغلی دیگری با همین عنوان وجود دارد")
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update job position")
		return
	}

	utils.LogAction("JOB_POSITION_UPDATED", position.Title)
	utils.JSONResponse(w, http.StatusOK, position)
}

// AdminDeleteJobPosition handles DELETE /api/admin/job-positions/{id}.
//
// Applications made against the posting are deliberately left untouched: each
// one snapshots the title it was submitted under, so the hiring record stays
// readable after the opening is gone. Deactivating instead of deleting keeps
// the posting out of /careers while preserving the link.
func AdminDeleteJobPosition(w http.ResponseWriter, r *http.Request) {
	positionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid position id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	result, err := db.Database.Collection(jobPositionsCollection).
		DeleteOne(ctx, bson.M{"_id": positionID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete job position")
		return
	}
	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Position not found")
		return
	}

	utils.LogAction("JOB_POSITION_DELETED", positionID.Hex())
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Position deleted"})
}

// ============================================================================
// Shared helpers
// ============================================================================

// jobPositionPayload is the admin create/update body. Every field is a pointer
// so an update can tell "not sent" from "sent empty".
type jobPositionPayload struct {
	Title          *string   `json:"title"`
	Department     *string   `json:"department"`
	EmploymentType *string   `json:"employment_type"`
	Location       *string   `json:"location"`
	Summary        *string   `json:"summary"`
	Description    *string   `json:"description"`
	Requirements   *[]string `json:"requirements"`
	IsActive       *bool     `json:"is_active"`
	DisplayOrder   *int      `json:"display_order"`
}

// apply validates the payload onto position and returns a Persian error message
// for the admin UI, or "" when the posting is valid.
//
// The same checks serve create and update: on create `position` is zero-valued
// so a missing required field fails on its own, and on update the stored value
// stands in for anything the client did not send.
func (p jobPositionPayload) apply(position *models.JobPosition) string {
	if p.Title != nil {
		position.Title = cleanCareerText(*p.Title, models.JobPositionTitleMaxLength)
	}
	if len([]rune(position.Title)) < 3 {
		return "عنوان موقعیت شغلی را وارد کنید (حداقل ۳ کاراکتر)"
	}

	if p.Department != nil {
		position.Department = cleanCareerText(*p.Department, models.JobPositionDepartmentMaxLength)
	}
	if position.Department == "" {
		return "واحد سازمانی را وارد کنید"
	}

	if p.EmploymentType != nil {
		position.EmploymentType = cleanCareerText(*p.EmploymentType, 40)
	}
	if !models.ValidJobPositionEmploymentType(position.EmploymentType) {
		return "نوع همکاری انتخاب‌شده معتبر نیست"
	}

	if p.Location != nil {
		position.Location = cleanCareerText(*p.Location, models.JobPositionLocationMaxLength)
	}
	if position.Location == "" {
		return "موقعیت مکانی را وارد کنید"
	}

	if p.Summary != nil {
		position.Summary = cleanCareerText(*p.Summary, models.JobPositionSummaryMaxLength)
	}
	if len([]rune(position.Summary)) < 10 {
		return "توضیح کوتاه موقعیت را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر)"
	}

	if p.Description != nil {
		position.Description = cleanCareerText(*p.Description, models.JobPositionDescriptionMaxLength)
	}

	if p.Requirements != nil {
		cleaned := make([]string, 0, len(*p.Requirements))
		for _, item := range *p.Requirements {
			item = cleanCareerText(item, models.JobPositionRequirementMaxLength)
			if item == "" {
				continue // blank rows from the admin form are dropped silently
			}
			cleaned = append(cleaned, item)
			if len(cleaned) == models.JobPositionMaxRequirements {
				break
			}
		}
		position.Requirements = cleaned
	}

	if p.IsActive != nil {
		position.IsActive = *p.IsActive
	}

	if p.DisplayOrder != nil {
		if *p.DisplayOrder < 0 || *p.DisplayOrder > 100000 {
			return "ترتیب نمایش معتبر نیست"
		}
		position.DisplayOrder = *p.DisplayOrder
	}

	return ""
}

// findJobPositions runs the shared listing query: the admin's order first, then
// newest, so postings sharing an order stay in a stable, predictable sequence.
func findJobPositions(ctx context.Context, filter bson.M, limit int64) ([]models.JobPosition, error) {
	cursor, err := db.Database.Collection(jobPositionsCollection).Find(ctx, filter, options.Find().
		SetLimit(limit).
		SetSort(bson.D{
			{Key: "display_order", Value: 1},
			{Key: "created_at", Value: -1},
		}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	positions := []models.JobPosition{}
	if err := cursor.All(ctx, &positions); err != nil {
		return nil, err
	}
	return positions, nil
}

// jobPositionApplicationCounts returns applications per posting. A failure
// degrades to an empty map: the listing is still useful without the counts.
func jobPositionApplicationCounts(ctx context.Context) map[primitive.ObjectID]int {
	counts := map[primitive.ObjectID]int{}

	cursor, err := db.Database.Collection(careerSubmissionsCollection).Aggregate(ctx, []bson.M{
		{"$match": bson.M{"position_id": bson.M{"$exists": true, "$ne": nil}}},
		{"$group": bson.M{"_id": "$position_id", "count": bson.M{"$sum": 1}}},
	})
	if err != nil {
		return counts
	}
	defer cursor.Close(ctx)

	var rows []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Count int                `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return counts
	}
	for _, row := range rows {
		counts[row.ID] = row.Count
	}
	return counts
}

// nextJobPositionOrder puts a new posting after the current last one, leaving a
// gap so the admin can later insert between two entries.
func nextJobPositionOrder(ctx context.Context) int {
	var last models.JobPosition
	err := db.Database.Collection(jobPositionsCollection).FindOne(
		ctx,
		bson.M{},
		options.FindOne().SetSort(bson.D{{Key: "display_order", Value: -1}}),
	).Decode(&last)
	if err != nil {
		return models.JobPositionOrderStep
	}
	return last.DisplayOrder + models.JobPositionOrderStep
}

// lookupActiveJobPosition resolves the posting a job application names. Only an
// active posting is accepted: a closed opening must not keep collecting CVs
// through a stale browser tab.
func lookupActiveJobPosition(ctx context.Context, id primitive.ObjectID) (*models.JobPosition, error) {
	var position models.JobPosition
	err := db.Database.Collection(jobPositionsCollection).
		FindOne(ctx, bson.M{"_id": id, "is_active": true}).
		Decode(&position)
	if err != nil {
		return nil, err
	}
	return &position, nil
}
