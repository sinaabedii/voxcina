"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Phone, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
        toast.error("کاربری با این شماره تلفن وجود ندارد. لطفاً ثبتنام کنید");
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
      <motion.div
        className="w-full max-w-md mx-auto relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="w-full bg-white/80 backdrop-blur-md border border-white/20 shadow-medium rounded-2xl sm:rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-2 pt-6 px-4 sm:px-6">
              <motion.div
                className="flex justify-center mb-4"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring" as const, stiffness: 300 }}
              >
                <div className="relative">
                  <Link href="/" className="flex items-center group">
                    <div className="relative w-24 sm:w-28 md:w-32 h-10 sm:h-12 md:h-12 transition-all duration-300">
                      <Image
                        alt={APP_NAME}
                        priority
                        quality={100}
                        src={"/images/Logo/BlueXTransparent.png"}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 6rem, (max-width: 768px) 7rem, 8rem"
                      />
                    </div>
                  </Link>
                </div>
              </motion.div>

              <CardTitle className="text-xl sm:text-2xl font-bold text-voxcina-blue">
                ورود به حساب کاربری
              </CardTitle>

              {/* Mode Toggle */}
              <div className="flex justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('password');
                    setIsSent(false);
                    setSmsCode("");
                    setErrors({});
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'password'
                      ? 'bg-voxcina-blue text-white shadow-soft'
                      : 'bg-white/70 text-voxcina-blue/70 hover:bg-white/90'
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === 'sms'
                      ? 'bg-voxcina-blue text-white shadow-soft'
                      : 'bg-white/70 text-voxcina-blue/70 hover:bg-white/90'
                  }`}
                >
                  کد یکبار مصرف
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-2 px-4 sm:px-6 pb-6">
              <AnimatePresence mode="wait">
                {mode === 'password' ? (
                  <motion.form
                    key="password-mode"
                    onSubmit={handlePasswordLogin}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div className="space-y-4" initial="hidden" animate="visible" variants={containerVariants}>
                      <motion.div variants={itemVariants}>
                        <Input
                          label="شماره تلفن"
                          type="tel"
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          error={errors.phone}
                          autoComplete="tel"
                          leftElement={
                            <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                          }
                          placeholder="09123456789"
                          className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Input
                          label="رمز عبور"
                          type={showPassword ? "text" : "password"}
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          error={errors.password}
                          leftElement={
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                          }
                          rightElement={
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-voxcina-blue/60 hover:text-voxcina-blue transition-colors p-1"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                              ) : (
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              )}
                            </button>
                          }
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                        />
                      </motion.div>

                      <motion.div
                        className="flex justify-between items-center mt-4"
                        variants={itemVariants}
                      >
                        <div className="flex items-start space-x-3 space-x-reverse">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              id="remember"
                              className="sr-only"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label
                              htmlFor="remember"
                              className="relative flex items-center cursor-pointer"
                            >
                              <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-secondary-300 rounded-lg bg-white/70 transition-all duration-200 hover:border-voxcina-blue/50 peer-checked:border-voxcina-blue peer-checked:bg-voxcina-blue">
                                <svg
                                  className={`w-3 h-3 sm:w-4 sm:h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${
                                    rememberMe ? "opacity-100" : "opacity-0"
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            </label>
                          </div>
                          <label
                            htmlFor="remember"
                            className="text-xs sm:text-sm text-voxcina-blue/80 leading-relaxed cursor-pointer select-none"
                          >
                            مرا به خاطر بسپار
                          </label>
                        </div>

                        <Link
                          href="/forgot-password"
                          className="text-xs sm:text-sm text-voxcina-blue font-medium hover:text-voxcina-darkBlue transition-colors underline underline-offset-2"
                        >
                          فراموشی رمز عبور
                        </Link>
                      </motion.div>

                      <motion.div className="pt-3" variants={itemVariants}>
                        <Button
                          variant="primary"
                          fullWidth
                          type="submit"
                          isLoading={isLoading}
                          className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 sm:py-3.5 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium text-sm sm:text-base font-medium"
                        >
                          {isLoading ? "درحال ورود..." : "ورود"}
                        </Button>
                      </motion.div>

                      <motion.div className="text-center mt-4" variants={itemVariants}>
                        <p className="text-xs sm:text-sm text-voxcina-blue/70">
                          حساب کاربری ندارید؟{" "}
                          <Link
                            href="/sign-up"
                            className="text-voxcina-blue font-medium hover:text-voxcina-darkBlue transition-colors underline underline-offset-2"
                          >
                            ثبتنام کنید
                          </Link>
                        </p>
                      </motion.div>
                    </motion.div>
                  </motion.form>
                ) : (
                  <motion.form
                    key="sms-mode"
                    onSubmit={isSent ? handleVerifyOTP : handleSendOTP}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div className="space-y-4" initial="hidden" animate="visible" variants={containerVariants}>
                      {!isSent ? (
                        <>
                          <motion.div variants={itemVariants}>
                            <Input
                              label="شماره تلفن"
                              type="tel"
                              id="phone-sms"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              error={errors.phone}
                              autoComplete="tel"
                              leftElement={
                                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                              }
                              placeholder="09123456789"
                              className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                            />
                          </motion.div>

                          <motion.div className="pt-3" variants={itemVariants}>
                            <Button
                              variant="primary"
                              fullWidth
                              type="submit"
                              isLoading={isLoading}
                              className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 sm:py-3.5 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium text-sm sm:text-base font-medium"
                            >
                              {isLoading ? "درحال ارسال کد..." : "ارسال کد تأیید"}
                            </Button>
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <motion.div variants={itemVariants}>
                            <button
                              type="button"
                              onClick={handleGoBack}
                              className="flex items-center gap-1 text-sm text-voxcina-blue/70 hover:text-voxcina-blue transition-colors"
                            >
                              <ArrowRight className="w-4 h-4" />
                              بازگشت
                            </button>
                          </motion.div>

                          <motion.div variants={itemVariants} className="bg-voxcina-blue/5 rounded-xl p-3 text-center">
                            <p className="text-sm text-voxcina-blue/70">کد تأیید به شماره زیر ارسال شد:</p>
                            <p className="text-lg font-medium text-voxcina-blue mt-1 direction-ltr">
                              {persianToEnglishDigits(phone)}
                            </p>
                          </motion.div>

                          <motion.div variants={itemVariants}>
                            <Input
                              label="کد تأیید (۵ رقم)"
                              type="text"
                              id="smsCode"
                              value={smsCode}
                              onChange={(e) => setSmsCode(e.target.value)}
                              error={errors.smsCode}
                              maxLength={5}
                              placeholder="۱۲۳۴۵"
                              autoComplete="one-time-code"
                              className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5 text-center tracking-widest"
                            />
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-voxcina-blue/50">
                                {countdown > 0 ? `${formatCountdown(countdown)} تا ارسال مجدد` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={!canResend || isLoading}
                                className={`text-xs ${canResend ? 'text-voxcina-blue hover:underline' : 'text-gray-400'} transition-colors`}
                              >
                                ارسال مجدد کد
                              </button>
                            </div>
                          </motion.div>

                          <motion.div className="pt-3" variants={itemVariants}>
                            <Button
                              variant="primary"
                              fullWidth
                              type="submit"
                              isLoading={isLoading}
                              className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 sm:py-3.5 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium text-sm sm:text-base font-medium"
                            >
                              {isLoading ? "درحال تأیید..." : "تأیید کد"}
                            </Button>
                          </motion.div>
                        </>
                      )}

                      <motion.div className="text-center mt-4" variants={itemVariants}>
                        <p className="text-xs sm:text-sm text-voxcina-blue/70">
                          حساب کاربری ندارید؟{" "}
                          <Link
                            href="/sign-up"
                            className="text-voxcina-blue font-medium hover:text-voxcina-darkBlue transition-colors underline underline-offset-2"
                          >
                            ثبتنام کنید
                          </Link>
                        </p>
                      </motion.div>
                    </motion.div>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-4 text-center">
          <div className="inline-flex items-center justify-center space-x-2 space-x-reverse bg-white/50 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 border border-white/20 shadow-soft">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 sm:h-4 sm:w-4 text-voxcina-blue/60 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-xs sm:text-sm text-voxcina-blue/60">
              با ورود به سایت،{" "}
              <Link href="/terms" className="text-voxcina-blue hover:underline">
                قوانین و مقررات
              </Link>{" "}
              وکسینا را میپذیرید
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
