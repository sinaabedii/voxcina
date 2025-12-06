"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Phone, Lock, ArrowRight, Shield } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { toast } from "react-toastify";

// IR phone number validation regex: 09xxxxxxxxx (11 digits starting with 09)
const irPhoneRegex = /^09[0-9]{9}$/;

// Convert Persian digits to English
const persianToEnglishDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
  }
  return result;
};

export default function SignInPage() {
  const [mode, setMode] = useState<'password' | 'sms'>("password");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    const newErrors: typeof errors = {};
    const normalizedPhone = persianToEnglishDigits(phone);

    if (!phone.trim()) {
      newErrors.phone = "شماره تلفن الزامی است";
    } else if (!irPhoneRegex.test(normalizedPhone) && !/^09[0-9]{9}$/.test(normalizedPhone)) {
      newErrors.phone = "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [phone]);

  // Validate password mode
  const validatePasswordMode = useCallback(() => {
    const newErrors: typeof errors = {};
    const normalizedPhone = persianToEnglishDigits(phone);

    if (!phone.trim()) {
      newErrors.phone = "شماره تلفن الزامی است";
    } else if (!irPhoneRegex.test(normalizedPhone) && !/^09[0-9]{9}$/.test(normalizedPhone)) {
      newErrors.phone = "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)";
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
      await loginSms(normalizedPhone);
      router.push("/");
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
      router.push("/");
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

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-voxcina-blue/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-voxcina-blue/5 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Card Container */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100/80">
            <Link href="/" className="inline-block mb-2">
              <div className="relative w-24 h-10 mx-auto">
                <Image
                  alt={APP_NAME}
                  priority
                  quality={100}
                  src="/images/Logo/BlueXTransparent.png"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">ورود به حساب</h1>
            
            {/* Mode Toggle - Compact */}
            <div className="flex justify-center gap-1 mt-4 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('password');
                  setIsSent(false);
                  setSmsCode("");
                  setErrors({});
                }}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'password'
                    ? 'bg-white text-voxcina-blue shadow-sm'
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'sms'
                    ? 'bg-white text-voxcina-blue shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                کد یکبار مصرف
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {mode === 'password' ? (
                <motion.form
                  key="password-mode"
                  onSubmit={handlePasswordLogin}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <Input
                    label="شماره موبایل"
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                    autoComplete="tel"
                    leftElement={<Phone className="h-5 w-5 text-gray-400" />}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="text-base h-11"
                  />

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
                    autoComplete="current-password"
                    className="text-base h-11"
                  />

                  {/* Remember & Forgot */}
                  <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-500">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-voxcina-blue focus:ring-voxcina-blue/20"
                      />
                      مرا به خاطر بسپار
                    </label>
                    <Link href="/forgot-password" className="text-voxcina-blue hover:underline">
                      فراموشی رمز
                    </Link>
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    type="submit"
                    isLoading={isLoading}
                    className="h-12 text-base font-medium mt-3"
                  >
                    {isLoading ? "درحال ورود..." : "ورود"}
                  </Button>

                  <p className="text-center text-sm text-gray-500 pt-2">
                    حساب ندارید؟{" "}
                    <Link href="/sign-up" className="text-voxcina-blue font-medium hover:underline">
                      ثبت‌نام کنید
                    </Link>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="sms-mode"
                  onSubmit={isSent ? handleVerifyOTP : handleSendOTP}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {!isSent ? (
                    <>
                      <Input
                        label="شماره موبایل"
                        type="tel"
                        id="phone-sms"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        error={errors.phone}
                        autoComplete="tel"
                        leftElement={<Phone className="h-5 w-5 text-gray-400" />}
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        className="text-base h-11"
                      />

                      <Button
                        variant="primary"
                        fullWidth
                        type="submit"
                        isLoading={isLoading}
                        className="h-12 text-base font-medium mt-3"
                      >
                        {isLoading ? "درحال ارسال..." : "ارسال کد تأیید"}
                      </Button>

                      <p className="text-center text-sm text-gray-500 pt-2">
                        حساب ندارید؟{" "}
                        <Link href="/sign-up" className="text-voxcina-blue font-medium hover:underline">
                          ثبت‌نام کنید
                        </Link>
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Back button & Phone display */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                        <button
                          type="button"
                          onClick={handleGoBack}
                          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-voxcina-blue transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>بازگشت</span>
                        </button>
                        <span className="text-sm font-medium text-gray-700 direction-ltr">
                          {persianToEnglishDigits(phone)}
                        </span>
                      </div>

                      {/* OTP Input */}
                      <div>
                        <Input
                          label="کد تأیید"
                          type="text"
                          id="smsCode"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value)}
                          error={errors.smsCode}
                          maxLength={5}
                          placeholder="_ _ _ _ _"
                          autoComplete="one-time-code"
                          className="text-base h-11 text-center tracking-[0.5em] font-medium"
                        />
                        <div className="flex justify-between items-center mt-2 text-sm">
                          <span className="text-gray-400">
                            {countdown > 0 && formatCountdown(countdown)}
                          </span>
                          <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={!canResend || isLoading}
                            className={`${canResend ? 'text-voxcina-blue hover:underline' : 'text-gray-300'} transition-colors`}
                          >
                            ارسال مجدد
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        fullWidth
                        type="submit"
                        isLoading={isLoading}
                        className="h-12 text-base font-medium mt-3"
                      >
                        {isLoading ? "درحال تأیید..." : "تأیید و ورود"}
                      </Button>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer badge */}
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
          <Shield className="w-4 h-4" />
          <span>
            با ورود،{" "}
            <Link href="/terms" className="text-voxcina-blue hover:underline">
              قوانین
            </Link>{" "}
            را می‌پذیرید
          </span>
        </div>
      </motion.div>
    </div>
  );
}
