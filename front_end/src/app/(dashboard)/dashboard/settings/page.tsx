"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
import { motion } from "framer-motion";

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
      return { strength: 0, text: "", color: "bg-gray-200 dark:bg-gray-700" };

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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 pb-4">
                <CardTitle className="text-lg font-bold text-indigo-700 dark:text-indigo-400 flex items-center">
                  <User className="w-5 h-5 ml-2" />
                  اطلاعات شخصی
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileSubmit}>
                  <div className="space-y-5">
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-800 shadow-md">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-indigo-500">
                              {user?.name?.charAt(0) || "U"}
                            </span>
                          )}
                        </div>
                        <button className="absolute bottom-0 right-0 bg-indigo-500 text-white p-1.5 rounded-full shadow-md hover:bg-indigo-600 transition-colors">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <Input
                      label="نام و نام خانوادگی"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      leftElement={
                        <User className="h-4 w-4 text-muted-foreground" />
                      }
                      className="rounded-xl"
                    />

                    <Input
                      label="ایمیل"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled
                      leftElement={
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      }
                      helperText="ایمیل قابل تغییر نیست"
                      className="rounded-xl"
                    />

                    {/* <Input
                      label="شماره موبایل"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      leftElement={
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      }
                      className="rounded-xl"
                      placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
                    />

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                        تنظیمات اطلاع‌رسانی
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start">
                            <BellRing className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 ml-3" />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                دریافت اعلان‌ها
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                  ? "bg-indigo-500"
                                  : "bg-gray-300 dark:bg-gray-600"
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
                            <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 ml-3" />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                دریافت خبرنامه
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                  ? "bg-indigo-500"
                                  : "bg-gray-300 dark:bg-gray-600"
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
                      <Button
                        id="profile-submit-btn"
                        type="submit"
                        variant="primary"
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      >
                        ذخیره تغییرات
                      </Button>
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
            <Card className="border-0 shadow-lg overflow-hidden mb-6">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 pb-4">
                <CardTitle className="text-lg font-bold text-green-700 dark:text-green-400 flex items-center">
                  <Lock className="w-5 h-5 ml-2" />
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
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      }
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                      className="rounded-xl"
                    />

                    <div>
                      <Input
                        label="رمز عبور جدید"
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        leftElement={
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        }
                        className="rounded-xl"
                      />

                      {formData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
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
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${passwordStrength.color}`}
                              style={{ width: `${passwordStrength.strength}%` }}
                            ></div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      }
                      className="rounded-xl"
                    />

                    <div className="pt-4 flex justify-end">
                      <Button
                        id="password-submit-btn"
                        type="submit"
                        variant="primary"
                        className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                        disabled={
                          !formData.currentPassword ||
                          !formData.newPassword ||
                          !formData.confirmPassword
                        }
                      >
                        تغییر رمز عبور
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 pb-4">
                <CardTitle className="text-lg font-bold text-blue-700 dark:text-blue-400 flex items-center">
                  <ShieldCheck className="w-5 h-5 ml-2" />
                  امنیت حساب کاربری
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start">
                      <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 ml-3" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          احراز هویت دو مرحله‌ای
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        className={`w-11 h-6 rounded-full transition-colors bg-gray-300 dark:bg-gray-600`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transform transition-transform translate-x-1 rtl:-translate-x-1`}
                        ></div>
                      </div>
                    </label>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-xl border border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm flex items-center justify-center"
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
                      <LogOut className="w-4 h-4 ml-2" />
                      خروج از حساب کاربری
                    </button>
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
    <div className="container py-8 md:py-12">
      <motion.div
        className="flex justify-between items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          تنظیمات حساب کاربری
        </h1>
      </motion.div>

      {isLoading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12 mb-4">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-ping"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-indigo-500 dark:border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  در حال بارگذاری تنظیمات...
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div>
          {successMessage && (
            <motion.div
              className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CheckCircle className="w-5 h-5 text-green-500 ml-3 flex-shrink-0" />
              <p className="text-green-800 dark:text-green-400">
                {successMessage}
              </p>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="w-5 h-5 text-red-500 ml-3 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-400">{errorMessage}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card className="border-0 shadow-lg overflow-hidden sticky top-24">
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    <li>
                      <button
                        className={`w-full flex items-center px-4 py-3 text-right ${
                          activeTab === "profile"
                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                        onClick={() => setActiveTab("profile")}
                      >
                        <User
                          className={`w-5 h-5 ml-3 ${
                            activeTab === "profile"
                              ? "text-indigo-500"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        />
                        اطلاعات شخصی
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full flex items-center px-4 py-3 text-right ${
                          activeTab === "security"
                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                        onClick={() => setActiveTab("security")}
                      >
                        <ShieldCheck
                          className={`w-5 h-5 ml-3 ${
                            activeTab === "security"
                              ? "text-indigo-500"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        />
                        امنیت و رمز عبور
                      </button>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">{tabContent()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
