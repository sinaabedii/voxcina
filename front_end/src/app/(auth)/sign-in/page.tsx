"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const { login, isLoading, error } = useAuthStore();
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

    if (!validateForm()) return;

    try {
      await login({ email, password });
      router.push("/");
    } catch (error) {}
  };

  const fillTestAccount = () => {
    setEmail("user@example.com");
    setPassword("password");
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
    <div className="flex items-center justify-center  py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-voxcina-blue/5 to-transparent blur-3xl opacity-30 -z-10"
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
          <h2 className="text-3xl font-bold text-voxcina-blue">
            خوش آمدید به{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxcina-blue to-primary-400">
              وکسینا
            </span>
          </h2>
          <p className="mt-2 text-sm text-voxcina-blue/70">
            پاساژ آنلاین مد و پوشاک
          </p>
        </motion.div>

        <Card className="w-full bg-white/80 backdrop-blur-md border border-white/20 shadow-medium rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-bold text-voxcina-blue">
              ورود به حساب کاربری
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
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

                <motion.div variants={itemVariants}>
                  <Input
                    label="رمز عبور"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    leftElement={
                      <Lock className="h-4 w-4 text-voxcina-blue/60" />
                    }
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-voxcina-blue/60 hover:text-voxcina-blue transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    placeholder="••••••••"
                    className="bg-white/70 border-secondary-300 focus:border-voxcina-blue focus:ring-voxcina-blue/20 rounded-xl"
                  />
                </motion.div>

                <motion.div
                  className="flex justify-between items-center text-sm mt-2"
                  variants={itemVariants}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="ml-2 h-4 w-4 rounded border-secondary-300 text-voxcina-blue focus:ring-voxcina-blue/30"
                    />
                    <label
                      htmlFor="remember"
                      className="text-voxcina-blue/80 text-sm"
                    >
                      مرا به خاطر بسپار
                    </label>
                  </div>
                  <Link
                    href="#"
                    className="text-voxcina-blue hover:text-voxcina-darkBlue transition-colors text-sm"
                  >
                    فراموشی رمز عبور
                  </Link>
                </motion.div>

                {error && (
                  <motion.div
                    className="p-3 rounded-xl bg-red-50 text-red-500 text-sm border border-red-100 shadow-soft"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-2 flex-shrink-0"
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
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}

                <motion.div className="pt-2" variants={itemVariants}>
                  <Button
                    variant="primary"
                    fullWidth
                    type="submit"
                    isLoading={isLoading}
                    className="bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 rounded-xl transition-all duration-300 shadow-soft hover:shadow-medium"
                  >
                    {isLoading ? "در حال ورود..." : "ورود"}
                  </Button>
                </motion.div>

                <motion.div
                  className="text-center mt-6"
                  variants={itemVariants}
                >
                  <p className="text-sm text-voxcina-blue/70">
                    حساب کاربری ندارید؟{" "}
                    <Link
                      href="/sign-up"
                      className="text-voxcina-blue font-medium hover:text-voxcina-darkBlue transition-colors"
                    >
                      ثبت‌نام کنید
                    </Link>
                  </p>
                  <button
                    type="button"
                    onClick={fillTestAccount}
                    className="text-xs text-voxcina-blue/60 hover:text-voxcina-blue mt-3 cursor-pointer transition-colors"
                  >
                    پر کردن خودکار (برای آزمایش)
                  </button>
                </motion.div>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        <motion.div
          className="mt-6 text-center text-xs text-voxcina-blue/60"
          variants={itemVariants}
        >
          با ورود به سایت،{" "}
          <Link href="#" className="text-voxcina-blue hover:underline">
            قوانین و مقررات
          </Link>{" "}
          وکسینا را می‌پذیرید
        </motion.div>
      </motion.div>
    </div>
  );
}
