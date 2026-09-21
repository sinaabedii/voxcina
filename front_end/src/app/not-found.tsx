import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Home } from "lucide-react";

// No "use client" and no framer-motion on purpose. Next bundles not-found.tsx
// into every route's client references, so the animation library it used to
// import for this staggered entrance was downloaded and parsed on pages that
// never render a 404 — it was the last thing keeping framer-motion (~134 KB)
// on the homepage's critical path.
//
// The old version also gated the whole page behind a `mounted` flag and
// returned null on the server, so the 404 was blank until hydration. With the
// entrance expressed in CSS there is nothing client-only left, and the page can
// render as a Server Component with no client JS at all.
//
// Stagger below reproduces framer's `delayChildren: 0.3` + `staggerChildren:
// 0.1`. `heroRise` (animate-hero-rise) is transform-only for the reason
// documented next to its keyframes in globals.css.
const STAGGER = ["0.3s", "0.4s", "0.5s", "0.6s", "0.7s"];

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-secondary-100 dark:bg-voxcina-darkBlue flex flex-col">
      <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
      <div className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
        <div className="max-w-4xl w-full bg-white dark:bg-voxcina-blue/95 rounded-3xl shadow-soft dark:shadow-xl border border-border/10 dark:border-voxcina-blue/30 p-6 sm:p-10 md:p-12 lg:p-16 relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/30 dark:bg-voxcina-blue/40 rounded-full -translate-y-24 translate-x-24 blur-md"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/30 dark:bg-voxcina-blue/40 rounded-full translate-y-24 -translate-x-24 blur-md"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div
              className="text-9xl md:text-[12rem] font-bold text-primary/10 dark:text-primary/20 select-none animate-hero-rise"
              style={{ animationDelay: STAGGER[0] }}
            >
              404
            </div>

            <div
              className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 -mt-20 sm:-mt-24 md:-mt-32 mb-6 animate-hero-rise"
              style={{ animationDelay: STAGGER[1] }}
            >
              <Image
                src="/images/Logo/BlueXTransparent.png"
                alt="وکسینا"
                fill
                className="object-contain dark:brightness-0 dark:invert"
                sizes="(max-width: 640px) 7rem, (max-width: 768px) 8rem, 10rem"
                priority
              />
            </div>

            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold text-primary dark:text-secondary-100 mb-4 animate-hero-rise"
              style={{ animationDelay: STAGGER[2] }}
            >
              صفحه مورد نظر یافت نشد!
            </h1>

            <p
              className="text-sm sm:text-base md:text-lg text-muted-foreground dark:text-secondary-100/70 mb-8 max-w-xl animate-hero-rise"
              style={{ animationDelay: STAGGER[3] }}
            >
              متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا ممکن است حذف شده باشد.
              می‌توانید به صفحه اصلی بازگردید یا از جستجو استفاده کنید.
            </p>

            <div
              className="flex gap-4 justify-center animate-hero-rise"
              style={{ animationDelay: STAGGER[4] }}
            >
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 h-11 px-4 sm:px-5 py-2.5 text-xs sm:text-sm"
              >
                <Home className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                صفحه اصلی
              </Link>

              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-secondary hover:border-primary/20 text-foreground shadow-soft transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 h-11 px-4 sm:px-5 py-2.5 text-xs sm:text-sm"
              >
                <ChevronLeft className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                مشاهده محصولات
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
