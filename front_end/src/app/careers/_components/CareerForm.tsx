"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Copy, Inbox, Send } from "lucide-react";
import { CareerSubmissionType, JobPosition } from "@/types/career";
import { BUSINESS_TYPES } from "@/lib/careers";
import { submitCareerApplication } from "@/lib/careers-api";
import { toDigitsOnly, toPersianNumber } from "@/lib/utils";
import ResumeUploader from "./ResumeUploader";
import { SelectField, TextAreaField, TextField } from "./FormField";

const MESSAGE_MAX = 2000;

interface FormValues {
  full_name: string;
  email: string;
  phone: string;
  message: string;
  company_name: string;
  business_type: string;
  /** Id of the chosen open position, not its title — the server resolves the
   *  title from the posting itself. */
  position_id: string;
  experience_years: string;
  portfolio_url: string;
  /** Honeypot — hidden from real users, filled only by bots. */
  website: string;
}

const emptyValues: FormValues = {
  full_name: "",
  email: "",
  phone: "",
  message: "",
  company_name: "",
  business_type: "",
  position_id: "",
  experience_years: "",
  portfolio_url: "",
  website: "",
};

type FieldErrors = Partial<Record<keyof FormValues | "resume", string>>;

/**
 * Mirrors the server's rules (handlers/career_submissions.go) so a visitor is
 * told what is wrong before an upload is attempted. The server still validates
 * everything — this is a convenience layer, never the gate.
 */
function validate(
  mode: CareerSubmissionType,
  values: FormValues,
  resume: File | null,
  positions: JobPosition[]
): FieldErrors {
  const errors: FieldErrors = {};

  if (values.full_name.trim().length < 3) {
    errors.full_name = "نام و نام خانوادگی را کامل وارد کنید.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(values.email.trim())) {
    errors.email = "ایمیل معتبر وارد کنید.";
  }

  const phone = toDigitsOnly(values.phone);
  const normalizedPhone = phone.startsWith("98") && phone.length === 12
    ? `0${phone.slice(2)}`
    : phone;
  if (!/^09\d{9}$/.test(normalizedPhone)) {
    errors.phone = "شماره موبایل معتبر وارد کنید (نمونه: ۰۹۱۲۳۴۵۶۷۸۹).";
  }

  if (values.message.trim().length < 10) {
    errors.message = "لطفاً کمی بیشتر توضیح دهید (حداقل ۱۰ کاراکتر).";
  }

  if (mode === "partnership") {
    if (!values.company_name.trim()) {
      errors.company_name = "نام شرکت یا کسب‌وکار را وارد کنید.";
    }
    if (!values.business_type) {
      errors.business_type = "نوع کسب‌وکار را انتخاب کنید.";
    }
  } else {
    // Exactly one currently-open position, and it has to be one the page is
    // actually offering — a stale tab must not post a closed role.
    if (!values.position_id) {
      errors.position_id = "موقعیت شغلی موردنظر را انتخاب کنید.";
    } else if (!positions.some((role) => role.id === values.position_id)) {
      errors.position_id = "این موقعیت دیگر باز نیست. یکی از موقعیت‌های موجود را انتخاب کنید.";
    }
    if (!resume) {
      errors.resume = "بارگذاری رزومه PDF الزامی است.";
    }
    const portfolio = values.portfolio_url.trim();
    if (portfolio && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/.test(portfolio)) {
      errors.portfolio_url = "نشانی واردشده معتبر نیست.";
    }
  }

  return errors;
}

interface CareerFormProps {
  mode: CareerSubmissionType;
  /** Live openings, straight from the backend. The job form is only usable
   *  while this is non-empty. */
  positions: JobPosition[];
  /** Position picked from the open-roles list; pre-selects the dropdown. */
  presetPositionId?: string;
  /** Called after a rejected submission so the parent can re-read the
   *  openings — the list may have changed while this page was open. */
  onSubmitFailed?: () => void;
}

