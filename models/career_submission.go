package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Career submission kinds. The public /careers page posts both through the same
// endpoint and they share one collection so the admin queue is a single list;
// `Type` decides which fields are meaningful and which are left empty.
const (
	CareerSubmissionTypePartnership = "partnership" // business/supplier cooperation request
	CareerSubmissionTypeJob         = "job"         // job application with a CV
)

// Review lifecycle of a submission.
//
//	new ──> reviewing ──> accepted | rejected
//
// Nothing is terminal here: unlike a return request, an admin may move a
// submission back to any state while a hiring conversation is ongoing.
const (
	CareerSubmissionStatusNew       = "new"
	CareerSubmissionStatusReviewing = "reviewing"
	CareerSubmissionStatusAccepted  = "accepted"
	CareerSubmissionStatusRejected  = "rejected"
)

// Field limits enforced by the handler before anything is written.
const (
	CareerResumeMaxSize        = 5 << 20 // 5MB — also the frontend's advertised cap
	CareerMessageMaxLength     = 2000
	CareerNameMaxLength        = 120
	CareerCompanyMaxLength     = 160
	CareerPortfolioMaxLength   = 300
	CareerExperienceMaxYears   = 60
	CareerResumeNameMaxLength  = 200
	CareerAdminNoteMaxLength   = 1000
	CareerUserAgentMaxLength   = 300
	CareerSubmissionsPageLimit = 20
)

// ValidCareerSubmissionStatus reports whether s is a status an admin may set.
func ValidCareerSubmissionStatus(s string) bool {
	switch s {
	case CareerSubmissionStatusNew,
		CareerSubmissionStatusReviewing,
		CareerSubmissionStatusAccepted,
		CareerSubmissionStatusRejected:
		return true
	}
	return false
}

// CareerResumeRef is the metadata of an uploaded CV as it is stored inside the
// submission document. The bytes themselves live in the separate
// `career_resumes` collection (see CareerResumeFile) so listing the admin queue
// never drags megabytes of PDF through the cursor. There is no file id here on
// purpose: the CV is always reached through the submission's own id, which the
// unique `submission_id` index on career_resumes makes unambiguous.
type CareerResumeRef struct {
	FileName    string `bson:"file_name"    json:"file_name"`
	ContentType string `bson:"content_type" json:"content_type"`
	Size        int64  `bson:"size"         json:"size"`
}

// CareerResumeFile holds the raw CV bytes.
//
// Resumes deliberately do NOT live under ./uploads: that directory is served
// unauthenticated by the Go static handler at /uploads/ and is also mounted into
// the frontend container as public/uploads, so anything placed there is
// world-readable to anyone who guesses the path. A CV is personal data, so the
// bytes are kept in MongoDB — reachable only through the admin-authenticated
// download endpoint, and included in the existing daily mongodump backup. The
// 5MB cap keeps every document far below the 16MB BSON limit.
type CareerResumeFile struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"  json:"id,omitempty"`
	SubmissionID primitive.ObjectID `bson:"submission_id"  json:"submission_id"`
	FileName     string             `bson:"file_name"      json:"file_name"`
	ContentType  string             `bson:"content_type"   json:"content_type"`
	Size         int64              `bson:"size"           json:"size"`
	Data         primitive.Binary   `bson:"data"           json:"-"`
	CreatedAt    time.Time          `bson:"created_at"     json:"created_at"`
}

// CareerSubmission is one entry of the /careers page: either a partnership
// request or a job application. Contact fields are common to both; the
// type-specific ones are omitted when empty so a partnership document never
// carries hiring fields and vice versa.
type CareerSubmission struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"    json:"id,omitempty"`
	ReferenceCode string             `bson:"reference_code"   json:"reference_code"` // e.g. JOB-01042, shown to the applicant
	Type          string             `bson:"type"             json:"type"`

	// Common contact fields.
	FullName string `bson:"full_name" json:"full_name"`
	Email    string `bson:"email"     json:"email"`
	Phone    string `bson:"phone"     json:"phone"` // normalized to ASCII digits
	Message  string `bson:"message"   json:"message"`

	// Partnership-only.
	CompanyName  string `bson:"company_name,omitempty"  json:"company_name,omitempty"`
	BusinessType string `bson:"business_type,omitempty" json:"business_type,omitempty"`

	// Job-only. Position is a snapshot of the JobPosition title taken when the
	// application was received, so the record keeps the role it was posted under
	// even after the posting is renamed or deleted. PositionID links to the live
	// posting while it exists; older submissions predate it and carry only a title.
	PositionID      *primitive.ObjectID `bson:"position_id,omitempty" json:"position_id,omitempty"`
	Position        string              `bson:"position,omitempty"         json:"position,omitempty"`
	ExperienceYears int                 `bson:"experience_years,omitempty" json:"experience_years,omitempty"`
	PortfolioURL    string              `bson:"portfolio_url,omitempty"    json:"portfolio_url,omitempty"`

	// Attached CV. Required for job applications, optional for partnerships.
	Resume *CareerResumeRef `bson:"resume,omitempty" json:"resume,omitempty"`

	// Admin review state.
	Status       string              `bson:"status"                 json:"status"`
	AdminNote    string              `bson:"admin_note,omitempty"   json:"admin_note,omitempty"`
	ReviewedBy   *primitive.ObjectID `bson:"reviewed_by,omitempty"  json:"reviewed_by,omitempty"`
	ReviewerName string              `bson:"reviewer_name,omitempty" json:"reviewer_name,omitempty"`
	ReviewedAt   *time.Time          `bson:"reviewed_at,omitempty"  json:"reviewed_at,omitempty"`

	// Request provenance, kept for abuse investigation only.
	SourceIP  string `bson:"source_ip,omitempty"  json:"-"`
	UserAgent string `bson:"user_agent,omitempty" json:"-"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}
