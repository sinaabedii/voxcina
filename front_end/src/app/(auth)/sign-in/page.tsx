"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { localStorageManager } from "@/lib/local-storage-manager";
import { validateReturnUrl } from "@/lib/url-security";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import AuthWrapper from "@/components/auth/AuthWrapper";
import PhoneInput, { persianToEnglishDigits, validatePhone as validatePhoneUtil } from "@/components/auth/PhoneInput";
import OtpInput from "@/components/auth/OtpInput";
import OtpCountdown from "@/components/auth/OtpCountdown";
import PasswordInput from "@/components/auth/PasswordInput";

export default function SignInPage() {
  const [mode, setMode] = useState<'password' | 'sms'>("password");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; smsCode?: string }>(
    {}
  );

  const { login, loginSms } = useAuthStore();
  const router = useRouter();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSent && countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, isSent]);

  // Validate phone
  const validatePhone = useCallback(() => {
    const phoneError = validatePhoneUtil(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return false;
    }
    setErrors({});
    return true;
  }, [phone]);

  // Validate password mode
  const validatePasswordMode = useCallback(() => {
    const newErrors: typeof errors = {};
    
    const phoneError = validatePhoneUtil(phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    if (!password) {
      newErrors.password = "رمز عبور الزامی است";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [phone, password]);

  // Validate SMS code
  const validateSmsCode = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!smsCode.trim()) {
      newErrors.smsCode = "کد تأیید الزامی است";
    } else if (!/^[0-9۰-۹]{5}$/.test(smsCode)) {
      newErrors.smsCode = "کد تأیید باید ۵ رقم باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [smsCode]);

  // Send OTP via SMS
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone()) {
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
        toast.error("کاربری با این شماره تلفن وجود ندارد. لطفاً ثبت نام کنید");
        return;
      }

      const res = await fetch("/api/auth/send-otp", {
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
      setIsSent(true);
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
      const res = await fetch("/api/auth/send-otp", {
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

  // Verify OTP code
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSmsCode()) {
      toast.error("لطفاً کد تأیید را صحیح وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);
      const normalizedCode = persianToEnglishDigits(smsCode);

      const res = await fetch("/api/auth/check-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code: normalizedCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "کد نامعتبر است");
        return;
      }

      toast.success("کد معتبر است، درحال ورود...");
      await loginSms(normalizedPhone, data.verificationToken);
      
      // Redirect to stored return URL or default to home
      // Validate return URL to prevent token exposure (Requirement 7.2)
      const storedUrl = localStorageManager.consumeReturnUrl();
      const returnUrl = validateReturnUrl(storedUrl);
      router.push(returnUrl || "/");
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error("خطا در تأیید کد");
    } finally {
      setIsLoading(false);
    }
  };

  // Password mode login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordMode()) {
      toast.error("لطفاً اطلاعات را صحیح وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = persianToEnglishDigits(phone);
      await login({ phone: normalizedPhone, password });
      
      // Redirect to stored return URL or default to home
      // Validate return URL to prevent token exposure (Requirement 7.2)
      const storedUrl = localStorageManager.consumeReturnUrl();
      const returnUrl = validateReturnUrl(storedUrl);
      router.push(returnUrl || "/");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to phone input
  const handleGoBack = () => {
    setIsSent(false);
    setSmsCode("");
    setCountdown(0);
    setCanResend(false);
    setErrors({});
  };

  return (
    <AuthWrapper
      title="ورود به حساب"
      subtitle="خوش آمدید! لطفاً وارد حساب کاربری خود شوید"
      gradientClass="bg-gradient-to-l from-blue-900/60 via-indigo-900/50 to-purple-900/65"
    >
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-full mb-8">
        <button
          type="button"
          onClick={() => {
            setMode('password');
            setIsSent(false);
            setSmsCode("");
            setErrors({});
          }}
          className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
            mode === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          رمز عبور
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('sms');
            setPassword("");
            setErrors({});
          }}
          className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
            mode === 'sms'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          کد یکبار مصرف
        </button>
      </div>

      {mode === 'password' ? (
        <form
          onSubmit={handlePasswordLogin}
          className="space-y-6"
        >
          <PhoneInput
            value={phone}
            onChange={setPhone}
            error={errors.phone}
          />

          <div>
            <PasswordInput
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete="current-password"
            />
            <div className="flex justify-end mt-2">
              <Link 
                href="/forgot-password" 
                className="text-sm text-voxcina-blue hover:underline"
              >
                فراموشی رمز عبور؟
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-voxcina-blue focus:ring-voxcina-blue/20 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
              مرا به خاطر بسپار
            </label>
          </div>

          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isLoading}
            className="h-12 text-base font-medium rounded-xl"
          >
            {isLoading ? "درحال ورود..." : "ورود به حساب"}
          </Button>

          <p className="text-center text-sm text-gray-500 pt-4">
            حساب کاربری ندارید؟{" "}
            <Link href="/sign-up" className="text-voxcina-blue font-semibold hover:underline">
              ثبت‌نام کنید
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={isSent ? handleVerifyOTP : handleSendOTP}
          className="space-y-6"
        >
          {!isSent ? (
            <>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                error={errors.phone}
                id="phone-sms"
              />

              <Button
                variant="primary"
                fullWidth
                type="submit"
                isLoading={isLoading}
                className="h-12 text-base font-medium rounded-xl"
              >
                {isLoading ? "درحال ارسال..." : "دریافت کد تأیید"}
              </Button>

              <p className="text-center text-sm text-gray-500 pt-4">
                حساب کاربری ندارید؟{" "}
                <Link href="/sign-up" className="text-voxcina-blue font-semibold hover:underline">
                  ثبت‌نام کنید
                </Link>
              </p>
            </>
          ) : (
            <>
              {/* Back button & Phone display */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>تغییر شماره</span>
                </button>
                <span className="text-sm font-medium text-gray-900 direction-ltr">
                  {persianToEnglishDigits(phone)}
                </span>
              </div>

              {/* OTP Input */}
              <OtpInput
                value={smsCode}
                onChange={setSmsCode}
                error={errors.smsCode}
              />
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
                {isLoading ? "درحال تأیید..." : "تأیید و ورود"}
              </Button>
            </>
          )}
        </form>
      )}
    </AuthWrapper>
  );
}
