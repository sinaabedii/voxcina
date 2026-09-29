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

/**
 * Top-right navy blob silhouette. Straight edges run along the viewBox top
 * and right — those sides bleed off the frame — while a hand-shaped bézier
 * wave faces the canvas. Same grammar as `TexturedBackground`'s blobs
 * (collection page), with a new path.
 */
const BLOB_TOP_RIGHT =
  "M400 0 L150 0 C106 24 94 76 120 110 C146 146 200 148 234 192 C266 234 250 294 284 342 C312 382 352 398 400 400 Z";

/**
 * Bottom-left counterweight: straight along the viewBox left and bottom
 * (bleeding edges), with an unstructured wave travelling down-right. The
 * top-right/bottom-left pairing is the collection background's asymmetric
 * weighting — deliberately unbalanced, never a mirrored frame.
 */
const BLOB_BOTTOM_LEFT =
  "M0 400 L0 150 C30 158 56 138 86 158 C122 182 116 236 152 266 C190 298 244 300 282 336 C316 368 356 392 400 400 Z";

/**
 * Fine monochrome fractal noise tile — the paper/plaster film grain shared
 * with `TexturedBackground` and `MastheadSurface`. Pure data-URI SVG, no
 * image asset, no JS.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

export default function QrPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-voxcina-cream px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Organic background. Deliberately STATIC: infinite motion on a
          fixed full-viewport layer forces whole-screen repaints every frame,
          so every layer below renders once and never animates. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* The site sketch, now SCATTERED: pieces of the homepage wireframe
            (nav pill, hero card, chips, product cards) placed loosely at
            different angles down the diagonal cream band between the two
            blobs — no straight rotated column anymore. Heavily blurred so it
            reads as a ghost of the homepage, not a diagram. */}
        <div className="absolute -left-[10%] top-[7%] w-[58%] -rotate-6 opacity-40 blur-[6px]">
          <div className="flex items-center justify-between rounded-full border border-voxcina-blue/45 px-4 py-3">
            <span className="h-5 w-5 rounded-full border border-voxcina-blue/55" />
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-voxcina-blue/45" />
              <span className="h-1.5 w-5 rounded-full bg-voxcina-blue/45" />
              <span className="h-1.5 w-10 rounded-full bg-voxcina-blue/45" />
            </span>
            <span className="h-4 w-4 rounded-md border border-voxcina-blue/55" />
          </div>
        </div>

        <div className="absolute -left-[14%] top-[24%] w-[58%] rotate-[5deg] opacity-35 blur-[7px]">
          <div className="flex h-32 flex-col justify-center gap-2.5 rounded-3xl border border-voxcina-blue/45 bg-voxcina-blue/[0.06] px-6">
            <span className="h-2.5 w-1/2 rounded-full bg-voxcina-blue/50" />
            <span className="h-1.5 w-3/4 rounded-full bg-voxcina-blue/35" />
            <span className="h-1.5 w-2/3 rounded-full bg-voxcina-blue/35" />
            <span className="mt-1 h-6 w-16 rounded-full bg-voxcina-blue/55" />
          </div>
        </div>

        <div className="absolute -right-[10%] top-[50%] w-[46%] -rotate-3 opacity-35 blur-[6px]">
          <div className="flex gap-2.5">
            <span className="h-7 flex-1 rounded-full border border-voxcina-blue/45" />
            <span className="h-7 flex-1 rounded-full border border-voxcina-blue/45 bg-voxcina-blue/20" />
            <span className="h-7 flex-1 rounded-full border border-voxcina-blue/45" />
          </div>
        </div>

        <div className="absolute -right-[8%] bottom-[14%] w-[52%] rotate-[7deg] opacity-40 blur-[6px]">
          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl border border-voxcina-blue/45 p-2.5">
              <span className="block h-14 rounded-xl bg-voxcina-blue/30" />
              <span className="mt-2 block h-1.5 w-4/5 rounded-full bg-voxcina-blue/45" />
              <span className="mt-1.5 block h-1.5 w-2/5 rounded-full bg-voxcina-blue/55" />
            </div>
            <div className="flex-1 rounded-2xl border border-voxcina-blue/45 p-2.5">
              <span className="block h-14 rounded-xl bg-voxcina-blue/30" />
              <span className="mt-2 block h-1.5 w-3/5 rounded-full bg-voxcina-blue/45" />
              <span className="mt-1.5 block h-1.5 w-2/5 rounded-full bg-voxcina-blue/55" />
            </div>
          </div>
        </div>

        {/* Two soft navy forms bleeding off the top-right and bottom-left —
            hand-shaped bézier silhouettes (the collection page's organic
            language), each with a blurred halo path behind it so the edge
            melts into the plaster instead of reading as a cut shape. */}
        <svg
          viewBox="0 0 400 400"
          className="absolute -top-[14%] -right-[20%] w-[95vw] max-w-[470px] overflow-visible blur-[1.5px]"
        >
          <path
            d={BLOB_TOP_RIGHT}
            fill="#1A3C69"
            opacity="0.3"
            transform="translate(-16 -12) scale(1.07)"
            className="blur-[12px]"
          />
          <path d={BLOB_TOP_RIGHT} fill="#1A3C69" />
        </svg>

        <svg
          viewBox="0 0 400 400"
          className="absolute -bottom-[16%] -left-[20%] w-[95vw] max-w-[470px] overflow-visible blur-[1.5px]"
        >
          <path
            d={BLOB_BOTTOM_LEFT}
            fill="#1A3C69"
            opacity="0.3"
            transform="translate(14 12) scale(1.07)"
            className="blur-[12px]"
          />
          <path d={BLOB_BOTTOM_LEFT} fill="#1A3C69" />
        </svg>

        {/* Small stray blob on the left edge — a third, off-axis form keeps
            the composition unbalanced (collection backgrounds are never
            mirrored). */}
        <div className="absolute -left-[12%] top-[54%] h-36 w-36 rounded-[58%_42%_52%_48%/46%_56%_44%_54%] bg-voxcina-blue/20 blur-[10px]" />

        {/* One sketch fragment drawn in cream ON TOP of the top-right blob:
            the wireframe peeking into the navy form, the way the collection
            page layers content panels over its blobs. */}
        <div className="absolute right-[2%] top-[6%] w-[52%] -rotate-[5deg] opacity-50 blur-[6px]">
          <div className="flex items-center justify-between rounded-full border border-white/35 px-4 py-3">
            <span className="h-5 w-5 rounded-full border border-white/45" />
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-8 rounded-full bg-white/35" />
              <span className="h-1.5 w-5 rounded-full bg-white/35" />
            </span>
            <span className="h-4 w-4 rounded-md border border-white/45" />
          </div>
        </div>

        {/* Film grain over the whole surface, plaster-like — identical
            treatment to the collection/trending brand surfaces. */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Plaque: effectively opaque so body text keeps AA contrast no matter
            which blob or fragment sits behind it (over navy the 95% lightCream
            reads ≈ #F1F0F1). */}
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
