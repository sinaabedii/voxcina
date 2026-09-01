package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
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
	careerSubmissionsCollection = "career_submissions"
	careerResumesCollection     = "career_resumes"

	// careerFormMaxMemory is what ParseMultipartForm keeps in RAM; anything
	// larger spills to a temp file. The real size gate is CareerResumeMaxSize,
	// enforced on the request body before parsing.
	careerFormMaxMemory = 1 << 20
)

// careerSubmitRateLimit throttles the public submission endpoint. It is
// unauthenticated and accepts multi-megabyte uploads, so a per-IP window keeps
// a single client from filling the collection. Only submissions that are
// actually stored count against it, so a visitor fixing validation errors is
// never locked out. In-memory and per-process: a deliberate trade-off matching
// the single-instance deployment, and it degrades to "no limit" rather than to
// a false rejection if the process restarts.
var careerSubmitRateLimit = newCareerRateLimiter(5, time.Hour)

// ============================================================================
// Public endpoint
// ============================================================================

// SubmitCareerApplication handles POST /api/careers/submissions.
//
// One multipart endpoint serves both forms on the /careers page: a partnership
// request (company details, CV optional) and a job application (position and
// experience, CV required). `type` selects which.
func SubmitCareerApplication(w http.ResponseWriter, r *http.Request) {
	// Reject oversized bodies before the multipart reader buffers them. The
	// allowance on top of the CV cap covers the text fields and MIME framing.
	r.Body = http.MaxBytesReader(w, r.Body, models.CareerResumeMaxSize+(1<<20))

	if err := r.ParseMultipartForm(careerFormMaxMemory); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "فرم ارسال‌شده معتبر نیست یا حجم آن بیش از حد مجاز است")
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			_ = r.MultipartForm.RemoveAll()
		}
	}()

	// Honeypot. The field is hidden from real users by CSS and left empty by
	// them; a form-filling bot populates everything it finds. Answer with the
	// normal success shape so the bot learns nothing, but persist nothing.
	if strings.TrimSpace(r.FormValue("website")) != "" {
		utils.LogAction("CAREER_SUBMISSION_HONEYPOT", "discarded submission from "+getClientIP(r))
		utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
			"message":        "درخواست شما ثبت شد",
			"reference_code": "",
		})
		return
	}

	clientIP := getClientIP(r)
	if !careerSubmitRateLimit.allowed(clientIP) {
		utils.ErrorResponse(w, http.StatusTooManyRequests, "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید")
		return
	}

	submission, errMsg := buildCareerSubmission(r)
	if errMsg != "" {
		utils.ErrorResponse(w, http.StatusBadRequest, errMsg)
		return
	}

	// Read the CV (required for job applications, optional for partnerships).
	resumeBytes, resumeName, resumeErr := readCareerResume(r)
	if resumeErr != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, resumeErr.Error())
		return
	}
	if submission.Type == models.CareerSubmissionTypeJob && len(resumeBytes) == 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "بارگذاری رزومه (PDF) برای درخواست شغلی الزامی است")
		return
	}

	submission.ID = primitive.NewObjectID()
	submission.SourceIP = clientIP
	submission.UserAgent = utils.TruncateRunes(r.UserAgent(), models.CareerUserAgentMaxLength)
	submission.Status = models.CareerSubmissionStatusNew
	now := time.Now()
	submission.CreatedAt = now
	submission.UpdatedAt = now

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// The CV row is written first so the submission never references a file
	// that does not exist; an insert failure below cleans it up.
	var resumeID primitive.ObjectID
	if len(resumeBytes) > 0 {
		resumeID = primitive.NewObjectID()
		file := models.CareerResumeFile{
			ID:           resumeID,
			SubmissionID: submission.ID,
			FileName:     resumeName,
			ContentType:  "application/pdf",
			Size:         int64(len(resumeBytes)),
			Data:         primitive.Binary{Subtype: 0x00, Data: resumeBytes},
			CreatedAt:    now,
		}
		if _, err := db.Database.Collection(careerResumesCollection).InsertOne(ctx, file); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "ذخیره رزومه با خطا مواجه شد")
			return
		}
		submission.Resume = &models.CareerResumeRef{
			FileName:    file.FileName,
			ContentType: file.ContentType,
			Size:        file.Size,
		}
	}

	if err := insertCareerSubmission(ctx, submission); err != nil {
		if !resumeID.IsZero() {
			_, _ = db.Database.Collection(careerResumesCollection).DeleteOne(ctx, bson.M{"_id": resumeID})
		}
		utils.ErrorResponse(w, http.StatusInternalServerError, "ثبت درخواست با خطا مواجه شد")
		return
	}

	// Only a stored submission is charged to the window.
	careerSubmitRateLimit.record(clientIP)

	utils.LogAction("CAREER_SUBMISSION_CREATED",
		fmt.Sprintf("%s %s from %s", submission.Type, submission.ReferenceCode, clientIP))

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message":        "درخواست شما با موفقیت ثبت شد",
		"reference_code": submission.ReferenceCode,
	})
}

