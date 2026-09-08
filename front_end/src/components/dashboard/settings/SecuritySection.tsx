"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Lock, Eye, EyeOff, ShieldCheck, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";

export default function SecuritySection({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { logout } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const passwordStrength = usePasswordStrength(formData.newPassword);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess("");
    onError("");

    if (formData.newPassword.length < 8) {
      onError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      onError("رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }

    try {
      const tokenRaw = localStorage.getItem("auth-storage");
      const parsed = tokenRaw ? JSON.parse(tokenRaw) : null;
      const accessToken = parsed?.state?.accessToken || localStorage.getItem("access_token");

      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ current_password: formData.currentPassword, new_password: formData.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در تغییر رمز عبور");

      onSuccess("رمز عبور با موفقیت تغییر یافت");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => onSuccess(""), 5000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "خطا در تغییر رمز عبور. لطفا دوباره تلاش کنید.");
    }
  };

  const isDisabled = !formData.currentPassword || !formData.newPassword || !formData.confirmPassword;

  return (
    <>
      <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 mb-6">
        <CardHeader className="bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 pb-4">
          <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
            <span className="relative">
              <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10" />
              <Lock className="w-5 h-5 ml-2" />
            </span>
            تغییر رمز عبور
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <Input
                label="رمز عبور فعلی"
                type={showPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                leftElement={<Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-voxcina-blue/60 hover:text-voxcina-blue dark:text-secondary-300 dark:hover:text-secondary-200">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  leftElement={<Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />}
                  className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                />
                {formData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-voxcina-blue/70 dark:text-secondary-300">قدرت رمز عبور: </span>
                      <span className={`text-xs font-medium ${passwordStrength.colorClass}`}>{passwordStrength.text}</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary-200 dark:bg-voxcina-darkBlue/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${passwordStrength.color}`} style={{ width: `${passwordStrength.strength}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-voxcina-blue/70 dark:text-secondary-300">رمز عبور باید حداقل ۸ کاراکتر شامل حروف بزرگ، کوچک، اعداد و علائم باشد</div>
                  </div>
                )}
              </div>

              <Input
                label="تکرار رمز عبور جدید"
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                leftElement={<Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-secondary-300" />}
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />

              <div className="pt-4 flex justify-end">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button type="submit" variant="primary" className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300" disabled={isDisabled}>
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
              <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10" />
              <ShieldCheck className="w-5 h-5 ml-2" />
            </span>
            امنیت حساب کاربری
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="border-t border-secondary-100 dark:border-voxcina-darkBlue/20 pt-5">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm flex items-center justify-center group relative overflow-hidden"
                onClick={() => {
                  if (window.confirm("آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟")) logout?.();
                }}
              >
                <span className="absolute inset-0 bg-red-100/50 dark:bg-red-800/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                <LogOut className="w-4 h-4 ml-2 text-red-500 dark:text-red-400 relative z-10" />
                <span className="relative z-10 text-red-600 dark:text-red-400">خروج از حساب کاربری</span>
              </button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
