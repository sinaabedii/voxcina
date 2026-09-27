"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Briefcase, Home, Loader2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/Modal";
import type { City, Province } from "@/hooks/useLocality";
import { cn } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 w-full items-center justify-center rounded-xl border border-secondary-200 bg-voxcina-cream/30 dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10 md:h-64">
      <Loader2 className="h-5 w-5 animate-spin text-voxcina-blue/50 dark:text-voxcina-cream/50" />
    </div>
  ),
});

export interface CheckoutAddressFormData {
  title: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  provinceCode: number;
  city: string;
  cityCode: number;
  address: string;
  postalCode: string;
  isDefault: boolean;
  addressType: string;
  latitude: number;
  longitude: number;
}

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CheckoutAddressFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  editingAddress: string | null;
  provinces: Province[];
  cities: City[];
  loadingProvinces: boolean;
  loadingCities: boolean;
  showProfilePrefill: boolean;
  onPrefillProfile: () => void;
  onLocationChange: (loc: { lat: number; lng: number }) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-voxcina-blue dark:text-secondary-200">
      <span className="h-4 w-1 rounded-full bg-voxcina-blue/70 dark:bg-voxcina-cream/60" />
      {children}
    </h3>
  );
}

/**
 * Single-sheet address form extracted from checkout/page.tsx.
 * Same fields, same validation flow (handled by the page) —
 * only sectioned visually, with a shorter map on mobile.
 */
