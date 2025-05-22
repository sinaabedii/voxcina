"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string } = {};

    if (!email) {
      newErrors.email = "ایمیل الزامی است";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "ایمیل نامعتبر است";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
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
        <motion.div variants={itemVariants} className="text-center mb-6">
          <Link href="/sign-in" className="inline-block mb-4">
            <div className="flex items-center justify-center text-voxcina-blue hover:text-voxcina-darkBlue transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 12H5M12 19l-7-7 7-7"
                />
              </svg>
              <span className="text-sm sm:text-base">بازگشت به صفحه ورود</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-voxcina-blue mb-1">
            بازیابی{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxcina-blue to-primary-400">
              رمز عبور
            </span>
          </h1>
          <p className="text-sm sm:text-base text-voxcina-blue/70 leading-relaxed">
            لینک بازیابی رمز عبور به ایمیل شما ارسال خواهد شد
          </p>
        </motion.div>

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
                فراموشی رمز عبور
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 px-4 sm:px-6 pb-6">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <motion.div
                    className="space-y-4"
                    variants={containerVariants}
                  >
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

                    <motion.div className="pt-3" variants={itemVariants}>
                      <Button
                        variant="primary"
                        fullWidth
                        type="submit"
                        isLoading={isLoading}
                        className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 sm:py-3.5 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium text-sm sm:text-base font-medium"
                      >
                        {isLoading ? "در حال ارسال..." : "ارسال لینک بازیابی"}
                      </Button>
                    </motion.div>
                  </motion.div>
                </form>
              ) : (
                <motion.div
                  className="py-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 sm:h-10 sm:w-10 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                    <h3 className="text-lg sm:text-xl font-bold text-voxcina-blue mb-2">
                      ایمیل ارسال شد
                    </h3>
                    <p className="text-sm text-voxcina-blue/70 mb-4 leading-relaxed">
                      لینک بازیابی رمز عبور به ایمیل{" "}
                      <span className="font-medium text-voxcina-blue">
                        {email}
                      </span>{" "}
                      ارسال شد.
                      <br />
                      لطفاً صندوق ورودی خود را بررسی کنید.
                    </p>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-voxcina-blue/80 w-full mb-4">
                      <div className="flex items-start">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 ml-2 flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="leading-relaxed">
                          اگر ایمیل را دریافت نکردید، لطفاً پوشه اسپم را بررسی
                          کنید.
                        </span>
                      </div>
                    </div>

                    <Link href="/sign-in" className="w-full">
                      <Button
                        variant="outline"
                        fullWidth
                        className="border-voxcina-blue text-voxcina-blue hover:bg-voxcina-blue hover:text-white rounded-xl transition-all duration-300 text-sm sm:text-base"
                      >
                        بازگشت به صفحه ورود
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
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
                d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
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
