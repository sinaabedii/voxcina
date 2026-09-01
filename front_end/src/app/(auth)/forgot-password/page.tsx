"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import AuthWrapper from "@/components/auth/AuthWrapper";
import PhoneInput, { persianToEnglishDigits, validatePhone } from "@/components/auth/PhoneInput";
import OtpInput from "@/components/auth/OtpInput";
import OtpCountdown from "@/components/auth/OtpCountdown";
import PasswordInput, { validatePassword } from "@/components/auth/PasswordInput";
import StepIndicator from "@/components/auth/StepIndicator";
import { toast } from "react-toastify";

const STEPS = [
  { label: "شماره موبایل" },
  { label: "تغییر رمز" },
];

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [errors, setErrors] = useState<{
    phone?: string;
    otpCode?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

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
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return false;
    }
    setErrors({});
    return true;
  }, [phone]);

  // Validate Step 2
  const validateStep2 = useCallback(() => {
    const newErrors: typeof errors = {};

    // Validate OTP
    if (!otpCode.trim()) {
      newErrors.otpCode = "کد تأیید الزامی است";
    } else if (!/^[0-9۰-۹]{5}$/.test(otpCode)) {
      newErrors.otpCode = "کد تأیید باید ۵ رقم باشد";
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Validate confirm password
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
      toast.error("لطفاً شماره تلفن را صحیح وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);

      // Check if phone exists
      const checkRes = await fetch("/api/users/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      if (!checkRes.ok) {
        toast.error("کاربری با این شماره تلفن وجود ندارد");
        return;
      }

      // Send OTP for password reset
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "خطا در ارسال کد تأیید");
        return;
      }

      toast.success("کد تأیید به شماره تلفن شما ارسال شد");
      setStep(2);
      setCountdown(120);
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
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
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

  // Verify OTP and reset password (Step 2 submit)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      toast.error("لطفاً اطلاعات را صحیح وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);
      const normalizedCode = persianToEnglishDigits(otpCode);

      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          code: normalizedCode,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "خطا در تغییر رمز عبور");
        return;
      }

      toast.success("رمز عبور با موفقیت تغییر کرد");
      setIsSuccess(true);
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("خطا در تغییر رمز عبور");
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

  // Success state
  if (isSuccess) {
    return (
      <AuthWrapper
        title="رمز عبور تغییر کرد"
        subtitle="رمز عبور شما با موفقیت تغییر یافت"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            اکنون می‌توانید با رمز عبور جدید وارد حساب کاربری خود شوید.
          </p>

          <Link href="/sign-in" className="w-full">
            <Button
              variant="primary"
              fullWidth
              className="h-12 text-base font-medium"
            >
              ورود به حساب
            </Button>
          </Link>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper
      title="بازیابی رمز عبور"
      subtitle="رمز عبور جدید برای حساب خود تنظیم کنید"
    >
      {/* Back to login link */}
      <Link 
        href="/sign-in" 
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به صفحه ورود</span>
      </Link>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {step === 1 ? (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            error={errors.phone}
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
            رمز خود را به یاد آوردید؟{" "}
            <Link href="/sign-in" className="text-voxcina-blue font-semibold hover:underline">
              وارد شوید
            </Link>
          </p>

          {/* Footer badge */}
          <div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>اطلاعات شما نزد ما محفوظ است</span>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          {/* Back button & Phone display */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <button
              type="button"
              onClick={handleGoBack}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>تغییر شماره</span>
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

          {/* New Password */}
          <PasswordInput
            value={password}
            onChange={setPassword}
            error={errors.password}
            label="رمز عبور جدید"
            id="new-password"
            placeholder="رمز عبور جدید را وارد کنید"
            showStrength
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            label="تکرار رمز عبور جدید"
            id="confirm-password"
            placeholder="رمز عبور را مجدداً وارد کنید"
            autoComplete="new-password"
          />

          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isLoading}
            className="h-12 text-base font-medium rounded-xl"
          >
            {isLoading ? "در حال تغییر..." : "تغییر رمز عبور"}
          </Button>
        </form>
      )}
    </AuthWrapper>
  );
}
