package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Field limits enforced by the handler before a posting is written.
const (
	JobPositionTitleMaxLength       = 120
	JobPositionDepartmentMaxLength  = 80
	JobPositionLocationMaxLength    = 80
	JobPositionSummaryMaxLength     = 600
	JobPositionDescriptionMaxLength = 4000
	JobPositionRequirementMaxLength = 200
	JobPositionMaxRequirements      = 12
	JobPositionsPageLimit           = 50

	// JobPositionOrderStep is the gap left between auto-assigned display
	// orders, so an admin can slot a posting between two others without
	// renumbering the whole list.
	JobPositionOrderStep = 10
)

// JobPositionEmploymentTypes is the closed set the admin form offers. A closed
// set keeps the public listing consistent — free text would drift into
// "تمام وقت"/"تمام‌وقت"/"full-time" variants that look sloppy side by side.
// "سایر" covers a general "send us your CV" posting that has no fixed shape.
var JobPositionEmploymentTypes = []string{
	"تمام‌وقت",
	"پاره‌وقت",
	"دورکاری",
	"کارآموزی",
	"پروژه‌ای",
	"سایر",
}

// ValidJobPositionEmploymentType reports whether v is an offered contract type.
func ValidJobPositionEmploymentType(v string) bool {
	for _, allowed := range JobPositionEmploymentTypes {
		if v == allowed {
			return true
		}
	}
	return false
}

// JobPosition is one opening advertised in the "موقعیت‌های شغلی باز" section of
// the /careers page and managed from /admin/careers.
//
// Only active postings are ever returned publicly, and a job application must
// name one of them: the applicant picks a position and the server resolves the
// title from this collection rather than trusting the posted string, so a
// submission can never carry a role that was never advertised.
//
// Deleting a posting does not touch the applications made against it — a
// submission snapshots the title it was posted under (see
// CareerSubmission.Position), which is why the history survives an edit or a
// removal here.
type JobPosition struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Title string             `bson:"title"         json:"title"`

	Department     string `bson:"department"      json:"department"`
	EmploymentType string `bson:"employment_type" json:"employment_type"`
	Location       string `bson:"location"        json:"location"`

	// Summary is the card blurb on /careers; Description and Requirements are
	// the optional long form shown when a visitor expands the posting.
	Summary      string   `bson:"summary"                json:"summary"`
	Description  string   `bson:"description,omitempty"  json:"description,omitempty"`
	Requirements []string `bson:"requirements,omitempty" json:"requirements,omitempty"`

	// IsActive is the publish toggle: an inactive posting disappears from
	// /careers and can no longer be applied to, but keeps its applications.
	IsActive     bool `bson:"is_active"     json:"is_active"`
	DisplayOrder int  `bson:"display_order" json:"display_order"`

	CreatedBy *primitive.ObjectID `bson:"created_by,omitempty" json:"-"`
	CreatedAt time.Time           `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time           `bson:"updated_at"           json:"updated_at"`

	// ApplicationCount is computed for the admin listing only; it is never
	// stored, so a count can never drift out of sync with the submissions.
	ApplicationCount int `bson:"-" json:"application_count"`
}