// buildCareerSubmission validates the text fields of the form and returns a
// populated submission, or a Persian error message ready for the client.
func buildCareerSubmission(r *http.Request) (*models.CareerSubmission, string) {
	submissionType := strings.TrimSpace(r.FormValue("type"))
	if submissionType != models.CareerSubmissionTypePartnership &&
		submissionType != models.CareerSubmissionTypeJob {
		return nil, "نوع درخواست معتبر نیست"
	}

	fullName := cleanCareerText(r.FormValue("full_name"), models.CareerNameMaxLength)
	if len([]rune(fullName)) < 3 {
		return nil, "نام و نام خانوادگی را کامل وارد کنید"
	}

	email := strings.ToLower(cleanCareerText(r.FormValue("email"), 200))
	if !validCareerEmail(email) {
		return nil, "ایمیل واردشده معتبر نیست"
	}

	phone, ok := normalizeCareerPhone(r.FormValue("phone"))
	if !ok {
		return nil, "شماره موبایل معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹)"
	}

	message := cleanCareerText(r.FormValue("message"), models.CareerMessageMaxLength)
	if len([]rune(message)) < 10 {
		return nil, "توضیحات را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر)"
	}

	submission := &models.CareerSubmission{
		Type:     submissionType,
		FullName: fullName,
		Email:    email,
		Phone:    phone,
		Message:  message,
	}

	if submissionType == models.CareerSubmissionTypePartnership {
		submission.CompanyName = cleanCareerText(r.FormValue("company_name"), models.CareerCompanyMaxLength)
		if submission.CompanyName == "" {
			return nil, "نام شرکت یا کسب‌وکار را وارد کنید"
		}
		submission.BusinessType = cleanCareerText(r.FormValue("business_type"), 60)
		if submission.BusinessType == "" {
			return nil, "نوع کسب‌وکار را انتخاب کنید"
		}
		return submission, ""
	}

	submission.Position = cleanCareerText(r.FormValue("position"), 80)
	if submission.Position == "" {
		return nil, "موقعیت شغلی موردنظر را انتخاب کنید"
	}
	if raw := strings.TrimSpace(utils.NormalizePersianDigits(r.FormValue("experience_years"))); raw != "" {
		years, err := strconv.Atoi(raw)
		if err != nil || years < 0 || years > models.CareerExperienceMaxYears {
			return nil, "سابقه کاری معتبر نیست"
		}
		submission.ExperienceYears = years
	}
	submission.PortfolioURL = cleanCareerText(r.FormValue("portfolio_url"), models.CareerPortfolioMaxLength)

	return submission, ""
}

// insertCareerSubmission assigns a reference code and inserts the document,
// retrying on the reference_code unique-index collision that two concurrent
// submissions can produce when the counter is unavailable.
func insertCareerSubmission(ctx context.Context, submission *models.CareerSubmission) error {
	collection := db.Database.Collection(careerSubmissionsCollection)
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		submission.ReferenceCode = nextCareerReferenceCode(ctx, submission.Type)
		_, err := collection.InsertOne(ctx, submission)
		if err == nil {
			return nil
		}
		lastErr = err
		if !mongo.IsDuplicateKeyError(err) {
			return err
		}
	}
	return lastErr
}

