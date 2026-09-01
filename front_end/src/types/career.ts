/**
 * Careers page submissions — the public /careers forms and the admin inbox.
 * Mirrors models.CareerSubmission on the Go side.
 */

export type CareerSubmissionType = "partnership" | "job";

export type CareerSubmissionStatus =
  | "new"
  | "reviewing"
  | "accepted"
  | "rejected";

/** Metadata of the attached CV. The bytes are only reachable through the
 *  admin-authenticated download endpoint, never as a public URL. */
export interface CareerResumeRef {
  file_name: string;
  content_type: string;
  size: number;
}

export interface CareerSubmission {
  id: string;
  reference_code: string;
  type: CareerSubmissionType;

  full_name: string;
  email: string;
  phone: string;
  message: string;

  // Partnership only
  company_name?: string;
  business_type?: string;

  // Job only. `position` is the title snapshot taken at submission time, so a
  // record still reads correctly after the posting is renamed or removed;
  // `position_id` links to the live posting while it exists.
  position_id?: string;
  position?: string;
  experience_years?: number;
  portfolio_url?: string;

  resume?: CareerResumeRef;

  status: CareerSubmissionStatus;
  admin_note?: string;
  reviewer_name?: string;
  reviewed_at?: string;

  created_at: string;
  updated_at: string;
}

/** Unfiltered counts for the admin header badges. */
export interface CareerSubmissionStats {
  total: number;
  new: number;
  job: number;
  partnership: number;
}

export interface CareerSubmissionPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export interface CareerSubmissionListResponse {
  submissions: CareerSubmission[];
  stats: CareerSubmissionStats;
  pagination: CareerSubmissionPagination;
}

/** What the public forms post. `website` is the honeypot: it stays empty for
 *  real visitors and the backend discards anything that fills it. */
export interface CareerApplicationPayload {
  type: CareerSubmissionType;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  company_name?: string;
  business_type?: string;
  /** Id of the chosen open position. The server resolves the title from it —
   *  the client never gets to name a role that was not advertised. */
  position_id?: string;
  experience_years?: string;
  portfolio_url?: string;
  website?: string;
  resume?: File | null;
}

/**
 * An opening advertised in "موقعیت‌های شغلی باز" and offered in the job
 * application dropdown. Managed from /admin/careers; mirrors
 * models.JobPosition on the Go side.
 */
export interface JobPosition {
  id: string;
  title: string;
  department: string;
  employment_type: string;
  location: string;
  summary: string;
  description?: string;
  requirements?: string[];
  is_active: boolean;
  display_order: number;
  /** Applications received for this posting. Admin listing only — computed per
   *  request, never stored, so it cannot drift out of sync. */
  application_count: number;
  created_at: string;
  updated_at: string;
}

/** Create/update body for a posting. Every field is optional on update: the
 *  backend patches onto the stored document, which is how the list page can
 *  toggle `is_active` alone. */
export interface JobPositionInput {
  title?: string;
  department?: string;
  employment_type?: string;
  location?: string;
  summary?: string;
  description?: string;
  requirements?: string[];
  is_active?: boolean;
  display_order?: number;
}

export interface JobPositionStats {
  total: number;
  active: number;
  inactive: number;
}

export interface JobPositionListResponse {
  positions: JobPosition[];
  stats: JobPositionStats;
}
