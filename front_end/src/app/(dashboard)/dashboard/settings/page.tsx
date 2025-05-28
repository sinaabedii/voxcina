"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  BellRing,
  Camera,
  Smartphone,
  LogOut,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    // phone: user?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    // receiveEmails: user?.preferences?.receiveEmails || false,
    // receiveNotifications: user?.preferences?.receiveNotifications || true,
    // twoFactorAuth: user?.preferences?.twoFactorAuth || false,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const submitBtn = document.getElementById("profile-submit-btn");
    if (submitBtn) {
      submitBtn.setAttribute("disabled", "true");
      setTimeout(() => {
        try {
          updateUser({
            name: formData.name,
            // phone: formData.phone,
            // preferences: {
            //   receiveEmails: formData.receiveEmails,
            //   receiveNotifications: formData.receiveNotifications,
            //   twoFactorAuth: formData.twoFactorAuth,
            // },
          });
          setSuccessMessage("اطلاعات شخصی با موفقیت به‌روزرسانی شد");

          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        } catch (error) {
          setErrorMessage("خطا در به‌روزرسانی اطلاعات. لطفا دوباره تلاش کنید.");
        } finally {
          submitBtn.removeAttribute("disabled");
        }
      }, 1000);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (formData.newPassword.length < 8) {
      setErrorMessage("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage("رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }

    const submitBtn = document.getElementById("password-submit-btn");
    if (submitBtn) {
      submitBtn.setAttribute("disabled", "true");
      setTimeout(() => {
        try {
          setSuccessMessage("رمز عبور با موفقیت تغییر یافت");
          setFormData({
            ...formData,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });

          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        } catch (error) {
          setErrorMessage("خطا در تغییر رمز عبور. لطفا دوباره تلاش کنید.");
        } finally {
          submitBtn.removeAttribute("disabled");
        }
      }, 1000);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password)
      return { strength: 0, text: "", color: "bg-secondary-200 dark:bg-voxcina-darkBlue/30" };

    const length = password.length;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    const criteria = [
      length >= 8,
      hasLowerCase,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
    ];

    const metCriteria = criteria.filter(Boolean).length;

    if (metCriteria <= 1) {
      return { strength: 20, text: "ضعیف", color: "bg-red-500" };
    } else if (metCriteria === 2) {
      return { strength: 40, text: "متوسط", color: "bg-orange-500" };
    } else if (metCriteria === 3) {
      return { strength: 60, text: "خوب", color: "bg-yellow-500" };
    } else if (metCriteria === 4) {
      return { strength: 80, text: "قوی", color: "bg-green-500" };
    } else {
      return { strength: 100, text: "عالی", color: "bg-green-600" };
    }
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const tabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 pb-4">
                <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
                  <span className="relative">
                    <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                    <User className="w-5 h-5 ml-2" />
                  </span>
                  اطلاعات شخصی
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileSubmit}>
                  <div className="space-y-5">
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-secondary-100 dark:bg-voxcina-blue/20 flex items-center justify-center overflow-hidden border-4 border-white dark:border-voxcina-darkBlue/50 shadow-soft">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-voxcina-blue dark:text-secondary-200">
                              {user?.name?.charAt(0) || "U"}
                            </span>
                          )}
                        </div>
                        <motion.button 
                          className="absolute bottom-0 right-0 bg-voxcina-blue text-white p-1.5 rounded-full shadow-soft hover:bg-voxcina-darkBlue transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Camera className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>

                    <Input
                      label="نام و نام خانوادگی"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      leftElement={
                        <User className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />
                      }
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />

                    <Input
                      label="ایمیل"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled
                      leftElement={
                        <Mail className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />
                      }
                      helperText="ایمیل قابل تغییر نیست"
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />

                    {/* <Input
                      label="شماره موبایل"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      leftElement={
                        <Smartphone className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />
                      }
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                      placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
                    />

                    <div className="pt-3 border-t border-secondary-100 dark:border-voxcina-darkBlue/20">
                      <h3 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-3">
                        تنظیمات اطلاع‌رسانی
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start">
                            <BellRing className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 mt-0.5 ml-3" />
                            <div>
                              <h4 className="font-medium text-voxcina-blue dark:text-secondary-200">
                                دریافت اعلان‌ها
                              </h4>
                              <p className="text-xs text-voxcina-blue/70 dark:text-secondary-300">
                                اعلان‌های مهم مانند وضعیت سفارش و تخفیف‌ها
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="receiveNotifications"
                              checked={formData.receiveNotifications}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <div
                              className={`w-11 h-6 rounded-full transition-colors ${
                                formData.receiveNotifications
                                  ? "bg-voxcina-blue"
                                  : "bg-secondary-300 dark:bg-voxcina-darkBlue/50"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                                  formData.receiveNotifications
                                    ? "translate-x-5 rtl:-translate-x-5"
                                    : "translate-x-1 rtl:-translate-x-1"
                                }`}
                              ></div>
                            </div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-start">
                            <Mail className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 mt-0.5 ml-3" />
                            <div>
                              <h4 className="font-medium text-voxcina-blue dark:text-secondary-200">
                                دریافت خبرنامه
                              </h4>
                              <p className="text-xs text-voxcina-blue/70 dark:text-secondary-300">
                                اطلاع از آخرین محصولات و پیشنهادات ویژه
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="receiveEmails"
                              checked={formData.receiveEmails}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <div
                              className={`w-11 h-6 rounded-full transition-colors ${
                                formData.receiveEmails
                                  ? "bg-voxcina-blue"
                                  : "bg-secondary-300 dark:bg-voxcina-darkBlue/50"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                                  formData.receiveEmails
                                    ? "translate-x-5 rtl:-translate-x-5"
                                    : "translate-x-1 rtl:-translate-x-1"
                                }`}
                              ></div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div> */}

                    <div className="pt-4 flex justify-end">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          id="profile-submit-btn"
                          type="submit"
                          variant="primary"
                          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
                        >
                          ذخیره تغییرات
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        );
        case "security":
        return (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 mb-6">
              <CardHeader className="bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 pb-4">
                <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
                  <span className="relative">
                    <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                    <Lock className="w-5 h-5 ml-2" />
                  </span>
                  تغییر رمز عبور
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-5">
                    <Input
                      label="رمز عبور فعلی"
                      type={showPassword ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      leftElement={
                        <Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />
                      }
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-voxcina-blue/60 hover:text-voxcina-blue dark:text-secondary-300 dark:hover:text-secondary-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />

                    <div>
                      <Input
                        label="رمز عبور جدید"
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        leftElement={
                          <Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />
                        }
                        className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                      />

                      {formData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-voxcina-blue/70 dark:text-secondary-300">
                              قدرت رمز عبور:{" "}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                passwordStrength.strength < 40
                                  ? "text-red-500"
                                  : passwordStrength.strength < 60
                                  ? "text-orange-500"
                                  : passwordStrength.strength < 80
                                  ? "text-yellow-500"
                                  : "text-green-500"
                              }`}
                            >
                              {passwordStrength.text}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary-200 dark:bg-voxcina-darkBlue/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${passwordStrength.color}`}
                              style={{ width: `${passwordStrength.strength}%` }}
                            ></div>
                          </div>
                          <div className="mt-1 text-xs text-voxcina-blue/70 dark:text-secondary-300">
                            رمز عبور باید حداقل ۸ کاراکتر شامل حروف بزرگ، کوچک،
                            اعداد و علائم باشد
                          </div>
                        </div>
                      )}
                    </div>

                    <Input
                      label="تکرار رمز عبور جدید"
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      leftElement={
                        <Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />
                      }
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />

                    <div className="pt-4 flex justify-end">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          id="password-submit-btn"
                          type="submit"
                          variant="primary"
                          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
                          disabled={
                            !formData.currentPassword ||
                            !formData.newPassword ||
                            !formData.confirmPassword
                          }
                        >
                          تغییر رمز عبور
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardHeader className="bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 pb-4">
                <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
                  <span className="relative">
                    <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                    <ShieldCheck className="w-5 h-5 ml-2" />
                  </span>
                  امنیت حساب کاربری
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-secondary-100 dark:bg-voxcina-blue/10 p-4 rounded-xl">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-secondary-200 dark:bg-voxcina-blue/20 flex items-center justify-center ml-3 flex-shrink-0">
                        <Smartphone className="w-5 h-5 text-voxcina-blue dark:text-secondary-200" />
                      </div>
                      <div>
                        <h4 className="font-medium text-voxcina-blue dark:text-secondary-200">
                          احراز هویت دو مرحله‌ای
                        </h4>
                        <p className="text-xs text-voxcina-blue/70 dark:text-secondary-300">
                          تأیید ورود با کد یکبار مصرف از طریق پیامک
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="twoFactorAuth"
                        // Update this to use a local state variable instead of formData
                        checked={false}
                        // Update this to be a no-op or use a different state variable
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <div
                        className={`w-11 h-6 rounded-full transition-colors bg-secondary-300 dark:bg-voxcina-darkBlue/50`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transform transition-transform translate-x-1 rtl:-translate-x-1`}
                        ></div>
                      </div>
                    </label>
                  </div>

                  <div className="border-t border-secondary-100 dark:border-voxcina-darkBlue/20 pt-5">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <button
                        type="button"
                        className="w-full py-3 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm flex items-center justify-center group relative overflow-hidden"
                        onClick={() => {
                          if (
                            window.confirm(
                              "آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟"
                            )
                          ) {
                            logout && logout();
                          }
                        }}
                      >
                        <span className="absolute inset-0 bg-red-100/50 dark:bg-red-800/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                        <LogOut className="w-4 h-4 ml-2 text-red-500 dark:text-red-400 relative z-10" />
                        <span className="relative z-10 text-red-600 dark:text-red-400">خروج از حساب کاربری</span>
                      </button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };
  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex justify-between items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-secondary-200 relative">
          <span className="relative z-10">تنظیمات حساب کاربری</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
      </motion.div>

      {isLoading ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="min-h-[300px] flex items-center justify-center"
        >
          <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/60 dark:bg-voxcina-blue/10 w-full md:max-w-md mx-auto">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <User className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-secondary-200/40" />
                </div>
                <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">
                  در حال بارگذاری تنظیمات...
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div>
          <AnimatePresence>
            {successMessage && (
              <motion.div
                className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-4 rounded-xl flex items-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-full ml-3 flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-voxcina-blue dark:text-green-400">
                  {successMessage}
                </p>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-4 rounded-xl flex items-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-red-100 dark:bg-red-800/30 p-2 rounded-full ml-3 flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-voxcina-blue dark:text-red-400">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 sticky top-24">
                <CardContent className="p-0">
                  <ul className="divide-y divide-secondary-100 dark:divide-voxcina-darkBlue/20">
                    <li>
                      <motion.button
                        className={`w-full flex items-center px-4 py-3.5 text-right ${
                          activeTab === "profile"
                            ? "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 font-medium"
                            : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/10"
                        }`}
                        onClick={() => setActiveTab("profile")}
                        whileHover={{ x: activeTab === "profile" ? 0 : 5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 ${
                            activeTab === "profile"
                              ? "bg-white dark:bg-voxcina-blue/40 shadow-soft"
                              : "bg-secondary-100 dark:bg-voxcina-blue/20"
                          }`}>
                          <User
                            className={`w-5 h-5 ${
                              activeTab === "profile"
                                ? "text-voxcina-blue dark:text-secondary-200"
                                : "text-voxcina-blue/50 dark:text-secondary-300"
                            }`}
                          />
                        </div>
                        اطلاعات شخصی
                      </motion.button>
                    </li>
                    <li>
                      <motion.button
                        className={`w-full flex items-center px-4 py-3.5 text-right ${
                          activeTab === "security"
                            ? "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 font-medium"
                            : "text-voxcina-blue/70 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/10"
                        }`}
                        onClick={() => setActiveTab("security")}
                        whileHover={{ x: activeTab === "security" ? 0 : 5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 ${
                            activeTab === "security"
                              ? "bg-white dark:bg-voxcina-blue/40 shadow-soft"
                              : "bg-secondary-100 dark:bg-voxcina-blue/20"
                          }`}>
                          <ShieldCheck
                            className={`w-5 h-5 ${
                              activeTab === "security"
                                ? "text-voxcina-blue dark:text-secondary-200"
                                : "text-voxcina-blue/50 dark:text-secondary-300"
                            }`}
                          />
                        </div>
                        امنیت و رمز عبور
                      </motion.button>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              <AnimatePresence mode="wait">
                {tabContent()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}