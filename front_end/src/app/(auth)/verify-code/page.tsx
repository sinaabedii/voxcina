"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";
import AuthWrapper from "@/components/auth/AuthWrapper";

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

    setTimeout(() => {}, 1000);
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

  const codeInputs = Array(6).fill(null);

  return (
    <AuthWrapper
      title="تایید کد امنیتی"
      subtitle="کد ۶ رقمی ارسال شده به ایمیل خود را وارد نمایید"
    >
      {/* Back to login link */}
      <Link 
        href="/sign-in" 
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به صفحه ورود</span>
      </Link>

      {!isVerified ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-4 text-center leading-relaxed">
              کد تأیید به ایمیل{" "}
              <span className="font-medium text-gray-700">user@example.com</span>{" "}
              ارسال شد
            </p>

            <div dir="ltr" className="flex justify-center gap-2 sm:gap-3 mb-4">
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
                      text-center text-lg sm:text-xl font-bold 
                      rounded-xl 
                      text-gray-800
                      ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}
                      border-2
                      focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20
                      transition-all duration-200
                      appearance-none
                      outline-none
                    `}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={!canResend}
              className={`text-sm py-2 px-4 rounded-lg transition-all duration-200 ${
                canResend
                  ? "text-voxcina-blue hover:bg-voxcina-blue/5"
                  : "text-gray-400"
              }`}
            >
              {canResend
                ? "ارسال مجدد کد تأیید"
                : `ارسال مجدد کد تا ${resendCountdown} ثانیه دیگر`}
            </button>
          </div>

          {error && (
            <motion.div
              className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isLoading}
            className="h-12 text-base font-medium mt-4"
          >
            {isLoading ? "در حال بررسی..." : "تایید کد"}
          </Button>

          {/* Footer badge */}
          <div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>کد تأیید فقط به مدت ۱ دقیقه معتبر است</span>
          </div>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle className="w-8 h-8 text-green-500" />
            </motion.div>
            
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              تأیید موفقیت‌آمیز
            </h3>
            
            <p className="text-sm text-gray-500 mb-1">
              حساب کاربری شما با موفقیت تأیید شد
            </p>
            
            <p className="text-xs text-gray-400 mb-4">
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
    </AuthWrapper>
  );
}
