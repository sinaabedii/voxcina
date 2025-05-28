"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { toast } from "react-toastify";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "ایمیل الزامی است";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "ایمیل نامعتبر است";
    }

    if (!password) {
      newErrors.password = "رمز عبور الزامی است";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("لطفا اطلاعات فرم را کامل کنید");
      return;
    }

    try {
      await login({ email, password });
      router.push("/");
    } catch (error) {
      // Error is already handled in the auth store with toast
      console.error("Login error:", error);
    }
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
                transition={{ type: "spring", stiffness: 300 }}
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
                  <div
                    className="hidden h-12 sm:h-14 md:h-16 items-center justify-center bg-gradient-to-r from-voxcina-blue to-primary-400 text-white font-bold text-lg sm:text-xl md:text-2xl px-4 rounded-xl shadow-medium"
                    style={{ display: "none" }}
                  >
                    وکسینا
                  </div>
                </div>
              </motion.div>

              <CardTitle className="text-xl sm:text-2xl font-bold text-voxcina-blue">
                ورود به حساب کاربری
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 px-4 sm:px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div className="space-y-4" variants={containerVariants}>
                  <motion.div variants={itemVariants}>
                    <Input
                      label="ایمیل"
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                      leftElement={
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-voxcina-blue/60" />
                      }
                      placeholder="example@mail.com"
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
                      {isLoading ? "در حال ورود..." : "ورود"}
                    </Button>
                  </motion.div>

                  <motion.div
                    className="text-center mt-4"
                    variants={itemVariants}
                  >
                    <p className="text-xs sm:text-sm text-voxcina-blue/70 mb-2">
                      حساب کاربری ندارید؟{" "}
                      <Link
                        href="/sign-up"
                        className="text-voxcina-blue font-medium hover:text-voxcina-darkBlue transition-colors underline underline-offset-2"
                      >
                        ثبت‌نام کنید
                      </Link>
                    </p>
                  </motion.div>
                </motion.div>
              </form>
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
              وکسینا را می‌پذیرید
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