export default function AddressFormModal({
  isOpen,
  onClose,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
  editingAddress,
  provinces,
  cities,
  loadingProvinces,
  loadingCities,
  showProfilePrefill,
  onPrefillProfile,
  onLocationChange,
}: AddressFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAddress ? "ویرایش آدرس" : "افزودن آدرس جدید"}
    >
      <form onSubmit={onSubmit}>
        <div className="space-y-5 md:space-y-5">
          {/* ── نوع آدرس ── */}
          <section className="space-y-2.5">
            <SectionTitle>نوع آدرس</SectionTitle>
            <div className="flex space-x-4 space-x-reverse">
              {(
                [
                  { value: "home", label: "خانه", Icon: Home },
                  { value: "work", label: "محل کار", Icon: Briefcase },
                ] as const
              ).map(({ value, label, Icon }) => (
                <label key={value} className="flex cursor-pointer items-center">
                  <input
                    type="radio"
                    name="addressType"
                    value={value}
                    checked={formData.addressType === value}
                    onChange={onChange}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "mr-2 flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 md:h-12 md:w-12",
                      formData.addressType === value
                        ? "scale-105 border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200 md:scale-110"
                        : "border-secondary-200 text-voxcina-blue/40 dark:border-voxcina-darkBlue/30 dark:text-secondary-400"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mr-2 text-sm text-voxcina-blue dark:text-secondary-200">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            <Input
              label="عنوان آدرس (اختیاری)"
              name="title"
              value={formData.title}
              onChange={onChange}
              disabled={isSubmitting}
              placeholder={formData.addressType === "home" ? "مثال: خانه، منزل پدری" : "مثال: دفتر، شرکت"}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />
          </section>

          <div className="h-px bg-voxcina-cream/60 dark:bg-voxcina-blue/20" />

          {/* ── مشخصات گیرنده ── */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <SectionTitle>مشخصات گیرنده</SectionTitle>
              {showProfilePrefill && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPrefillProfile}
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-lg border-voxcina-blue/30 text-xs text-voxcina-blue hover:bg-voxcina-blue/5 md:min-h-0 dark:border-voxcina-cream/30 dark:text-voxcina-cream dark:hover:bg-voxcina-cream/5"
                >
                  <User className="ml-1 h-3 w-3" />
                  استفاده از اطلاعات پروفایل
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <Input
                label="نام *"
                name="firstName"
                value={formData.firstName}
                onChange={onChange}
                required
                disabled={isSubmitting}
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
              <Input
                label="نام خانوادگی *"
                name="lastName"
                value={formData.lastName}
                onChange={onChange}
                required
                disabled={isSubmitting}
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
            </div>
            <Input
              label="شماره تماس *"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={onChange}
              placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
              required
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />
          </section>

          <div className="h-px bg-voxcina-cream/60 dark:bg-voxcina-blue/20" />

          {/* ── نشانی ── */}
          <section className="space-y-3.5">
            <SectionTitle>نشانی</SectionTitle>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-voxcina-blue dark:text-secondary-200">
                  استان *
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={onChange}
                  required
                  disabled={isSubmitting || loadingProvinces}
                  className="min-h-[44px] w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-sm text-voxcina-blue focus:border-voxcina-blue focus:outline-none focus:ring-2 focus:ring-voxcina-blue/20 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 dark:border-voxcina-darkBlue/30 dark:bg-voxcina-darkBlue/20 dark:text-secondary-200"
                >
                  <option value="">انتخاب استان</option>
                  {loadingProvinces ? (
                    <option value="">در حال بارگذاری...</option>
                  ) : (
                    provinces.map((p) => (
                      <option key={p.province_code} value={p.province_name}>
                        {p.province_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-voxcina-blue dark:text-secondary-200">
                  شهر *
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={onChange}
                  required
                  disabled={isSubmitting || loadingCities || !formData.province}
                  className="min-h-[44px] w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-sm text-voxcina-blue focus:border-voxcina-blue focus:outline-none focus:ring-2 focus:ring-voxcina-blue/20 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 dark:border-voxcina-darkBlue/30 dark:bg-voxcina-darkBlue/20 dark:text-secondary-200"
                >
                  <option value="">
                    {loadingCities
                      ? "در حال بارگذاری..."
                      : !formData.province
                        ? "ابتدا استان را انتخاب کنید"
                        : "انتخاب شهر"}
                  </option>
                  {!loadingCities &&
                    cities.map((c) => (
                      <option key={c.city_code} value={c.city_name}>
                        {c.city_name}
                      </option>
                    ))}
                </select>
                {loadingCities && (
                  <div className="mt-1 flex items-center text-xs text-voxcina-blue/60 dark:text-secondary-300/60">
                    <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                    در حال بارگذاری شهرها...
                  </div>
                )}
              </div>
            </div>
            <Input
              label="آدرس کامل *"
              name="address"
              value={formData.address}
              onChange={onChange}
              placeholder="مثال: خیابان اصلی، کوچه فرعی، پلاک ۱۲، واحد ۳"
              required
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />
            <Input
              label="کد پستی *"
              name="postalCode"
              value={formData.postalCode}
              onChange={onChange}
              placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
              required
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />
          </section>

          <div className="h-px bg-voxcina-cream/60 dark:bg-voxcina-blue/20" />

          {/* ── موقعیت ── */}
          <section className="space-y-2">
            <SectionTitle>موقعیت روی نقشه *</SectionTitle>
            {/* MapPicker renders h-64 internally; shrink it on mobile only. */}
            <div className="[&_.relative.w-full.h-64]:h-48 md:[&_.relative.w-full.h-64]:h-64">
              <MapPicker
                location={{ lat: formData.latitude, lng: formData.longitude }}
                onChange={onLocationChange}
              />
            </div>
          </section>

          <div className="flex items-center rounded-xl bg-gradient-to-r from-voxcina-blue/5 to-secondary-200/70 p-4 dark:from-voxcina-blue/10 dark:to-voxcina-blue/5">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={formData.isDefault}
              onChange={onChange}
              disabled={isSubmitting}
              className="ml-2 h-5 w-5 rounded border-secondary-300 text-voxcina-blue focus:ring-voxcina-blue/30 disabled:opacity-50"
            />
            <label htmlFor="isDefault" className="text-sm text-voxcina-blue dark:text-secondary-200">
              تنظیم به عنوان آدرس پیش‌فرض
            </label>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2 md:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] rounded-xl border-secondary-200 text-voxcina-blue hover:bg-secondary-100 md:min-h-0 dark:border-voxcina-darkBlue/30 dark:text-secondary-200 dark:hover:bg-voxcina-darkBlue/20"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="min-h-[44px] rounded-xl bg-voxcina-blue text-white shadow-soft transition-all duration-300 hover:bg-voxcina-darkBlue hover:shadow-medium md:min-h-0"
            >
              {editingAddress ? "ویرایش آدرس" : "افزودن آدرس"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
