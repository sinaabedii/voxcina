import { CareerSubmissionStatus, CareerSubmissionType } from "@/types/career";

/**
 * Content and shared rules for the /careers page.
 *
 * The open positions themselves are NOT here: they are admin-managed records
 * served by GET /api/careers/positions, so a new opening goes live from
 * /admin/careers without a deploy. What remains is static page copy and the
 * limits the upload form shares with the backend.
 */

/** Must match models.CareerResumeMaxSize on the Go side. */
export const RESUME_MAX_SIZE = 5 * 1024 * 1024;
export const RESUME_ACCEPT = "application/pdf,.pdf";

/** Contract types a posting may advertise. Must match
 *  models.JobPositionEmploymentTypes on the Go side — the backend rejects
 *  anything outside this set, so the two lists have to agree exactly. */
export const EMPLOYMENT_TYPES = [
  "تمام‌وقت",
  "پاره‌وقت",
  "دورکاری",
  "کارآموزی",
  "پروژه‌ای",
  "سایر",
] as const;

export const BUSINESS_TYPES = [
  { value: "تولیدکننده / تأمین‌کننده محصول", label: "تولیدکننده / تأمین‌کننده محصول" },
  { value: "خدمات لجستیک و حمل‌ونقل", label: "خدمات لجستیک و حمل‌ونقل" },
  { value: "خدمات فناوری و نرم‌افزاری", label: "خدمات فناوری و نرم‌افزاری" },
  { value: "بازاریابی و تبلیغات", label: "بازاریابی و تبلیغات" },
  { value: "سایر", label: "سایر" },
];

export const HIRING_STEPS = [
  {
    title: "ارسال درخواست",
    description: "فرم را پر کنید و رزومه PDF خود را بارگذاری کنید. کد پیگیری بلافاصله به شما نمایش داده می‌شود.",
  },
  {
    title: "بررسی اولیه",
    description: "تیم ما رزومه شما را حداکثر تا یک هفته کاری بررسی می‌کند.",
  },
  {
    title: "گفتگو",
    description: "در صورت تناسب، برای یک گفتگوی معارفه و سپس مصاحبه تخصصی با شما تماس می‌گیریم.",
  },
  {
    title: "پیشنهاد همکاری",
    description: "پس از جمع‌بندی، نتیجه — چه مثبت و چه منفی — به شما اطلاع داده می‌شود.",
  },
];

export const CAREER_TYPE_LABELS: Record<CareerSubmissionType, string> = {
  partnership: "همکاری تجاری",
  job: "درخواست شغلی",
};

export const CAREER_STATUS_LABELS: Record<CareerSubmissionStatus, string> = {
  new: "جدید",
  reviewing: "در حال بررسی",
  accepted: "پذیرفته شده",
  rejected: "رد شده",
};

export const CAREER_STATUS_BADGE: Record<CareerSubmissionStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  reviewing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  accepted:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

/** Human-readable file size, in Persian digits, for the upload preview. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

/**
 * Client-side gate for a chosen CV. The backend repeats every one of these
 * checks (and additionally verifies the PDF magic bytes) — this exists only so
 * the visitor learns about a bad file before waiting on an upload.
 */
export function validateResumeFile(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "فقط فایل PDF پذیرفته می‌شود.";
  if (file.size > RESUME_MAX_SIZE) return "حجم فایل باید کمتر از ۵ مگابایت باشد.";
  if (file.size === 0) return "فایل انتخاب‌شده خالی است.";
  return null;
}