export default function CareerForm({
  mode,
  positions,
  presetPositionId,
  onSubmitFailed,
}: CareerFormProps) {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const positionOptions = useMemo(
    () => positions.map((role) => ({ value: role.id, label: role.title })),
    [positions]
  );

  // A role chosen from the open-positions list drops straight into the select.
  useEffect(() => {
    if (presetPositionId) {
      setValues((prev) => ({ ...prev, position_id: presetPositionId }));
    }
  }, [presetPositionId]);

  // A single opening is not a choice worth making: pre-select it.
  useEffect(() => {
    if (mode === "job" && positions.length === 1) {
      setValues((prev) =>
        prev.position_id ? prev : { ...prev, position_id: positions[0].id }
      );
    }
  }, [mode, positions]);

  const setValue = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Nag only after the first submit attempt, then correct live as it is fixed.
    if (hasSubmitted) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setValues(emptyValues);
    setResume(null);
    setErrors({});
    setHasSubmitted(false);
    setServerError(null);
    setReferenceCode(null);
    setCopied(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasSubmitted(true);
    setServerError(null);

    const found = validate(mode, values, resume, positions);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so the reason is announced and visible.
      // The CV input itself is display:none, so its picker button stands in.
      const firstField = Object.keys(found)[0];
      const control = formRef.current?.querySelector<HTMLElement>(
        firstField === "resume"
          ? `#${mode}-resume-field button`
          : `#${mode}-${firstField}`
      );
      control?.focus();
      control?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    const result = await submitCareerApplication({
      type: mode,
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      phone: toDigitsOnly(values.phone),
      message: values.message.trim(),
      company_name: mode === "partnership" ? values.company_name.trim() : undefined,
      business_type: mode === "partnership" ? values.business_type : undefined,
      position_id: mode === "job" ? values.position_id : undefined,
      experience_years: mode === "job" ? values.experience_years : undefined,
      portfolio_url: mode === "job" ? values.portfolio_url.trim() : undefined,
      website: values.website,
      resume,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setServerError(result.error || "ثبت درخواست با خطا مواجه شد.");
      // The openings may be what went stale; let the page re-read them so the
      // dropdown matches reality on the next attempt.
      onSubmitFailed?.();
      return;
    }
    setReferenceCode(result.referenceCode || "");
  };

  const copyReference = async () => {
    if (!referenceCode) return;
    try {
      await navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied: the code stays selectable on screen.
    }
  };

  if (referenceCode !== null) {
    return (
      <div
        className="rounded-2xl border border-green-200 bg-green-50/70 p-6 text-center sm:p-10 dark:border-green-800/40 dark:bg-green-900/10"
        role="status"
      >
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="mb-2 text-xl font-bold text-voxcina-darkBlue dark:text-white">
          {mode === "job" ? "رزومه شما ثبت شد" : "درخواست همکاری شما ثبت شد"}
        </h3>
        <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-gray-600 dark:text-secondary-200/80">
          {mode === "job"
            ? "رزومه شما در صف بررسی قرار گرفت. در صورت تناسب با موقعیت‌های موجود، از طریق تماس یا ایمیل با شما در ارتباط خواهیم بود."
            : "درخواست شما ثبت شد. کارشناسان ما پس از بررسی، در اسرع وقت با شما تماس می‌گیرند."}
        </p>

        {referenceCode && (
          <div className="mx-auto mb-6 inline-flex items-center gap-3 rounded-xl border border-green-200 bg-white px-4 py-2.5 dark:border-green-800/40 dark:bg-voxcina-darkBlue/40">
            <span className="text-xs text-gray-500 dark:text-secondary-400">
              کد پیگیری:
            </span>
            <code className="font-mono text-sm font-bold tracking-wide text-voxcina-blue dark:text-secondary-100">
              {referenceCode}
            </code>
            <button
              type="button"
              onClick={copyReference}
              className="rounded-lg p-1.5 text-voxcina-blue/70 transition-colors hover:bg-voxcina-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 dark:text-secondary-300"
              aria-label="کپی کد پیگیری"
            >
              <Copy className="h-4 w-4" />
            </button>
            {copied && (
              <span className="text-xs text-green-600 dark:text-green-400">
                کپی شد
              </span>
            )}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-voxcina-blue/20 px-5 py-2.5 text-sm font-medium text-voxcina-blue transition-colors hover:bg-voxcina-blue/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 dark:border-secondary-200/20 dark:text-secondary-200"
          >
            ثبت درخواست جدید
          </button>
        </div>
      </div>
    );
  }

  // An application must name an opening, so with none published there is
  // nothing to apply to. Saying so beats rendering a form whose required
  // dropdown is empty and whose submit can only ever fail.
  if (mode === "job" && positions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-voxcina-blue/20 bg-white/70 p-6 text-center sm:p-10 dark:border-secondary-200/15 dark:bg-voxcina-blue/5">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200">
          <Inbox className="h-7 w-7" />
        </span>
        <h3 className="mb-2 text-lg font-bold text-voxcina-darkBlue dark:text-white">
          در حال حاضر موقعیت شغلی بازی نداریم
        </h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-gray-600 dark:text-secondary-200/80">
          به‌محض انتشار موقعیت‌های تازه، همین‌جا می‌توانید رزومه خود را ارسال
          کنید. اگر پیشنهاد همکاری تجاری دارید، از زبانه «همکاری تجاری» استفاده
          کنید.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-voxcina-blue/10 bg-white/70 p-4 shadow-soft backdrop-blur-sm sm:p-6 md:p-8 dark:border-secondary-200/10 dark:bg-voxcina-blue/5"
    >
      {serverError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        {mode === "partnership" && (
          <TextField
            id="partnership-company_name"
            label="نام شرکت یا کسب‌وکار"
            required
            containerClassName="md:col-span-2"
            value={values.company_name}
            onChange={(e) => setValue("company_name", e.target.value)}
            error={errors.company_name}
            placeholder="مثلاً: پوشاک آرمان"
            autoComplete="organization"
            maxLength={160}
          />
        )}

        <TextField
          id={`${mode}-full_name`}
          label="نام و نام خانوادگی"
          required
          value={values.full_name}
          onChange={(e) => setValue("full_name", e.target.value)}
          error={errors.full_name}
          placeholder="نام کامل خود را وارد کنید"
          autoComplete="name"
          maxLength={120}
        />

        <TextField
          id={`${mode}-phone`}
          label="شماره موبایل"
          required
          type="tel"
          inputMode="numeric"
          dir="ltr"
          className="text-right"
          value={values.phone}
          onChange={(e) => setValue("phone", e.target.value)}
          error={errors.phone}
          placeholder="09123456789"
          autoComplete="tel"
          maxLength={14}
        />

        <TextField
          id={`${mode}-email`}
          label="ایمیل"
          required
          type="email"
          dir="ltr"
          className="text-right"
          containerClassName={mode === "job" ? undefined : "md:col-span-2"}
          value={values.email}
          onChange={(e) => setValue("email", e.target.value)}
          error={errors.email}
          placeholder="example@email.com"
          autoComplete="email"
          maxLength={200}
        />

        {mode === "partnership" ? (
          <SelectField
            id="partnership-business_type"
            label="نوع کسب‌وکار"
            required
            containerClassName="md:col-span-2"
            options={BUSINESS_TYPES}
            value={values.business_type}
            onChange={(e) => setValue("business_type", e.target.value)}
            error={errors.business_type}
          />
        ) : (
          <>
            <SelectField
              id="job-position_id"
              label="موقعیت شغلی موردنظر"
              required
              options={positionOptions}
              value={values.position_id}
              onChange={(e) => setValue("position_id", e.target.value)}
              error={errors.position_id}
              hint="یکی از موقعیت‌های باز را انتخاب کنید."
            />

            <TextField
              id="job-experience_years"
              label="سابقه کار (سال)"
              type="text"
              inputMode="numeric"
              value={values.experience_years}
              onChange={(e) =>
                setValue("experience_years", toDigitsOnly(e.target.value).slice(0, 2))
              }
              error={errors.experience_years}
              placeholder="مثلاً ۳"
              hint={
                values.experience_years
                  ? `${toPersianNumber(values.experience_years)} سال`
                  : undefined
              }
            />

            <TextField
              id="job-portfolio_url"
              label="نمونه‌کار یا لینکدین"
              type="url"
              dir="ltr"
              className="text-right"
              containerClassName="md:col-span-2"
              value={values.portfolio_url}
              onChange={(e) => setValue("portfolio_url", e.target.value)}
              error={errors.portfolio_url}
              placeholder="https://linkedin.com/in/..."
              maxLength={300}
            />
          </>
        )}
      </div>

      <div className="mt-4 sm:mt-5">
        <TextAreaField
          id={`${mode}-message`}
          label={mode === "partnership" ? "توضیحات همکاری" : "درباره خودتان"}
          required
          rows={5}
          maxLength={MESSAGE_MAX}
          value={values.message}
          onChange={(e) => setValue("message", e.target.value)}
          error={errors.message}
          placeholder={
            mode === "partnership"
              ? "درباره شرکت، محصولات یا خدماتی که ارائه می‌دهید بنویسید..."
              : "درباره تجربه، مهارت‌ها و دلیل علاقه‌تان به همکاری با وکسینا بنویسید..."
          }
        />
      </div>

      <div className="mt-4 sm:mt-5">
        <ResumeUploader
          id={`${mode}-resume`}
          file={resume}
          onChange={(file) => {
            setResume(file);
            if (hasSubmitted) setErrors((prev) => ({ ...prev, resume: undefined }));
          }}
          error={errors.resume}
          required={mode === "job"}
          disabled={isSubmitting}
        />
      </div>

      {/* Honeypot: clipped out of the layout, hidden from assistive tech and
          skipped by the tab order, so only a bot that fills every input it
          finds will populate it — the backend then discards the submission. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`${mode}-website`}>وب‌سایت</label>
        <input
          id={`${mode}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => setValue("website", e.target.value)}
        />
      </div>

      <p className="mt-5 text-xs leading-relaxed text-voxcina-blue/70 dark:text-secondary-300/80">
        با ارسال این فرم،
        <Link
          href="/privacy"
          className="mx-1 text-voxcina-blue underline underline-offset-2 transition-colors hover:text-voxcina-darkBlue dark:text-secondary-200 dark:hover:text-white"
        >
          شرایط و قوانین
        </Link>
        وکسینا را می‌پذیرید. اطلاعات شما تنها برای بررسی همین درخواست استفاده می‌شود.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-voxcina-blue to-voxcina-darkBlue px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:shadow-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            در حال ارسال...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {mode === "partnership" ? "ارسال درخواست همکاری" : "ارسال رزومه"}
          </>
        )}
      </button>
    </form>
  );
}
