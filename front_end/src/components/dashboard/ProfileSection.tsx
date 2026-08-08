"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Mail, Save, Smartphone, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import JalaliDatePicker, { gregorianToJalaliString } from "@/components/auth/JalaliDatePicker";
import { useAuthStore } from "@/store/auth-store";
import { User } from "@/types/user";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  birthday: string;
}

function getNameParts(user: User): Pick<ProfileFormData, "firstName" | "lastName"> {
  const parts = user.name?.trim().split(/\s+/).filter(Boolean) || [];
  return {
    firstName: user.first_name?.trim() || parts[0] || "",
    lastName: user.last_name?.trim() || parts.slice(1).join(" "),
  };
}

function getBirthdayValue(birthday?: string): string {
  if (!birthday) return "";
  if (/^(13|14)\d{2}-\d{2}-\d{2}$/.test(birthday)) return birthday;
  return gregorianToJalaliString(birthday);
}

export default function ProfileSection() {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    birthday: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const nameParts = getNameParts(user);
    setFormData({
      ...nameParts,
      email: user.email || "",
      birthday: getBirthdayValue(user.birthday),
    });
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage("نام و نام خانوادگی را وارد کنید");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        ...(!user?.birthday && formData.birthday ? { birthday: formData.birthday } : {}),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "خطا در ذخیره اطلاعات");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  if (!user) return null;

  return (
    <Card className="overflow-hidden rounded-3xl border border-voxcina-cream shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <div className="border-b border-voxcina-cream/70 bg-gradient-to-l from-voxcina-cream/80 via-white to-white px-5 py-5 dark:border-voxcina-blue/30 dark:from-voxcina-blue/25 dark:via-voxcina-blue/10 dark:to-transparent md:px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-voxcina-blue text-white shadow-sm dark:bg-voxcina-cream dark:text-voxcina-blue">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
              اطلاعات حساب کاربری
            </h2>
            <p className="mt-1 text-sm text-voxcina-blue/65 dark:text-voxcina-cream/65">
              اطلاعات تماس و مشخصات شخصی خود را مدیریت کنید.
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-5 md:p-7">
        <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="نام"
              name="firstName"
              value={formData.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder="نام"
              autoComplete="given-name"
              leftElement={<UserRound className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />}
            />
            <Input
              label="نام خانوادگی"
              name="lastName"
              value={formData.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder="نام خانوادگی"
              autoComplete="family-name"
              leftElement={<UserRound className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="ایمیل"
              type="email"
              name="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              dir="ltr"
              leftElement={<Mail className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />}
            />
            <Input
              label="شماره موبایل"
              name="phone"
              value={user.phone}
              disabled
              helperText="شماره موبایل قابل تغییر نیست"
              leftElement={<Smartphone className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />}
            />
          </div>

          <div className="max-w-md">
            <JalaliDatePicker
              value={formData.birthday}
              onChange={(value) => updateField("birthday", value)}
              disabled={Boolean(user.birthday)}
              helperText={
                user.birthday
                  ? "تاریخ تولد پس از ثبت قابل تغییر نیست"
                  : "ثبت تاریخ تولد اختیاری است"
              }
              label="تاریخ تولد"
              id="profile-birthday"
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end border-t border-voxcina-cream/60 pt-5 dark:border-voxcina-blue/30">
            <Button
              type="submit"
              isLoading={isSaving}
              className="rounded-xl bg-voxcina-blue text-white hover:bg-voxcina-darkBlue"
              leftIcon={<Save className="h-4 w-4" />}
            >
              ذخیره اطلاعات
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
