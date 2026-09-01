"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { toast } from "react-toastify";
import AuthWrapper from "@/components/auth/AuthWrapper";
import PhoneInput, { persianToEnglishDigits, validatePhone } from "@/components/auth/PhoneInput";
import OtpInput from "@/components/auth/OtpInput";
import OtpCountdown from "@/components/auth/OtpCountdown";
import PasswordInput, { validatePassword } from "@/components/auth/PasswordInput";
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

const STEPS = [
  { label: "اطلاعات" },
  { label: "تأیید" },
];

export default function SignUpPage() {
  // Step 1: User info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  
  // Step 2: OTP and password
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI state
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    otpCode?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const { setUser, setIsAuthenticated } = useAuthStore();
  const router = useRouter();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, step]);

  // Validate Step 1
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

  // Validate Step 2
  const validateStep2 = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!otpCode.trim()) {
      newErrors.otpCode = "کد تأیید الزامی است";
    } else if (!/^[0-9۰-۹]{5}$/.test(otpCode)) {
      newErrors.otpCode = "کد تأیید باید ۵ رقم باشد";
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "تکرار رمز عبور الزامی است";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "تکرار رمز عبور مطابقت ندارد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [otpCode, password, confirmPassword]);

  // Send OTP (Step 1 submit)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1()) {
      toast.error("لطفاً اطلاعات را صحیح وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);
      const response = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: normalizedPhone,
          birthday,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "خطا در ارسال کد تأیید");
        return;
      }

      toast.success("کد تأیید به شماره تلفن شما ارسال شد");
      setStep(2);
      setCountdown(120); // 2 minutes countdown
      setCanResend(false);
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("خطا در ارسال کد تأیید");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);
      const response = await fetch("/api/auth/signup/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "خطا در ارسال مجدد کد");
        return;
      }

      toast.success("کد تأیید جدید ارسال شد");
      setCountdown(120);
      setCanResend(false);
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("خطا در ارسال مجدد کد");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and complete registration (Step 2 submit)
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
      
      const response = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          code: normalizedCode,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "خطا در تأیید کد");
        return;
      }

      // Store tokens
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

      toast.success(`ثبت‌نام با موفقیت انجام شد! خوش آمدید، ${data.name}`);
      router.push("/");
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error("خطا در ثبت‌نام");
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to step 1
  const handleGoBack = () => {
    setStep(1);
    setOtpCode("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  return (
    <AuthWrapper
      title="ایجاد حساب کاربری"
      subtitle="به خانواده وکسینا خوش آمدید"
      gradientClass="bg-gradient-to-r from-green-900/55 via-teal-900/60 to-blue-900/65"
    >
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {step === 1 ? (
        <form
          onSubmit={handleSendOTP}
          className="space-y-5"
        >
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

          <PhoneInput
            value={phone}
            onChange={setPhone}
            error={errors.phone}
          />

          <JalaliDatePicker
            value={birthday}
            onChange={setBirthday}
          />

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
      ) : (
        <form
          onSubmit={handleVerifyAndRegister}
          className="space-y-5"
        >
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

          {/* OTP Input */}
          <OtpInput
            value={otpCode}
            onChange={setOtpCode}
            error={errors.otpCode}
          />
          <OtpCountdown
            countdown={countdown}
            canResend={canResend}
            isLoading={isLoading}
            onResend={handleResendOTP}
          />

          {/* Password field */}
          <PasswordInput
            value={password}
            onChange={setPassword}
            error={errors.password}
            showValidTick
            validMessage="رمز عبور قابل قبول است"
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            label="تکرار رمز عبور"
            id="confirmPassword"
            placeholder="رمز عبور را مجدداً وارد کنید"
            showValidTick={password.length >= 6}
            validMessage="تکرار رمز عبور مطابقت دارد"
            autoComplete="new-password"
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
