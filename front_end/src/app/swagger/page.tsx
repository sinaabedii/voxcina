"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, LogIn, ShieldAlert } from "lucide-react";

import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuthStore } from "@/store/auth-store";

/**
 * Admin-only Swagger UI for the Go backend API.
 *
 * - The OpenAPI document is served by Go at /api/admin/docs/openapi.json
 *   behind AdminAuthMiddleware; this page fetches it with the admin JWT from
 *   the auth store and feeds the parsed object to SwaggerUIBundle.
 * - The same token is attached to every "Try it out" request via
 *   requestInterceptor, so authenticated endpoints work from the UI.
 * - The swagger-ui dist files are vendored under public/swagger (the VPS has
 *   no direct internet; loading them from a CDN would break for Iranian
 *   visitors).
 */
interface SwaggerUIBundleOptions {
  spec: Record<string, unknown>;
  domNode: HTMLElement;
  docExpansion?: string;
  tryItOutEnabled?: boolean;
  filter?: boolean;
  deepLinking?: boolean;
  requestInterceptor?: (request: { headers: Record<string, string> }) => unknown;
}

declare global {
  interface Window {
    SwaggerUIBundle?: (options: SwaggerUIBundleOptions) => void;
  }
}

const SPEC_URL = "/api/admin/docs/openapi.json";

type LoadState = "idle" | "loading" | "ready" | "forbidden" | "error";

export default function SwaggerPage() {
  const { adminToken } = useAuthStore();

  // Admin only: shoppers land on their dashboard, anonymous visitors on sign-in.
  const { isLoading, isAuthorized } = useProtectedRoute({
    requiredAuth: true,
    requiredRole: "admin",
    nonAdminRedirectUrl: "/dashboard",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSpec = useCallback(async (): Promise<Record<string, unknown>> => {
    const response = await fetch(SPEC_URL, {
      cache: "no-store",
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
    });
    if (response.status === 401 || response.status === 403) {
      const error = new Error("forbidden");
      error.name = "Forbidden";
      throw error;
    }
    if (!response.ok) {
      throw new Error(`خطا در دریافت مستندات (کد ${response.status})`);
    }
    return response.json();
  }, [adminToken]);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;

    const boot = async () => {
      setLoadState("loading");
      try {
        const spec = await loadSpec();
        // Load the vendored bundle (and its stylesheet) before first render.
        if (!document.querySelector('link[data-swagger-ui="true"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "/swagger/swagger-ui.css";
          link.setAttribute("data-swagger-ui", "true");
          document.head.appendChild(link);
        }
        const bundle = await new Promise<void>((resolve, reject) => {
          if (window.SwaggerUIBundle) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "/swagger/swagger-ui-bundle.js";
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("بارگذاری رابط کاربری Swagger ناموفق بود"));
          document.body.appendChild(script);
        });
        if (cancelled) return;
        void bundle;
        if (!containerRef.current || !window.SwaggerUIBundle) {
          throw new Error("رابط Swagger در دسترس نیست");
        }
        window.SwaggerUIBundle({
          spec,
          domNode: containerRef.current,
          docExpansion: "none",
          tryItOutEnabled: true,
          filter: true,
          deepLinking: true,
          requestInterceptor: (request) => {
            if (adminToken) {
              request.headers.Authorization = `Bearer ${adminToken}`;
            }
            return request;
          },
        });
        if (!cancelled) setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.name === "Forbidden") {
          setLoadState("forbidden");
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : "خطای نامشخص",
          );
          setLoadState("error");
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, loadSpec, adminToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-voxcina-blue/95">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-cream/10 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
            در حال بررسی دسترسی...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // The protected-route hook is redirecting; render nothing meanwhile.
    return null;
  }

  return (
    <div className="min-h-[80vh] bg-white dark:bg-voxcina-blue/95 py-6">
      {loadState === "loading" && (
        <p className="text-center text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 py-10">
          در حال بارگذاری مستندات API...
        </p>
      )}

      {loadState === "forbidden" && (
        <div className="max-w-md mx-auto flex flex-col items-center rounded-2xl border border-voxcina-cream/60 dark:border-voxcina-blue/50 bg-white/80 dark:bg-voxcina-blue/60 px-6 py-12 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
            دسترسی به مستندات ندارید
          </h1>
          <p className="mb-6 text-sm leading-7 text-voxcina-blue/70 dark:text-voxcina-cream/70">
            سشن شما منقضی شده یا نقش «مدیر» ندارد. با حساب مدیر دوباره وارد شوید.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-voxcina-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-voxcina-darkBlue dark:bg-voxcina-cream dark:text-voxcina-blue"
          >
            <LogIn className="h-4 w-4" />
            ورود به حساب
          </a>
        </div>
      )}

      {loadState === "error" && (
        <div className="max-w-md mx-auto text-center py-10">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-voxcina-cream/60 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream">
              <BookOpen className="h-7 w-7" />
            </div>
          </div>
          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
            {errorMessage || "خطا در بارگذاری مستندات"}
          </p>
          <button
            type="button"
            onClick={() => setLoadState("idle")}
            className="rounded-xl bg-voxcina-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-voxcina-darkBlue dark:bg-voxcina-cream dark:text-voxcina-blue"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* dir="ltr" — Swagger UI is an LTR tool and breaks visually inside the
          store's RTL root layout. */}
      <div dir="ltr" className="swagger-wrapper">
        <div ref={containerRef} />
      </div>
    </div>
  );
}
