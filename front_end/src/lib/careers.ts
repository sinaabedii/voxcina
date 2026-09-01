import { CareerSubmissionStatus, CareerSubmissionType } from "@/types/career";

/**
 * Content and shared rules for the /careers page.
 *
 * Everything the page advertises lives here so the copy can be changed without
 * touching a component: edit OPEN_POSITIONS to change which roles are listed,
 * BUSINESS_TYPES to change the partnership dropdown.
 */

/** Must match models.CareerResumeMaxSize on the Go side. */
export const RESUME_MAX_SIZE = 5 * 1024 * 1024;
export const RESUME_ACCEPT = "application/pdf,.pdf";

export interface OpenPosition {
  id: string;
  /** Sent to the backend verbatim and shown to the admin, so the label itself
   *  is the stored value — a record keeps the title it was posted under even
   *  after this list changes. */
  title: string;
  department: string;
  employmentType: string;
  location: string;
  summary: string;
}

export const OPEN_POSITIONS: OpenPosition[] = [
  {
    id: "product-manager",
    title: "مدیر محصول",
    department: "محصول",
    employmentType: "تمام‌وقت",
    location: "تهران",
    summary:
      "هدایت نقشه راه محصول، اولویت‌بندی قابلیت‌ها و همکاری نزدیک با تیم‌های طراحی، فنی و بازرگانی.",
  },
  {
    id: "frontend",
    title: "توسعه‌دهنده فرانت‌اند",
    department: "فناوری",
    employmentType: "تمام‌وقت",
    location: "تهران / دورکاری",
    summary:
      "توسعه رابط کاربری فروشگاه با Next.js و TypeScript، با تمرکز بر سرعت، دسترس‌پذیری و تجربه موبایل.",
  },
  {
    id: "marketing",
    title: "متخصص بازاریابی دیجیتال",
    department: "بازاریابی",
    employmentType: "تمام‌وقت",
    location: "تهران",
    summary:
      "طراحی و اجرای کمپین‌های عملکردی، تحلیل داده‌های رشد و مدیریت کانال‌های شبکه‌های اجتماعی.",
  },
  {
    id: "other",
    title: "سایر موقعیت‌ها (ارسال رزومه عمومی)",
    department: "عمومی",
    employmentType: "—",
    location: "—",
    summary:
      "موقعیت موردنظرتان را در فهرست نمی‌بینید؟ رزومه‌تان را بفرستید تا در نخستین فرصت مناسب با شما تماس بگیریم.",
  },
];

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
