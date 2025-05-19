"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";

export default function VerifyCodePage() {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const router = useRouter();

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (error) setError(null);

    if (value && !/^[0-9]$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      e.key === "Backspace" &&
      !code[index] &&
      index > 0 &&
      inputRefs.current[index - 1]
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split("");
      setCode(newCode);

      if (inputRefs.current[5]) {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleResendCode = () => {
    if (!canResend) return;

    setCanResend(false);
    setResendCountdown(60);
    setError(null);

    setTimeout(() => {
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.some((digit) => !digit)) {
      setError("لطفاً کد تأیید ۶ رقمی را کامل وارد کنید");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (code.join("") === "123456") {
        setIsVerified(true);
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      } else {
        setError("کد وارد شده صحیح نیست");
      }
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

  

  const codeInputs = Array(6).fill(null);

  return (
    <div className="flex items-center justify-center  py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-voxcina-blue/5 via-primary-300/5 to-secondary-300/10 blur-3xl opacity-30 -z-10"
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
            تایید{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxcina-blue to-primary-400">
              کد امنیتی
            </span>
          </h2>
          <p className="mt-2 text-sm text-voxcina-blue/70">
            کد ۶ رقمی ارسال شده به ایمیل خود را وارد نمایید
          </p>
        </motion.div>

        <Card className="w-full bg-white/80 backdrop-blur-md border border-white/20 shadow-medium rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-bold text-voxcina-blue">
              تایید حساب کاربری
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!isVerified ? (
              <form onSubmit={handleSubmit}>
                <motion.div className="space-y-6" variants={containerVariants}>
                  <motion.div variants={itemVariants}>
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-voxcina-blue/70 mb-4">
                        کد تأیید به ایمیل{" "}
                        <span className="font-medium text-voxcina-blue">
                          user@example.com
                        </span>{" "}
                        ارسال شد
                      </p>

                      <div dir="rtl" className="flex justify-center gap-2 mb-2">
                        {codeInputs.map((_, index) => (
                          <div key={index} className="w-10 sm:w-12">
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={1}
                              value={code[index] || ""}
                              onChange={(e) => handleChange(index, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(index, e)}
                              onPaste={index === 0 ? handlePaste : undefined}
                              ref={(el) => {
                                inputRefs.current[index] = el;
                              }}
                              className={`
                                w-full h-12 sm:h-14 
                                text-center text-xl font-bold 
                                rounded-xl 
                                text-voxcina-blue
                                ${
                                  error
                                    ? "border-red-300 bg-red-50"
                                    : "border-secondary-300 bg-white/70"
                                }
                                border-2
                                focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20
                                transition-all duration-200
                                appearance-none
                              `}
                            />
                          </div>
                        ))}
                      </div>

                      {error && (
                        <motion.p
                          className="text-red-500 text-sm mt-2 flex items-center"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {error}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex justify-center"
                    variants={itemVariants}
                  >
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={!canResend}
                      className={`text-sm py-2 px-4 ${
                        canResend
                          ? "text-voxcina-blue hover:text-voxcina-darkBlue cursor-pointer"
                          : "text-voxcina-blue/50 cursor-not-allowed"
                      } transition-colors`}
                    >
                      {canResend
                        ? "ارسال مجدد کد تأیید"
                        : `ارسال مجدد کد تا ${resendCountdown} ثانیه دیگر`}
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button
                      variant="primary"
                      fullWidth
                      type="submit"
                      isLoading={isLoading}
                      className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium"
                    >
                      {isLoading ? "در حال بررسی..." : "تایید کد"}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            ) : (
              <motion.div
                className="py-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4"
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
                      className="h-10 w-10 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                  <h3 className="text-xl font-bold text-voxcina-blue mb-2">
                    تأیید موفقیت‌آمیز
                  </h3>
                  <p className="text-sm text-voxcina-blue/70 mb-1">
                    حساب کاربری شما با موفقیت تأیید شد
                  </p>
                  <p className="text-xs text-voxcina-blue/60 mb-4">
                    در حال انتقال به صفحه ورود...
                  </p>

                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-voxcina-blue"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                    />
                  </div>
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>کد تأیید فقط به مدت ۱۰ دقیقه معتبر است</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}