"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, Phone, ArrowRight, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { toast } from "react-toastify";

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
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      newErrors.password = "رمز عبور باید شامل حروف کوچک، بزرگ، عدد و کاراکتر خاص باشد";
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

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                ایجاد حساب کاربری
              </CardTitle>
              
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  step === 1 ? 'bg-voxcina-blue text-white' : 'bg-green-500 text-white'
                }`}>
                  {step === 1 ? '۱' : <CheckCircle className="w-5 h-5" />}
                </div>
                <div className={`w-12 h-1 rounded-full transition-all ${
                  step === 2 ? 'bg-voxcina-blue' : 'bg-gray-200'
                }`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  step === 2 ? 'bg-voxcina-blue text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  ۲
                </div>
              </div>
              <p className="text-xs text-voxcina-blue/60 mt-2">
                {step === 1 ? 'مرحله ۱: اطلاعات شخصی' : 'مرحله ۲: تأیید و رمز عبور'}
              </p>
            </CardHeader>
            
            <CardContent className="pt-2 px-4 sm:px-6 pb-6">
              <AnimatePresence mode="wait" custom={step}>
                {step === 1 ? (
                  <motion.form
                    key="step1"
                    onSubmit={handleSendOTP}
                    className="space-y-4"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={slideVariants}
                    custom={1}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div className="space-y-4" variants={containerVariants}>
                      <motion.div variants={itemVariants}>
                        <Input
                          label="نام (فارسی)"
                          type="text"
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          error={errors.firstName}
                          leftElement={
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                          }
                          placeholder="علی"
                          className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Input
                          label="نام خانوادگی (فارسی)"
                          type="text"
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          error={errors.lastName}
                          leftElement={
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                          }
                          placeholder="محمدی"
                          className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Input
                          label="شماره تلفن"
                          type="tel"
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          error={errors.phone}
                          leftElement={<Phone className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />}
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                        />
                        <p className="text-xs text-voxcina-blue/50 mt-1">
                          می‌توانید با اعداد فارسی یا انگلیسی وارد کنید
                        </p>
                      </motion.div>

                      <motion.div className="pt-3" variants={itemVariants}>
                        <Button
                          variant="primary"
                          fullWidth
                          type="submit"
                          isLoading={isLoading}
                          className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 sm:py-3.5 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium text-sm sm:text-base font-medium"
                        >
                          {isLoading ? "در حال ارسال کد..." : "دریافت کد تأیید"}
                        </Button>
                      </motion.div>

                      <motion.div className="text-center mt-4" variants={itemVariants}>
                        <p className="text-xs sm:text-sm text-voxcina-blue/70">
                          قبلاً ثبت‌نام کرده‌اید؟{" "}
                          <Link
                            href="/sign-in"
                            className="text-voxcina-blue font-medium hover:text-voxcina-darkBlue transition-colors underline underline-offset-2"
                          >
                            وارد شوید
                          </Link>
                        </p>
                      </motion.div>
                    </motion.div>
                  </motion.form>
                ) : (
                  <motion.form
                    key="step2"
                    onSubmit={handleVerifyAndRegister}
                    className="space-y-4"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={slideVariants}
                    custom={2}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div className="space-y-4" variants={containerVariants}>
                      {/* Back button */}
                      <motion.div variants={itemVariants}>
                        <button
                          type="button"
                          onClick={handleGoBack}
                          className="flex items-center gap-1 text-sm text-voxcina-blue/70 hover:text-voxcina-blue transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                          بازگشت به مرحله قبل
                        </button>
                      </motion.div>

                      {/* Phone display */}
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
                          id="otpCode"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          error={errors.otpCode}
                          maxLength={5}
                          placeholder="۱۲۳۴۵"
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
                          className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl text-sm sm:text-base py-2.5"
                        />
                        <p className="text-xs text-voxcina-blue/50 mt-1">
                          حداقل ۸ کاراکتر، شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص
                        </p>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Input
                          label="تکرار رمز عبور"
                          type={showPassword ? "text" : "password"}
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          error={errors.confirmPassword}
                          leftElement={
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                          }
                          placeholder="••••••••"
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
                          {isLoading ? "در حال ثبت‌نام..." : "تأیید و ثبت‌نام"}
                        </Button>
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
              اطلاعات شما نزد ما محفوظ می‌ماند
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