// nextCareerReferenceCode produces the human-readable code the applicant is
// asked to quote (JOB-00042 / PRT-00042) from the shared counters collection.
func nextCareerReferenceCode(ctx context.Context, submissionType string) string {
	prefix := "PRT"
	if submissionType == models.CareerSubmissionTypeJob {
		prefix = "JOB"
	}

	var result struct {
		Seq int `bson:"seq"`
	}
	err := db.Database.Collection("counters").FindOneAndUpdate(
		ctx,
		bson.M{"_id": "careerSubmission"},
		bson.M{"$inc": bson.M{"seq": 1}},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	).Decode(&result)
	if err != nil || result.Seq <= 0 {
		// Counter unreachable: fall back to a clock-derived suffix. The unique
		// index plus the caller's retry still guarantee a distinct code.
		return fmt.Sprintf("%s-%05d", prefix, time.Now().UnixNano()%100000)
	}
	return fmt.Sprintf("%s-%05d", prefix, result.Seq)
}

// readCareerResume pulls the optional `resume` file out of the form and returns
// its bytes and a sanitized filename. A missing file is not an error here; the
// caller decides whether one was required.
func readCareerResume(r *http.Request) ([]byte, string, error) {
	file, header, err := r.FormFile("resume")
	if errors.Is(err, http.ErrMissingFile) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", errors.New("خواندن فایل رزومه با خطا مواجه شد")
	}
	defer file.Close()

	if header.Size > models.CareerResumeMaxSize {
		return nil, "", errors.New("حجم رزومه باید کمتر از ۵ مگابایت باشد")
	}

	// LimitReader guards against a header that under-reports the real size.
	data, err := io.ReadAll(io.LimitReader(file, models.CareerResumeMaxSize+1))
	if err != nil {
		return nil, "", errors.New("خواندن فایل رزومه با خطا مواجه شد")
	}
	if len(data) > models.CareerResumeMaxSize {
		return nil, "", errors.New("حجم رزومه باید کمتر از ۵ مگابایت باشد")
	}
	if !isPDF(data) {
		return nil, "", errors.New("فقط فایل PDF پذیرفته می‌شود")
	}

	return data, sanitizeResumeFileName(header.Filename), nil
}

// ============================================================================
// Admin endpoints
// ============================================================================

// AdminListCareerSubmissions handles GET /api/admin/career-submissions.
// Supports ?type=, ?status=, ?search= (name/email/phone/reference code),
// ?page= and ?limit=.
func AdminListCareerSubmissions(w http.ResponseWriter, r *http.Request) {
	page := utils.GetIntFromQuery(r, "page", 1)
	if page < 1 {
		page = 1
	}
	limit := utils.GetIntFromQuery(r, "limit", models.CareerSubmissionsPageLimit)
	if limit < 1 || limit > 100 {
		limit = models.CareerSubmissionsPageLimit
	}

	filter := bson.M{}
	if t := r.URL.Query().Get("type"); t == models.CareerSubmissionTypeJob ||
		t == models.CareerSubmissionTypePartnership {
		filter["type"] = t
	}
	if s := r.URL.Query().Get("status"); models.ValidCareerSubmissionStatus(s) {
		filter["status"] = s
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		escaped := regexp.QuoteMeta(search)
		filter["$or"] = []bson.M{
			{"reference_code": bson.M{"$regex": escaped, "$options": "i"}},
			{"full_name": bson.M{"$regex": escaped, "$options": "i"}},
			{"email": bson.M{"$regex": escaped, "$options": "i"}},
			{"phone": bson.M{"$regex": escaped, "$options": "i"}},
			{"company_name": bson.M{"$regex": escaped, "$options": "i"}},
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	collection := db.Database.Collection(careerSubmissionsCollection)
	cursor, err := collection.Find(ctx, filter, options.Find().
		SetSkip(int64((page-1)*limit)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch career submissions")
		return
	}
	defer cursor.Close(ctx)

	submissions := []models.CareerSubmission{}
	if err := cursor.All(ctx, &submissions); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decode career submissions")
		return
	}

	totalCount, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to count career submissions")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"submissions": submissions,
		"stats":       careerSubmissionStats(ctx, collection),
		"pagination": map[string]interface{}{
			"currentPage": page,
			"totalPages":  (totalCount + int64(limit) - 1) / int64(limit),
			"totalCount":  totalCount,
			"pageSize":    limit,
		},
	})
}

