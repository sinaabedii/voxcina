"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { toast } from "react-toastify";
import AuthWrapper from "@/components/auth/AuthWrapper";
import PhoneInput, { persianToEnglishDigits, validatePhone } from "@/components/auth/PhoneInput";
import OtpInput from "@/components/auth/OtpInput";
import OtpCountdown from "@/components/auth/OtpCountdown";
import StepIndicator from "@/components/auth/StepIndicator";
import JalaliDatePicker from "@/components/auth/JalaliDatePicker";
import { localStorageManager } from "@/lib/local-storage-manager";
import { tokenValidator } from "@/lib/token-validator";

// Persian character validation regex (includes Persian letters and spaces)
const persianNameRegex = /^[\u0600-\u06FF\s]+$/;

// Validate Persian name
const isPersianName = (name: string): boolean => {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return persianNameRegex.test(trimmed);
};

const STEPS = [{ label: "اطلاعات" }, { label: "تأیید" }];

/**
 * Referral seller signup: two-step passwordless OTP flow behind an invite link.
 *
 * The `ref` code is hidden state only — it is read from `?ref=` and sent with
 * step 1, never rendered as an editable field. The verify step sends
 * `{phone, code}` alone because the referrer is pinned server-side on the OTP
 * record. There is no dedicated resend endpoint: resending re-POSTs send-otp
 * with the preserved step-1 payload.
 */
