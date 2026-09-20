"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Mail, Save, Smartphone, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import JalaliDatePicker, { gregorianToJalaliString } from "@/components/auth/JalaliDatePicker";
import DashboardCard from "@/components/dashboard/ui/DashboardCard";
import DashboardCardHeader from "@/components/dashboard/ui/DashboardCardHeader";
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

  useEffect(() => {
    if (!user) return;
    const nameParts = getNameParts(user);
    setFormData({
      ...nameParts,
      email: user.email || "",
      birthday: getBirthdayValue(user.birthday),
    });
  }, [user]);

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("نام و نام خانوادگی را وارد کنید");
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
    } catch {
      // Errors are surfaced by the auth store toast.
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardCard hover={false}>
      <DashboardCardHeader
        icon={
          user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6" />
          )
        }
        title="اطلاعات حساب کاربری"
        description="اطلاعات تماس و مشخصات شخصی خود را مدیریت کنید."
      />

      <CardContent className="p-5 md:p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
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
              helperText={user.birthday ? "تاریخ تولد پس از ثبت قابل تغییر نیست" : "ثبت تاریخ تولد اختیاری است"}
              label="تاریخ تولد"
              id="profile-birthday"
            />
          </div>

          <div className="flex justify-end border-t border-voxcina-cream/60 pt-5 dark:border-voxcina-blue/30">
            <Button type="submit" isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
              ذخیره اطلاعات
            </Button>
          </div>
        </form>
      </CardContent>
    </DashboardCard>
  );
}
