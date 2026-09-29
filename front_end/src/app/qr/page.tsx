import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { ChevronLeft, Instagram, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "ورود از طریق کد QR",
  description:
    "با اسکن کد QR به وکسینا رسیدید. از اینجا وارد وب‌سایت وکسینا شوید و کانال‌های اینستاگرام و تلگرام ما را دنبال کنید.",
  openGraph: {
    siteName: "Voxcina",
    title: "وکسینا | ورود از طریق کد QR",
    description:
      "با اسکن کد QR به وکسینا رسیدید. وب‌سایت، اینستاگرام و تلگرام وکسینا را از اینجا ببینید.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        // Dimensions match the asset on disk (951x522), like the root
        // layout's OG entry — a mismatched claim makes crawlers lay out a
        // card the image never fits.
        url: "/images/Logo/WXTransparent-org.png",
        width: 951,
        height: 522,
        alt: "وکسینا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "وکسینا | ورود از طریق کد QR",
    description:
      "با اسکن کد QR به وکسینا رسیدید. وب‌سایت، اینستاگرام و تلگرام وکسینا را از اینجا ببینید.",
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  alternates: {
    canonical: "https://voxcina.com/qr",
    languages: {
      "fa-IR": "https://voxcina.com/qr",
      "x-default": "https://voxcina.com/qr",
    },
  },
};

// Merges with the root layout's viewport export; `viewportFit: "cover"` lets
// the composition use the full display on notched phones, and the safe-area
// padding below keeps the content clear of the notch and home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#1A3C69",
};

const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` });

export default function QrPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-voxcina-cream px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {/* Static brand glow behind the plaque. Deliberately not animated:
          infinite motion on a fixed full-viewport layer forces whole-screen
          repaints every frame. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_35%,rgba(26,60,105,0.08),transparent_70%)]"
      />

      <div className="relative w-full max-w-md">
        {/* Hairline plaque: one editorial object instead of a generic link list */}
        <div className="relative rounded-[2rem] border border-voxcina-blue/15 bg-voxcina-lightCream px-6 py-10 shadow-soft sm:px-10 sm:py-12">
          {/* Scan hint — the quiet "how did I get here" line */}
          <p
            style={rise(0)}
            className="animate-hero-rise motion-reduce:animate-none flex items-center justify-center gap-3 text-xs text-voxcina-blue/80"
          >
            <span aria-hidden="true" className="h-px w-6 bg-voxcina-blue/25" />
            با اسکن کد به وکسینا رسیدید
            <span aria-hidden="true" className="h-px w-6 bg-voxcina-blue/25" />
          </p>

          {/* Logo — the LCP image, so it is eager-loaded */}
          <div
            style={rise(90)}
            className="animate-hero-rise motion-reduce:animate-none relative mt-8 flex justify-center"
          >
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-voxcina-blue/10 blur-2xl"
            />
            <Image
              src="/images/Logo/BlueXTransparent.png"
              alt="وکسینا"
              width={951}
              height={522}
              priority
              className="relative w-40 sm:w-44"
            />
          </div>

          {/* Hairline divider */}
          <div
            style={rise(180)}
            className="animate-hero-rise motion-reduce:animate-none mt-8 flex items-center gap-4"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-voxcina-blue/15" />
            <span className="h-1.5 w-1.5 rotate-45 bg-voxcina-blue/40" />
            <span className="h-px flex-1 bg-voxcina-blue/15" />
          </div>

          {/* Oversized Persian display type */}
          <h1
            style={rise(260)}
            className="animate-hero-rise motion-reduce:animate-none mt-6 text-center text-3xl font-bold leading-snug text-voxcina-blue sm:text-4xl"
          >
            مد و پوشاک وکسینا
          </h1>
          <p
            style={rise(330)}
            className="animate-hero-rise motion-reduce:animate-none mt-2 text-center text-sm text-voxcina-blue/80"
          >
            فروشگاه اینترنتی لباس و پوشاک
          </p>

          {/* Links — plain user-tapped anchors, never a JS redirect, so they
              behave predictably inside Instagram/Telegram in-app browsers. */}
          <nav aria-label="پیوندهای وکسینا" className="mt-9 flex flex-col gap-3">
            <a
              href="https://voxcina.com/"
              style={rise(400)}
              className="animate-hero-rise motion-reduce:animate-none group flex h-14 items-center justify-between rounded-2xl bg-voxcina-blue px-5 text-voxcina-lightCream shadow-soft transition-colors duration-300 hover:bg-voxcina-darkBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 focus-visible:ring-offset-voxcina-lightCream"
            >
              <span className="text-base font-bold">ورود به وب‌سایت</span>
              <span className="flex items-center gap-3">
                <span dir="ltr" className="text-xs font-normal opacity-70">
                  voxcina.com
                </span>
                <ChevronLeft
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
                />
              </span>
            </a>

            <a
              href="https://www.instagram.com/voxcina"
              style={rise(470)}
              className="animate-hero-rise motion-reduce:animate-none group flex h-14 items-center justify-between rounded-2xl border border-voxcina-blue/20 px-5 text-voxcina-blue transition-colors duration-300 hover:border-voxcina-blue/40 hover:bg-voxcina-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 focus-visible:ring-offset-voxcina-lightCream"
            >
              <span className="flex items-center gap-3">
                <Instagram aria-hidden="true" className="h-5 w-5" />
                <span className="text-base font-bold">اینستاگرام</span>
              </span>
              <span dir="ltr" className="text-xs text-voxcina-blue/80">
                @voxcina
              </span>
            </a>

            <a
              href="https://t.me/Voxcina"
              style={rise(540)}
              className="animate-hero-rise motion-reduce:animate-none group flex h-14 items-center justify-between rounded-2xl border border-voxcina-blue/20 px-5 text-voxcina-blue transition-colors duration-300 hover:border-voxcina-blue/40 hover:bg-voxcina-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 focus-visible:ring-offset-voxcina-lightCream"
            >
              <span className="flex items-center gap-3">
                <Send aria-hidden="true" className="h-5 w-5 -scale-x-100" />
                <span className="text-base font-bold">تلگرام</span>
              </span>
              <span dir="ltr" className="text-xs text-voxcina-blue/80">
                @Voxcina
              </span>
            </a>
          </nav>

          {/* Footer */}
          <div
            style={rise(610)}
            className="animate-hero-rise motion-reduce:animate-none mt-9 flex items-center gap-4"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-voxcina-blue/15" />
            <span className="text-[11px] text-voxcina-blue/40">© ۱۴۰۵ وکسینا</span>
            <span className="h-px flex-1 bg-voxcina-blue/15" />
          </div>
        </div>
      </div>
    </main>
  );
}
