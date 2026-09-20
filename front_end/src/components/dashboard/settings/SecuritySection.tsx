"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Lock, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DashboardCard from "@/components/dashboard/ui/DashboardCard";
import DashboardCardHeader from "@/components/dashboard/ui/DashboardCardHeader";
import { useAuthStore } from "@/store/auth-store";
import { sessionManager } from "@/lib/session-manager";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: PasswordFormData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function SecuritySection() {
  const { logout } = useAuthStore();
  const [formData, setFormData] = useState<PasswordFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const passwordStrength = usePasswordStrength(formData.newPassword);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.newPassword.length < 8) {
      toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }

    setIsSaving(true);
    try {
      const response = await sessionManager.fetchWithAuth("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "خطا در تغییر رمز عبور");

      toast.success("رمز عبور با موفقیت تغییر یافت");
      setFormData(EMPTY_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در تغییر رمز عبور. لطفا دوباره تلاش کنید.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutOpen(false);
    }
  };

  const canSubmit = Boolean(formData.currentPassword && formData.newPassword && formData.confirmPassword);

  return (
    <>
      <DashboardCard hover={false} className="mb-6">
        <DashboardCardHeader
          icon={<Lock className="h-6 w-6" />}
          title="تغییر رمز عبور"
          description="برای حفظ امنیت حساب، رمز عبور خود را به‌صورت دوره‌ای تغییر دهید."
        />
        <CardContent className="p-5 md:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordInput
              label="رمز عبور فعلی"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
            />

            <div>
              <PasswordInput
                label="رمز عبور جدید"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {formData.newPassword && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">قدرت رمز عبور:</span>
                    <span className={`text-xs font-medium ${passwordStrength.colorClass}`}>{passwordStrength.text}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
                    <div
                      className={`h-full rounded-full ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    رمز عبور باید حداقل ۸ کاراکتر شامل حروف بزرگ، کوچک، اعداد و علائم باشد
                  </p>
                </div>
              )}
            </div>

            <PasswordInput
              label="تکرار رمز عبور جدید"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />

            <div className="flex justify-end border-t border-voxcina-cream/60 pt-5 dark:border-voxcina-blue/30">
              <Button type="submit" isLoading={isSaving} disabled={!canSubmit}>
                تغییر رمز عبور
              </Button>
            </div>
          </form>
        </CardContent>
      </DashboardCard>

      <DashboardCard hover={false}>
        <DashboardCardHeader
          icon={<ShieldCheck className="h-6 w-6" />}
          title="امنیت حساب کاربری"
          description="اگر دستگاه خود را با دیگران به اشتراک می‌گذارید، از حساب کاربری خارج شوید."
        />
        <CardContent className="p-5 md:p-7">
          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="flex w-full items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="ml-2 h-4 w-4" />
            خروج از حساب کاربری
          </button>
        </CardContent>
      </DashboardCard>

      <ConfirmDialog
        isOpen={isLogoutOpen}
        title="خروج از حساب کاربری"
        description="آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟"
        confirmLabel="خروج از حساب"
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onClose={() => setIsLogoutOpen(false)}
      />
    </>
  );
}
