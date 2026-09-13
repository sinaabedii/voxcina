"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Store } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { panelHomeFor } from "@/lib/admin-access";
import { APP_NAME } from "@/lib/constants";

/**
 * Chrome for the seller (affiliate partner) panel.
 *
 * Deliberately NOT the admin layout: a seller is not back office, has no
 * sections to navigate between, and every endpoint behind this area is scoped
 * to their own id. One page, one purpose — so this is a header and an outlet
 * rather than a sidebar.
 *
 * Anyone who is not a seller is redirected to whatever panel their role does
 * own, or to the shopper dashboard if they own none.
 */
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const { isLoading, isAuthorized } = useProtectedRoute({
    requiredAuth: true,
    requiredRole: "seller",
    nonAdminRedirectUrl: "/dashboard",
  });

  // A staff member or admin who follows a stale /seller link is sent to their
  // own panel rather than bounced to the storefront dashboard.
  useEffect(() => {
    if (isLoading || isAuthorized) return;
    const home = panelHomeFor(user?.role);
    if (home && home !== "/seller") {
      router.replace(home);
    }
  }, [isLoading, isAuthorized, user?.role, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-voxcina-blue/95">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-cream/10 rounded-full animate-pulse-soft" />
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
            در حال بررسی وضعیت ورود...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-voxcina-blue/95 transition-all duration-300">
      <header className="sticky top-0 z-30 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/80 dark:bg-voxcina-blue/90 px-4 py-3 shadow-sm backdrop-blur-sm md:px-6">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <Link href="/seller" className="flex items-center">
            <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue text-sm font-bold text-white shadow-sm">
              {APP_NAME.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="hidden text-lg font-bold text-voxcina-blue dark:text-voxcina-cream sm:inline-block">
                {APP_NAME}
              </span>
              <span className="hidden text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 sm:inline-block">
                پنل فروشنده
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl bg-voxcina-cream/30 px-3 py-2 dark:bg-voxcina-blue/30 sm:flex">
              <Store className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                {user?.name}
              </span>
            </div>
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-voxcina-blue/80 transition-colors hover:bg-voxcina-cream/30 dark:text-voxcina-cream/80 dark:hover:bg-voxcina-blue/30"
            >
              مشاهده فروشگاه
            </Link>
            <button
              type="button"
              onClick={() => {
                logout && logout();
                router.push("/sign-in");
              }}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow overflow-x-hidden p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">{children}</div>
      </main>
    </div>
  );
}
