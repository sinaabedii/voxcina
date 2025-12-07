"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Shield, CheckCircle, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { motion } from "framer-motion";
import AuthWrapper from "@/components/auth/AuthWrapper";

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

  return (
    <AuthWrapper
      title="بازیابی رمز عبور"
      subtitle="لینک بازیابی به ایمیل شما ارسال می‌شود"
    >
      {/* Back to login link */}
      <Link 
        href="/sign-in" 
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-voxcina-blue transition-colors mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به صفحه ورود</span>
      </Link>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="ایمیل"
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            leftElement={<Mail className="h-5 w-5 text-gray-400" />}
            placeholder="example@mail.com"
            className="text-base h-12"
          />

          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isLoading}
            className="h-12 text-base font-medium mt-4"
          >
            {isLoading ? "در حال ارسال..." : "ارسال لینک بازیابی"}
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
            رمز خود را به یاد آوردید؟{" "}
            <Link href="/sign-in" className="text-voxcina-blue font-semibold hover:underline">
              وارد شوید
            </Link>
          </p>

          {/* Footer badge */}
          <div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>اطلاعات شما نزد ما محفوظ است</span>
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
              ایمیل ارسال شد
            </h3>
            
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              لینک بازیابی رمز عبور به ایمیل{" "}
              <span className="font-medium text-gray-700">{email}</span>{" "}
              ارسال شد.
              <br />
              لطفاً صندوق ورودی خود را بررسی کنید.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-600 w-full mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  اگر ایمیل را دریافت نکردید، لطفاً پوشه اسپم را بررسی کنید.
                </span>
              </div>
            </div>

            <Link href="/sign-in" className="w-full">
              <Button
                variant="outline"
                fullWidth
                className="h-12 text-base font-medium"
              >
                بازگشت به صفحه ورود
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AuthWrapper>
  );
}
