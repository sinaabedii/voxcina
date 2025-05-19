"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";

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
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <div className="flex  items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-voxcina-blue/5 to-secondary-300/10 blur-3xl opacity-30 -z-10"
          animate={{
            opacity: [0.2, 0.3, 0.2],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />

        <motion.div variants={itemVariants} className="text-center mb-8">
          <Link href="/sign-in" className="inline-block mb-4">
            <div className="flex items-center justify-center text-voxcina-blue hover:text-voxcina-darkBlue transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1"
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
              <span>بازگشت به صفحه ورود</span>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-voxcina-blue">
            بازیابی{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxcina-blue to-primary-400">
              رمز عبور
            </span>
          </h2>
          <p className="mt-2 text-sm text-voxcina-blue/70">
            لینک بازیابی رمز عبور به ایمیل شما ارسال خواهد شد
          </p>
        </motion.div>

        <Card className="w-full bg-white/80 backdrop-blur-md border border-white/20 shadow-medium rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-bold text-voxcina-blue">
              فراموشی رمز عبور
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit}>
                <motion.div className="space-y-5" variants={containerVariants}>
                  <motion.div variants={itemVariants}>
                    <Input
                      label="ایمیل"
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                      leftElement={
                        <Mail className="h-4 w-4 text-voxcina-blue/60" />
                      }
                      placeholder="example@mail.com"
                      className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl"
                    />
                  </motion.div>

                  <motion.div className="pt-2" variants={itemVariants}>
                    <Button
                      variant="primary"
                      fullWidth
                      type="submit"
                      isLoading={isLoading}
                      className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium"
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
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-green-500"
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
                  </div>
                  <h3 className="text-xl font-bold text-voxcina-blue mb-2">
                    ایمیل ارسال شد
                  </h3>
                  <p className="text-sm text-voxcina-blue/70 mb-4">
                    لینک بازیابی رمز عبور به ایمیل <strong>{email}</strong>{" "}
                    ارسال شد.
                    <br />
                    لطفاً صندوق ورودی خود را بررسی کنید.
                  </p>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-voxcina-blue/80 w-full mb-4">
                    <div className="flex">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-blue-500 ml-2 flex-shrink-0"
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
                      <span>
                        اگر ایمیل را دریافت نکردید، لطفاً پوشه اسپم را بررسی
                        کنید.
                      </span>
                    </div>
                  </div>

                  <Link href="/sign-in">
                    <Button
                      variant="outline"
                      className="border-voxcina-blue text-voxcina-blue hover:bg-voxcina-blue hover:text-white rounded-xl transition-all duration-300"
                    >
                      بازگشت به صفحه ورود
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <motion.div
          className="mt-6 text-center text-xs text-voxcina-blue/60"
          variants={itemVariants}
        >
          <div className="flex flex-row-reverse justify-center items-center space-x-2 space-x-reverse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-voxcina-blue/60"
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
            <span>اطلاعات شما نزد ما محفوظ می‌ماند</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
