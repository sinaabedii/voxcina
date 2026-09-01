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

  // Job only
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
  position?: string;
  experience_years?: string;
  portfolio_url?: string;
  website?: string;
  resume?: File | null;
}