// careerSubmissionStats returns unfiltered counts for the admin header badges.
// One aggregation covers every bucket; a failure degrades to zeros rather than
// failing the listing.
func careerSubmissionStats(ctx context.Context, collection *mongo.Collection) map[string]int {
	stats := map[string]int{"total": 0, "new": 0, "job": 0, "partnership": 0}

	cursor, err := collection.Aggregate(ctx, []bson.M{
		{"$group": bson.M{
			"_id":   bson.M{"type": "$type", "status": "$status"},
			"count": bson.M{"$sum": 1},
		}},
	})
	if err != nil {
		return stats
	}
	defer cursor.Close(ctx)

	var rows []struct {
		ID struct {
			Type   string `bson:"type"`
			Status string `bson:"status"`
		} `bson:"_id"`
		Count int `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return stats
	}

	for _, row := range rows {
		stats["total"] += row.Count
		if row.ID.Status == models.CareerSubmissionStatusNew {
			stats["new"] += row.Count
		}
		switch row.ID.Type {
		case models.CareerSubmissionTypeJob:
			stats["job"] += row.Count
		case models.CareerSubmissionTypePartnership:
			stats["partnership"] += row.Count
		}
	}
	return stats
}

// AdminDownloadCareerResume handles GET /api/admin/career-submissions/{id}/resume.
// It streams the stored PDF; this endpoint is the only way to reach a CV, which
// is why resumes are never written under the public ./uploads tree.
func AdminDownloadCareerResume(w http.ResponseWriter, r *http.Request) {
	submissionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid submission id")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	var submission models.CareerSubmission
	if err := db.Database.Collection(careerSubmissionsCollection).
		FindOne(ctx, bson.M{"_id": submissionID}).Decode(&submission); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Submission not found")
		return
	}

	var file models.CareerResumeFile
	if err := db.Database.Collection(careerResumesCollection).
		FindOne(ctx, bson.M{"submission_id": submissionID}).Decode(&file); err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "No resume attached to this submission")
		return
	}

	downloadName := sanitizeResumeFileName(submission.ReferenceCode + "-" + file.FileName)

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Length", strconv.FormatInt(int64(len(file.Data.Data)), 10))
	w.Header().Set("Content-Disposition", contentDispositionAttachment(downloadName))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// Personal data: never cached by a proxy or the browser disk cache.
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(file.Data.Data)
}

// AdminUpdateCareerSubmission handles PUT /api/admin/career-submissions/{id}.
// Only the review fields (status, admin note) are mutable — everything the
// applicant submitted stays exactly as it was received.
func AdminUpdateCareerSubmission(w http.ResponseWriter, r *http.Request) {
	submissionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid submission id")
		return
	}

	var payload struct {
		Status    *string `json:"status"`
		AdminNote *string `json:"admin_note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	adminID, adminName, ok := adminIdentity(ctx, r)
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Admin identity missing")
		return
	}

	set := bson.M{
		"updated_at":    time.Now(),
		"reviewed_by":   adminID,
		"reviewer_name": adminName,
		"reviewed_at":   time.Now(),
	}
	if payload.Status != nil {
		if !models.ValidCareerSubmissionStatus(*payload.Status) {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid status")
			return
		}
		set["status"] = *payload.Status
	}
	if payload.AdminNote != nil {
		set["admin_note"] = cleanCareerText(*payload.AdminNote, models.CareerAdminNoteMaxLength)
	}
	if payload.Status == nil && payload.AdminNote == nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Nothing to update")
		return
	}

	var updated models.CareerSubmission
	err = db.Database.Collection(careerSubmissionsCollection).FindOneAndUpdate(
		ctx,
		bson.M{"_id": submissionID},
		bson.M{"$set": set},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&updated)
	if errors.Is(err, mongo.ErrNoDocuments) {
		utils.ErrorResponse(w, http.StatusNotFound, "Submission not found")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update submission")
		return
	}

	utils.JSONResponse(w, http.StatusOK, updated)
}

// AdminDeleteCareerSubmission handles DELETE /api/admin/career-submissions/{id}.
// This is a hard delete of both the submission and its CV — the way an admin
// purges an applicant's personal data on request.
func AdminDeleteCareerSubmission(w http.ResponseWriter, r *http.Request) {
	submissionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid submission id")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	result, err := db.Database.Collection(careerSubmissionsCollection).
		DeleteOne(ctx, bson.M{"_id": submissionID})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete submission")
		return
	}
	if result.DeletedCount == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Submission not found")
		return
	}

	// The CV is worthless without its submission; drop it in the same breath.
	_, _ = db.Database.Collection(careerResumesCollection).
		DeleteOne(ctx, bson.M{"submission_id": submissionID})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Submission deleted"})
}

