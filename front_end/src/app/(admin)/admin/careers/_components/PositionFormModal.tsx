"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { EMPLOYMENT_TYPES } from "@/lib/careers";
import { JobPosition, JobPositionInput } from "@/types/career";

/** Mirrors the Go limits in models/job_position.go. */
const LIMITS = {
  title: 120,
  department: 80,
  location: 80,
  summary: 600,
  description: 4000,
  requirement: 200,
  maxRequirements: 12,
};

interface FormState {
  title: string;
  department: string;
  employment_type: string;
  location: string;
  summary: string;
  description: string;
  requirements: string[];
  is_active: boolean;
  display_order: string;
}

const emptyState: FormState = {
  title: "",
  department: "",
  employment_type: EMPLOYMENT_TYPES[0],
  location: "",
  summary: "",
  description: "",
  requirements: [],
  is_active: true,
  display_order: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

/** The same rules the backend enforces, so a mistake is caught before the
 *  round trip. The server still validates everything. */
function validate(values: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (values.title.trim().length < 3) {
    errors.title = "عنوان را کامل وارد کنید (حداقل ۳ کاراکتر).";
  }
  if (!values.department.trim()) {
    errors.department = "واحد سازمانی را وارد کنید.";
  }
  if (!EMPLOYMENT_TYPES.includes(values.employment_type as never)) {
    errors.employment_type = "نوع همکاری را انتخاب کنید.";
  }
  if (!values.location.trim()) {
    errors.location = "موقعیت مکانی را وارد کنید.";
  }
  if (values.summary.trim().length < 10) {
    errors.summary = "توضیح کوتاه را کامل‌تر بنویسید (حداقل ۱۰ کاراکتر).";
  }
  if (values.display_order.trim()) {
    const order = Number(values.display_order);
    if (!Number.isInteger(order) || order < 0 || order > 100000) {
      errors.display_order = "ترتیب نمایش باید عددی بین ۰ تا ۱۰۰۰۰۰ باشد.";
    }
  }

  return errors;
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

interface PositionFormModalProps {
  isOpen: boolean;
  /** The posting being edited, or null to create a new one. */
  position: JobPosition | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: JobPositionInput) => Promise<boolean>;
}

export default function PositionFormModal({
  isOpen,
  position,
  isSaving,
  onClose,
  onSubmit,
}: PositionFormModalProps) {
  const [values, setValues] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Load the posting under edit — or reset to a blank form for a new one —
  // every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setHasSubmitted(false);
    setValues(
      position
        ? {
            title: position.title,
            department: position.department,
            employment_type: position.employment_type,
            location: position.location,
            summary: position.summary,
            description: position.description || "",
            requirements: position.requirements || [],
            is_active: position.is_active,
            display_order: String(position.display_order),
          }
        : emptyState
    );
  }, [isOpen, position]);

  const setValue = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (hasSubmitted) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setRequirement = (index: number, value: string) => {
    setValues((prev) => {
      const requirements = [...prev.requirements];
      requirements[index] = value;
      return { ...prev, requirements };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasSubmitted(true);

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: JobPositionInput = {
      title: values.title.trim(),
      department: values.department.trim(),
      employment_type: values.employment_type,
      location: values.location.trim(),
      summary: values.summary.trim(),
      description: values.description.trim(),
      requirements: values.requirements
        .map((item) => item.trim())
        .filter(Boolean),
      is_active: values.is_active,
    };
    // Left blank on a new posting, the backend appends it to the end of the
    // list; sending 0 would instead pin it to the top.
    if (values.display_order.trim()) {
      input.display_order = Number(values.display_order);
    }

    if (await onSubmit(input)) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={position ? "ویرایش موقعیت شغلی" : "موقعیت شغلی جدید"}
      contentClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="position-title" className="mb-1 block text-xs font-medium">
              عنوان موقعیت <span className="text-red-500">*</span>
            </label>
            <input
              id="position-title"
              value={values.title}
              onChange={(e) => setValue("title", e.target.value)}
              maxLength={LIMITS.title}
              placeholder="مثلاً: توسعه‌دهنده فرانت‌اند"
              className={inputClass}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "position-title-error" : undefined}
            />
            <FieldError id="position-title-error" message={errors.title} />
          </div>

          <div>
            <label
              htmlFor="position-department"
              className="mb-1 block text-xs font-medium"
            >
              واحد سازمانی <span className="text-red-500">*</span>
            </label>
            <input
              id="position-department"
              value={values.department}
              onChange={(e) => setValue("department", e.target.value)}
              maxLength={LIMITS.department}
              placeholder="مثلاً: فناوری"
              className={inputClass}
              aria-invalid={!!errors.department}
              aria-describedby={
                errors.department ? "position-department-error" : undefined
              }
            />
            <FieldError id="position-department-error" message={errors.department} />
          </div>

          <div>
            <label
              htmlFor="position-employment-type"
              className="mb-1 block text-xs font-medium"
            >
              نوع همکاری <span className="text-red-500">*</span>
            </label>
            <select
              id="position-employment-type"
              value={values.employment_type}
              onChange={(e) => setValue("employment_type", e.target.value)}
              className={inputClass}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <FieldError
              id="position-employment-type-error"
              message={errors.employment_type}
            />
          </div>

          <div>
            <label
              htmlFor="position-location"
              className="mb-1 block text-xs font-medium"
            >
              موقعیت مکانی <span className="text-red-500">*</span>
            </label>
            <input
              id="position-location"
              value={values.location}
              onChange={(e) => setValue("location", e.target.value)}
              maxLength={LIMITS.location}
              placeholder="مثلاً: تهران / دورکاری"
              className={inputClass}
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? "position-location-error" : undefined}
            />
            <FieldError id="position-location-error" message={errors.location} />
          </div>

          <div>
            <label
              htmlFor="position-display-order"
              className="mb-1 block text-xs font-medium"
            >
              ترتیب نمایش
            </label>
            <input
              id="position-display-order"
              value={values.display_order}
              onChange={(e) =>
                setValue("display_order", e.target.value.replace(/\D/g, ""))
              }
              inputMode="numeric"
              dir="ltr"
              placeholder="خالی = انتهای فهرست"
              className={`${inputClass} text-right`}
              aria-invalid={!!errors.display_order}
              aria-describedby={
                errors.display_order ? "position-display-order-error" : undefined
              }
            />
            <FieldError
              id="position-display-order-error"
              message={errors.display_order}
            />
          </div>
        </div>

        <div>
          <label htmlFor="position-summary" className="mb-1 block text-xs font-medium">
            توضیح کوتاه <span className="text-red-500">*</span>
          </label>
          <textarea
            id="position-summary"
            value={values.summary}
            onChange={(e) => setValue("summary", e.target.value)}
            maxLength={LIMITS.summary}
            rows={3}
            placeholder="یک یا دو جمله که روی کارت موقعیت در صفحه «همکاری با ما» دیده می‌شود."
            className={`${inputClass} resize-none`}
            aria-invalid={!!errors.summary}
            aria-describedby={errors.summary ? "position-summary-error" : undefined}
          />
          <FieldError id="position-summary-error" message={errors.summary} />
        </div>

        <div>
          <label
            htmlFor="position-description"
            className="mb-1 block text-xs font-medium"
          >
            شرح کامل (اختیاری)
          </label>
          <textarea
            id="position-description"
            value={values.description}
            onChange={(e) => setValue("description", e.target.value)}
            maxLength={LIMITS.description}
            rows={4}
            placeholder="شرح وظایف و جزئیات موقعیت. متقاضی با زدن «جزئیات بیشتر» آن را می‌بیند."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium">
            نیازمندی‌ها (اختیاری، حداکثر {LIMITS.maxRequirements} مورد)
          </span>
          <div className="space-y-2">
            {values.requirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={requirement}
                  onChange={(e) => setRequirement(index, e.target.value)}
                  maxLength={LIMITS.requirement}
                  placeholder={`نیازمندی ${index + 1}`}
                  className={inputClass}
                  aria-label={`نیازمندی ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setValue(
                      "requirements",
                      values.requirements.filter((_, i) => i !== index)
                    )
                  }
                  className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  aria-label={`حذف نیازمندی ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {values.requirements.length < LIMITS.maxRequirements && (
            <button
              type="button"
              onClick={() =>
                setValue("requirements", [...values.requirements, ""])
              }
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-gray-500 transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن نیازمندی
            </button>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-secondary/30 p-3 text-xs">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValue("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span>
            انتشار در صفحه «همکاری با ما»
            <span className="mr-1 text-gray-500 dark:text-gray-400">
              — موقعیت غیرفعال نه نمایش داده می‌شود و نه قابل درخواست است.
            </span>
          </span>
        </label>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" variant="primary" fullWidth isLoading={isSaving}>
            {position ? "ذخیره تغییرات" : "ثبت موقعیت"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