export default function SellerSignUpContent() {
  const searchParams = useSearchParams();
  const ref = (searchParams.get("ref") ?? "").trim();

  // Step 1: recruit identity (+ hidden ref)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  // Step 2: OTP (5 digits)
  const [otpCode, setOtpCode] = useState("");

  // UI state
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  // A dead invite link (404 on send-otp) is surfaced inline as well as by
  // toast, so it is obvious the link itself — not the form — is the problem.
  const [inlineRefError, setInlineRefError] = useState<string | undefined>(undefined);

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    otpCode?: string;
  }>({});

  const { user, isAuthenticated, setUser, setIsAuthenticated } = useAuthStore();
  const router = useRouter();

  // A signed-in seller has no business signing up again.
  useEffect(() => {
    if (isAuthenticated && user?.role === "seller") {
      router.replace("/seller");
    }
  }, [isAuthenticated, user?.role, router]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, step]);

  // Validate Step 1 (mirrors the server: required + Persian-only names + phone)
  const validateStep1 = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "نام الزامی است";
    } else if (!isPersianName(firstName)) {
      newErrors.firstName = "نام باید فقط شامل حروف فارسی باشد";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "نام خانوادگی الزامی است";
    } else if (!isPersianName(lastName)) {
      newErrors.lastName = "نام خانوادگی باید فقط شامل حروف فارسی باشد";
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, phone]);

  // Validate Step 2 (OTP only — this flow is passwordless)
  const validateStep2 = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!otpCode.trim()) {
      newErrors.otpCode = "کد تأیید الزامی است";
    } else if (!/^[0-9۰-۹]{5}$/.test(otpCode)) {
      newErrors.otpCode = "کد تأیید باید ۵ رقم باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [otpCode]);

  // Shared send-otp POST: used by the step-1 submit and by resend, always with
  // the preserved step-1 payload (firstName/lastName/phone/birthday/ref).
  const postSendOtp = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/seller-signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: persianToEnglishDigits(phone),
          birthday: birthday || "",
          ref,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "خطا در ارسال کد تأیید");
        // A revoked/unknown code fails here with 404 — keep it visible inline
        // so a dead invite link is unmistakable.
        if (response.status === 404) {
          setInlineRefError(data.error || "کد معرفی نامعتبر است");
        }
        return false;
      }

      toast.success(data.message || "کد تأیید به شماره تلفن شما ارسال شد");
      setInlineRefError(undefined);
      setStep(2);
      setCountdown(120); // 2 minutes countdown
      setCanResend(false);
      return true;
    } catch (error) {
      console.error("Send seller signup OTP error:", error);
      toast.error("خطا در ارسال کد تأیید");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [firstName, lastName, phone, birthday, ref]);

  // Send OTP (Step 1 submit)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1()) {
      toast.error("لطفاً اطلاعات را صحیح وارد کنید");
      return;
    }

    await postSendOtp();
  };

  // Resend OTP: no dedicated endpoint — re-POST send-otp. A re-POST inside the
  // 2-minute window answers 429 with the remaining seconds; the toast carries
  // it and the countdown is left untouched.
  const handleResendOTP = async () => {
    if (!canResend) return;
    await postSendOtp();
  };

  // Verify OTP and complete seller registration (Step 2 submit)
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      toast.error("لطفاً اطلاعات را صحیح وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);
      const normalizedCode = persianToEnglishDigits(otpCode);

      // No `ref` here by design: the referrer is pinned server-side on the
      // OTP record at send time.
      const response = await fetch("/api/auth/seller-signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          code: normalizedCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "خطا در تأیید کد");
        return;
      }

      // Store tokens (200 upgrade and 201 create share this shape)
      if (
        !data.token ||
        !data.refreshToken ||
        !tokenValidator.isTokenValid(data.token) ||
        !tokenValidator.isRefreshTokenValid(data.refreshToken)
      ) {
        toast.error("توکن دریافتی نامعتبر است");
        return;
      }
      localStorageManager.setTokens(data.token, data.refreshToken);

      // Update auth store
      setUser({
        id: data.id,
        name: data.name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastLogin: data.last_login,
        birthday: data.birthday,
      });
      setIsAuthenticated(true);

      toast.success(data.message || "ثبت‌نام فروشندگی با موفقیت انجام شد");
      router.push("/seller");
    } catch (error) {
      console.error("Verify seller signup OTP error:", error);
      toast.error("خطا در ثبت‌نام");
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to step 1 (keeps the identity fields so resend-after-edit works)
  const handleGoBack = () => {
    setStep(1);
    setOtpCode("");
    setErrors({});
  };

  // Missing/empty ref: invalid-link state, no form and never an editable ref field.
  if (!ref) {
    return (
      <AuthWrapper
        title="لینک دعوت نامعتبر است"
        subtitle="برای ثبت‌نام فروشندگی به لینک دعوت نیاز دارید"
      >
        <div className="space-y-5">
          <p className="text-sm leading-7 text-gray-500">
            به نظر می‌رسد این لینک دعوت ناقص است؛ کد معرفی در آن پیدا نشد. لطفاً از فروشنده معرف
            بخواهید لینک کامل را دوباره برایتان بفرستد.
          </p>
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-voxcina-blue px-6 text-base font-medium text-white transition-all hover:opacity-90"
          >
            بازگشت به فروشگاه
          </Link>
          <p className="text-center text-sm text-gray-500">
            مشکل همچنان باقی است؟{" "}
            <Link href="/contact" className="text-voxcina-blue font-semibold hover:underline">
              تماس با ما
            </Link>
          </p>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper
      title="ثبت‌نام و همکاری در فروش وکسینا"
      subtitle="با لینک دعوت فروشنده همکار، فروشنده وکسینا شوید"
      gradientClass="bg-gradient-to-r from-voxcina-blue/70 via-voxcina-darkBlue/70 to-slate-900/70"
    >
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {step === 1 ? (
        <>
          <div className="mb-5 rounded-xl border border-voxcina-cream bg-voxcina-cream/30 px-4 py-3 text-[13px] leading-6 text-voxcina-blue/80">
            <p>با کد تخفیف اختصاصی خودتان بفروشید و از هر سفارش پرداخت‌شده سهم بگیرید.</p>
            <p className="mt-1 opacity-70">
              سقف تقسیم شما ۲۰٪ است و عملکرد فروش‌تان در پنل فروشنده نمایش داده می‌شود.
            </p>
          </div>

          {inlineRefError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-6 text-red-600">
              {inlineRefError}
            </div>
          )}

          <form onSubmit={handleSendOTP} className="space-y-5">
            {/* Name fields in a row */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="نام"
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.firstName}
                placeholder="علی"
              />
              <Input
                label="نام خانوادگی"
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
                placeholder="محمدی"
              />
            </div>

            <PhoneInput value={phone} onChange={setPhone} error={errors.phone} />

            <JalaliDatePicker value={birthday} onChange={setBirthday} helperText="اختیاری" />

            <Button
              variant="primary"
              fullWidth
              type="submit"
              isLoading={isLoading}
              className="h-12 text-base font-medium rounded-xl"
            >
              {isLoading ? "در حال ارسال..." : "دریافت کد تأیید"}
            </Button>

            <p className="text-center text-sm text-gray-500 pt-4">
              حساب کاربری دارید؟{" "}
              <Link href="/sign-in" className="text-voxcina-blue font-semibold hover:underline">
                وارد شوید
              </Link>
            </p>
          </form>
        </>
      ) : (
        <form onSubmit={handleVerifyAndRegister} className="space-y-5">
          {/* Back button & Phone display */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <button
              type="button"
              onClick={handleGoBack}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>تغییر اطلاعات</span>
            </button>
            <span className="text-sm font-medium text-gray-900 direction-ltr">
              {persianToEnglishDigits(phone)}
            </span>
          </div>

          {/* OTP Input (5 digits) */}
          <OtpInput value={otpCode} onChange={setOtpCode} error={errors.otpCode} />
          <OtpCountdown
            countdown={countdown}
            canResend={canResend}
            isLoading={isLoading}
            onResend={handleResendOTP}
          />

          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isLoading}
            className="h-12 text-base font-medium rounded-xl"
          >
            {isLoading ? "در حال ثبت‌نام..." : "تکمیل ثبت‌نام"}
          </Button>
        </form>
      )}
    </AuthWrapper>
  );
}
