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

export default function QrPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-voxcina-cream px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Background composition. Deliberately STATIC: infinite motion on a
          fixed full-viewport layer forces whole-screen repaints every frame,
          so the sketch and blobs below render once and never animate. */}

      {/* "Site sketch" — a pure-CSS wireframe of the homepage (nav bar, hero
          block, product grid) drawn from hairline shapes, then heavily blurred
          so it reads as a distant blueprint, not a screenshot. The whole
          column is slightly rotated so the edges feel hand-placed rather than
          gridded, and it is capped at phone width so the composition is built
          for portrait ~9:19.5 screens first. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-center"
      >
        <div className="flex w-full max-w-sm -rotate-2 flex-col gap-5 px-7 py-9 opacity-70 blur-[5px]">
          {/* Nav bar sketch */}
          <div className="flex items-center justify-between rounded-full border border-voxcina-blue/25 px-4 py-3">
            <span className="h-5 w-5 rounded-full border border-voxcina-blue/35" />
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-voxcina-blue/25" />
              <span className="h-1.5 w-6 rounded-full bg-voxcina-blue/25" />
              <span className="h-1.5 w-10 rounded-full bg-voxcina-blue/25" />
            </span>
            <span className="h-4 w-4 rounded-md border border-voxcina-blue/35" />
          </div>

          {/* Hero sketch */}
          <div className="flex h-36 flex-col justify-center gap-3 rounded-3xl border border-voxcina-blue/25 bg-voxcina-blue/[0.04] px-6">
            <span className="h-2.5 w-2/5 rounded-full bg-voxcina-blue/30" />
            <span className="h-1.5 w-3/5 rounded-full bg-voxcina-blue/20" />
            <span className="h-1.5 w-1/2 rounded-full bg-voxcina-blue/20" />
            <span className="mt-1 h-6 w-20 rounded-full bg-voxcina-blue/35" />
          </div>

          {/* Category chips sketch */}
          <div className="flex gap-2.5">
            <span className="h-7 flex-1 rounded-full border border-voxcina-blue/20" />
            <span className="h-7 flex-1 rounded-full border border-voxcina-blue/20 bg-voxcina-blue/10" />
            <span className="h-7 flex-1 rounded-full border border-voxcina-blue/20" />
          </div>

          {/* Product grid sketch */}
          <div className="grid grid-cols-2 gap-4">
            {["rounded-tl-3xl", "rounded-tr-3xl", "rounded-br-3xl", "rounded-bl-3xl"].map(
              (corner) => (
                <div
                  key={corner}
                  className={`flex flex-col gap-2 rounded-2xl border border-voxcina-blue/20 p-2.5 ${corner}`}
                >
                  <span className="h-16 rounded-xl bg-voxcina-blue/15" />
                  <span className="h-1.5 w-4/5 rounded-full bg-voxcina-blue/25" />
                  <span className="h-1.5 w-2/5 rounded-full bg-voxcina-blue/35" />
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Organic blobs in the primary color, layered over the blurred sketch.
          Asymmetric border-radius gives soft, hand-formed shapes; heavy blur
          melts them into the canvas. Top-left and bottom-right so the portrait
          column stays visually balanced. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -left-32 h-80 w-80 rounded-[58%_42%_55%_45%/48%_56%_44%_52%] bg-gradient-to-br from-voxcina-blue/25 via-primary-500/15 to-primary-800/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -right-28 h-[22rem] w-[22rem] rounded-[45%_55%_40%_60%/56%_44%_62%_38%] bg-gradient-to-tl from-voxcina-blue/30 via-primary-600/15 to-primary-400/10 blur-3xl"
      />
      {/* Small accent blob peeking behind the plaque's lower edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[18%] left-[6%] h-28 w-28 rounded-[62%_38%_48%_52%/44%_58%_42%_56%] bg-voxcina-blue/15 blur-2xl"
      />

      <div className="relative w-full max-w-sm">
        {/* Plaque: more opaque and elevated than before so body text keeps AA
            contrast over the new blurred blue backdrop. */}
        <div className="relative rounded-[2rem] border border-voxcina-blue/10 bg-voxcina-lightCream/95 px-6 py-10 shadow-medium ring-1 ring-white/60 backdrop-blur-md sm:px-10 sm:py-12">
          {/* Scan hint — the quiet "how did I get here" line */}
          <p className="flex items-center justify-center gap-3 text-xs text-voxcina-blue/80">
            <span aria-hidden="true" className="h-px w-6 bg-voxcina-blue/25" />
            با اسکن کد به وکسینا رسیدید
            <span aria-hidden="true" className="h-px w-6 bg-voxcina-blue/25" />
          </p>

          {/* Logo — the LCP image, so it is eager-loaded */}
          <div className="relative mt-8 flex justify-center">
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-[55%_45%_50%_50%/48%_54%_46%_52%] bg-voxcina-blue/10 blur-2xl"
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
          <div className="mt-8 flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-voxcina-blue/15" />
            <span className="h-1.5 w-1.5 rotate-45 bg-voxcina-blue/40" />
            <span className="h-px flex-1 bg-voxcina-blue/15" />
          </div>

          {/* Oversized Persian display type */}
          <h1 className="mt-6 text-center text-3xl font-bold leading-snug text-voxcina-blue sm:text-4xl">
            مد و پوشاک وکسینا
          </h1>
          <p className="mt-2 text-center text-sm text-voxcina-blue/80">
            فروشگاه اینترنتی لباس و پوشاک
          </p>

          {/* Links — plain user-tapped anchors, never a JS redirect, so they
              behave predictably inside Instagram/Telegram in-app browsers. */}
          <nav aria-label="پیوندهای وکسینا" className="mt-9 flex flex-col gap-3">
            <a
              href="https://voxcina.com/"
              className="group flex h-14 items-center justify-between rounded-2xl bg-voxcina-blue px-5 text-voxcina-lightCream shadow-soft transition-colors duration-300 hover:bg-voxcina-darkBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 focus-visible:ring-offset-voxcina-lightCream"
            >
              <span className="text-base font-bold">ورود به وب‌سایت</span>
              <span className="flex items-center gap-3">
                <span dir="ltr" className="text-xs font-normal opacity-70">
                  voxcina.com
                </span>
                {/* The one kept micro-interaction: chevron nudges on hover,
                    transform-only and disabled under reduced motion. */}
                <ChevronLeft
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
                />
              </span>
            </a>

            <a
              href="https://www.instagram.com/voxcina"
              className="group flex h-14 items-center justify-between rounded-2xl border border-voxcina-blue/20 px-5 text-voxcina-blue transition-colors duration-300 hover:border-voxcina-blue/40 hover:bg-voxcina-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 focus-visible:ring-offset-voxcina-lightCream"
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
              className="group flex h-14 items-center justify-between rounded-2xl border border-voxcina-blue/20 px-5 text-voxcina-blue transition-colors duration-300 hover:border-voxcina-blue/40 hover:bg-voxcina-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue focus-visible:ring-offset-2 focus-visible:ring-offset-voxcina-lightCream"
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
          <div className="mt-9 flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-voxcina-blue/15" />
            <span className="text-[11px] text-voxcina-blue/70">© ۱۴۰۵ وکسینا</span>
            <span className="h-px flex-1 bg-voxcina-blue/15" />
          </div>
        </div>
      </div>
    </main>
  );
}