// ============================================================================
// Validation helpers
// ============================================================================

var careerEmailPattern = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// validCareerEmail applies the same shape check the form uses client-side.
func validCareerEmail(email string) bool {
	if len(email) < 5 || len(email) > 200 {
		return false
	}
	return careerEmailPattern.MatchString(email)
}

// normalizeCareerPhone accepts an Iranian mobile number written with Persian or
// ASCII digits, in +98/0098/0/bare form, and returns it in the canonical
// 09XXXXXXXXX shape so two spellings of one number are stored identically.
func normalizeCareerPhone(raw string) (string, bool) {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, utils.NormalizePersianDigits(raw))

	switch {
	case strings.HasPrefix(digits, "0098"):
		digits = "0" + strings.TrimPrefix(digits, "0098")
	case strings.HasPrefix(digits, "98") && len(digits) == 12:
		digits = "0" + strings.TrimPrefix(digits, "98")
	case strings.HasPrefix(digits, "9") && len(digits) == 10:
		digits = "0" + digits
	}

	if len(digits) != 11 || !strings.HasPrefix(digits, "09") {
		return "", false
	}
	return digits, true
}

// cleanCareerText trims a submitted field, strips control characters that would
// corrupt logs or the admin table, and caps its length in runes so Persian text
// is never cut mid-character.
func cleanCareerText(value string, max int) string {
	cleaned := strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' {
			return r
		}
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, value)
	return utils.TruncateRunes(strings.TrimSpace(cleaned), max)
}

// isPDF checks the file's magic bytes. Extension and browser-supplied MIME type
// are both attacker-controlled, so the header is the only real signal.
func isPDF(data []byte) bool {
	return len(data) > 4 && string(data[:5]) == "%PDF-"
}

// sanitizeResumeFileName reduces an uploaded filename to something safe to echo
// back in a Content-Disposition header: no path separators, quotes or control
// characters, and always ending in .pdf.
func sanitizeResumeFileName(name string) string {
	name = strings.TrimSpace(name)
	name = strings.ReplaceAll(name, "\\", "-")
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f || r == '"' || r == ';' {
			return -1
		}
		return r
	}, name)
	name = utils.TruncateRunes(name, models.CareerResumeNameMaxLength)

	if name == "" || name == "." || name == ".." {
		return "resume.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(name), ".pdf") {
		name += ".pdf"
	}
	return name
}

// contentDispositionAttachment builds a header that works for both ASCII-only
// clients and the Persian filenames this form regularly produces (RFC 5987).
func contentDispositionAttachment(name string) string {
	ascii := strings.Map(func(r rune) rune {
		if r > 126 || r < 0x20 {
			return '_'
		}
		return r
	}, name)
	return fmt.Sprintf(`attachment; filename="%s"; filename*=UTF-8''%s`, ascii, url.PathEscape(name))
}

// ============================================================================
// Rate limiting
// ============================================================================

// careerRateLimiter is a fixed-window per-key counter.
type careerRateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newCareerRateLimiter(limit int, window time.Duration) *careerRateLimiter {
	return &careerRateLimiter{
		hits:   make(map[string][]time.Time),
		limit:  limit,
		window: window,
	}
}

// allowed reports whether key still has budget left in the window, without
// spending any of it. Checking and recording are separate so a visitor who
// mistypes their phone number three times is not locked out — only a stored
// submission counts against the budget (see record).
func (l *careerRateLimiter) allowed(key string) bool {
	if key == "" {
		return true
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	return len(l.prune(key, time.Now().Add(-l.window))) < l.limit
}

// record charges one accepted submission to key.
func (l *careerRateLimiter) record(key string) {
	if key == "" {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.window)

	// Sweep the whole map only when it has grown large, so a long-running
	// process cannot accumulate keys for IPs that never came back.
	if len(l.hits) > 10000 {
		for k, times := range l.hits {
			if len(times) == 0 || times[len(times)-1].Before(cutoff) {
				delete(l.hits, k)
			}
		}
	}

	l.hits[key] = append(l.prune(key, cutoff), now)
}

// prune drops key's hits older than cutoff and stores the result. Callers must
// hold the mutex.
func (l *careerRateLimiter) prune(key string, cutoff time.Time) []time.Time {
	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	l.hits[key] = recent
	return recent
}
