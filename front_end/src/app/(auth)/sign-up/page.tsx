"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, Phone, ArrowRight, Shield } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import AuthWrapper from "@/components/auth/AuthWrapper";

// Persian character validation regex (includes Persian letters and spaces)
const persianNameRegex = /^[\u0600-\u06FF\s]+$/;

// IR phone number validation regex: 09xxxxxxxxx (11 digits starting with 09)
// Accepts both Persian and English digits
const irPhoneRegexPersian = /^[۰0][۹9][۰-۹0-9]{9}$/;

// Convert Persian digits to English
const persianToEnglishDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
  }
  return result;
};

// Validate Persian name
const isPersianName = (name: string): boolean => {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return persianNameRegex.test(trimmed);
};

export default function SignUpPage() {
  // Step 1: User info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Step 2: OTP and password
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
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

    const normalizedPhone = persianToEnglishDigits(phone);
    if (!phone.trim()) {
      newErrors.phone = "شماره تلفن الزامی است";
    } else if (!irPhoneRegexPersian.test(phone) && !/^09[0-9]{9}$/.test(normalizedPhone)) {
      newErrors.phone = "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)";
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

    if (!password) {
      newErrors.password = "رمز عبور الزامی است";
    } else if (password.length < 8) {
      newErrors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = "رمز عبور باید شامل حروف کوچک، بزرگ و عدد باشد";
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
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
      }

      // Update auth store
      setUser({
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AuthWrapper
      title="ایجاد حساب کاربری"
      subtitle="به خانواده وکسینا خوش آمدید"
      imageSrc="/images/banners/heroheader.jpeg"
    >
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
            step >= 1 ? 'bg-voxcina-blue text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            ۱
          </div>
          <span className={`text-sm hidden sm:inline ${step === 1 ? 'text-voxcina-blue font-medium' : 'text-gray-400'}`}>
            اطلاعات
          </span>
        </div>
        <div className={`w-8 h-0.5 rounded transition-all duration-300 ${step === 2 ? 'bg-voxcina-blue' : 'bg-gray-200'}`} />
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
            step === 2 ? 'bg-voxcina-blue text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            ۲
          </div>
          <span className={`text-sm hidden sm:inline ${step === 2 ? 'text-voxcina-blue font-medium' : 'text-gray-400'}`}>
            تأیید
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="step1"
            onSubmit={handleSendOTP}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Name fields in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="نام"
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.firstName}
                leftElement={<User className="h-5 w-5 text-gray-400" />}
                placeholder="علی"
                className="text-base h-12"
              />
              <Input
                label="نام خانوادگی"
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
                leftElement={<User className="h-5 w-5 text-gray-400" />}
                placeholder="محمدی"
                className="text-base h-12"
              />
            </div>

            <Input
              label="شماره موبایل"
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              leftElement={<Phone className="h-5 w-5 text-gray-400" />}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              className="text-base h-12"
            />

            <Button
              variant="primary"
              fullWidth
              type="submit"
              isLoading={isLoading}
              className="h-12 text-base font-medium mt-4"
            >
              {isLoading ? "در حال ارسال..." : "دریافت کد تأیید"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">یا</span>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500">
              حساب دارید؟{" "}
              <Link href="/sign-in" className="text-voxcina-blue font-semibold hover:underline">
                وارد شوید
              </Link>
            </p>

            {/* Footer badge */}
            <div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              <span>اطلاعات شما نزد ما محفوظ است</span>
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="step2"
            onSubmit={handleVerifyAndRegister}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Back button & Phone display */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl px-4 py-3 border border-gray-100">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت</span>
              </button>
              <span className="text-sm font-medium text-gray-700 direction-ltr bg-white px-3 py-1 rounded-lg">
                {persianToEnglishDigits(phone)}
              </span>
            </div>

            {/* OTP Input */}
            <div>
              <Input
                label="کد تأیید"
                type="text"
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                error={errors.otpCode}
                maxLength={5}
                placeholder="_ _ _ _ _"
                autoComplete="one-time-code"
                className="text-base h-12 text-center tracking-[0.5em] font-medium"
              />
              <div className="flex justify-between items-center mt-3 text-sm">
                <span className="text-gray-400 font-medium">
                  {countdown > 0 && (
                    <span className="bg-gray-100 px-2 py-1 rounded-md">
                      {formatCountdown(countdown)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!canResend || isLoading}
                  className={`${canResend ? 'text-voxcina-blue hover:underline font-medium' : 'text-gray-300'} transition-colors`}
                >
                  ارسال مجدد
                </button>
              </div>
            </div>

            {/* Password fields */}
            <Input
              label="رمز عبور"
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftElement={<Lock className="h-5 w-5 text-gray-400" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
              placeholder="••••••••"
              className="text-base h-12"
              helperText="حداقل ۸ کاراکتر شامل حروف بزرگ، کوچک و عدد"
            />

            <Input
              label="تکرار رمز عبور"
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              leftElement={<Lock className="h-5 w-5 text-gray-400" />}
              placeholder="••••••••"
              className="text-base h-12"
            />

            <Button
              variant="primary"
              fullWidth
              type="submit"
              isLoading={isLoading}
              className="h-12 text-base font-medium mt-4"
            >
              {isLoading ? "در حال ثبت‌نام..." : "تکمیل ثبت‌نام"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthWrapper>
  );
}
