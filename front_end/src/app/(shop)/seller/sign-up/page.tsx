import { Suspense } from "react";
import type { Metadata } from "next";
import AuthWrapper from "@/components/auth/AuthWrapper";
import SellerSignUpContent from "./SellerSignUpContent";

export const metadata: Metadata = {
  title: "ثبت‌نام فروشندگی | وکسینا",
  description: "با لینک دعوت فروشنده همکار، فروشنده وکسینا شوید.",
};

/**
 * Route: /seller/sign-up (the `(shop)` group prefix does not affect the URL).
 *
 * Kept under `(shop)` on purpose: the `(seller)` group layout requires
 * role=seller and would bounce new recruits before they can sign up.
 *
 * The form reads `?ref=` via `useSearchParams`, so it lives behind a Suspense
 * boundary — otherwise the whole subtree opts out of SSR at build time.
 */
export default function SellerSignUpPage() {
  return (
    <Suspense
      fallback={
        <AuthWrapper
          title="ثبت‌نام و همکاری در فروش وکسینا"
          subtitle="در حال آماده‌سازی فرم ثبت‌نام…"
        >
          <div className="space-y-4" aria-hidden="true">
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
            </div>
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </AuthWrapper>
      }
    >
      <SellerSignUpContent />
    </Suspense>
  );
}
