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

/** Brand navy — the same value `TexturedBackground` uses. */
const NAVY = "#1A3C69";

/**
 * Top-right organic mass. The exact path grammar (and path data) as the
 * collection page's `TexturedBackground`: straight top/right edges that bleed
 * off the frame, a hand-drawn bézier wave facing the canvas. Rendered three
 * times at growing sizes to step 35% → 70% → solid opacity along one edge.
 */
const BLOB_TOP_RIGHT =
  "M312 0 C260 8 214 34 190 78 C164 126 176 190 216 228 C258 268 326 262 372 296 C420 332 428 402 474 440 C518 476 584 480 632 452 C666 432 696 438 720 452 L720 0 Z";

/** Bottom-left counterweight — likewise straight left/bottom bleed edges. */
const BLOB_BOTTOM_LEFT =
  "M0 296 C42 282 92 292 122 326 C156 364 148 424 178 464 C210 506 272 512 312 548 C354 586 360 650 396 690 C405 701 415 711 428 720 L0 720 Z";

/**
 * Simplified wing mark, drawn inline: a gull band with pointed tips and a
 * centre tail — the gesture of the VOXCINA logo, used as the blob watermark
 * the way the collection page embeds its logo. Inline path, no image asset.
 */
const WING_MARK =
  "M8 14 C58 24 102 48 130 74 C158 48 202 24 252 14 C216 44 174 76 130 104 C86 76 44 44 8 14 Z";

/**
 * Fine monochrome fractal noise tile — the paper/plaster film grain shared
 * with `TexturedBackground` and `MastheadSurface`. Pure data-URI SVG, no
 * image asset, no JS.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

export default function QrPage() {
  // No `overflow-hidden` on <main>: with a centred plaque, clipping on a
  // short phone would cut off the top AND bottom of the card with no way to
  // scroll to either. The bleed-clipping job belongs to the background
  // wrapper below, which still clips every blob that runs off-frame.
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-voxcina-cream px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Organic background in the collection page's language: bold, crisp-
          edged navy shapes bleeding off the frame, layered at visibly
          different opacities. Deliberately STATIC — no blur on the silhouettes
          and no animation: infinite motion (or per-frame filtering) on a
          fixed full-viewport layer forces whole-screen repaints. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Top-right mass: three nested waves anchored at the same corner —
            the same hand-drawn path at growing sizes, so the 35% → 70% →
            solid steps follow one organic edge instead of fading to nothing. */}
        <svg
          viewBox="0 0 720 720"
          className="absolute -top-1 -right-1 h-auto w-[100vw] max-w-[560px]"
        >
          <path d={BLOB_TOP_RIGHT} fill={NAVY} opacity="0.35" />
        </svg>
        <svg
          viewBox="0 0 720 720"
          className="absolute -top-1 -right-1 h-auto w-[84vw] max-w-[470px]"
        >
          <path d={BLOB_TOP_RIGHT} fill={NAVY} opacity="0.7" />
        </svg>
        <svg
          viewBox="0 0 720 720"
          className="absolute -top-1 -right-1 h-auto w-[68vw] max-w-[390px]"
        >
          <path d={BLOB_TOP_RIGHT} fill={NAVY} />
        </svg>

        {/* Wing-mark watermark embedded in the solid mass — cream at partial
            opacity, the collection page's logo-in-blob move, drawn inline. */}
        <div className="absolute right-[8%] top-3 w-[clamp(96px,26vw,160px)] opacity-[0.16]">
          <svg viewBox="0 0 260 150" className="h-auto w-full">
            <path d={WING_MARK} fill="#FCFAF8" />
            <text
              x="130"
              y="142"
              textAnchor="middle"
              direction="ltr"
              fill="#FCFAF8"
              fontSize="30"
              fontWeight="700"
              letterSpacing="6"
            >
              VOXCINA
            </text>
          </svg>
        </div>

        {/* Bottom-left counterweight: a 38% echo reaching further into the
            canvas, with the solid mass layered on top of it. */}
        <svg
          viewBox="0 0 720 720"
          className="absolute -bottom-1 -left-1 h-auto w-[96vw] max-w-[540px]"
        >
          <path d={BLOB_BOTTOM_LEFT} fill={NAVY} opacity="0.38" />
        </svg>
        <svg
          viewBox="0 0 720 720"
          className="absolute -bottom-1 -left-1 h-auto w-[76vw] max-w-[430px]"
        >
          <path d={BLOB_BOTTOM_LEFT} fill={NAVY} />
        </svg>

        {/* Film grain over the whole surface, plaster-like — identical
            treatment to the collection/trending brand surfaces. */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Plaque: effectively opaque so body text keeps AA contrast no matter
            which blob layer sits behind it (over solid navy the 95%
            lightCream reads ≈ #F1F0F1). */}
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
            <span className="text-[11px] text-voxcina-blue/80">© ۱۴۰۵ وکسینا</span>
            <span className="h-px flex-1 bg-voxcina-blue/15" />
          </div>
        </div>
      </div>
    </main>
  );
}
