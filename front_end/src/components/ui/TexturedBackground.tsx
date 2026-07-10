/**
 * VOXCINA textured brand background.
 *
 * Warm cream plaster/paper surface with two soft-edged organic navy blobs
 * bleeding in from the top-right and bottom-left corners (asymmetrical),
 * a barely-there film grain over the whole surface, and the logo mark
 * embedded in cream at partial opacity inside the top-right blob.
 *
 * Pure CSS/SVG — no images besides the logo mask, no JS. Reusable across
 * hero, category and section banners: render as the first child of a
 * `relative isolate` container and it fills it edge-to-edge behind content.
 */

interface TexturedBackgroundProps {
  className?: string;
  /** Embed the wing-mark watermark inside the top-right blob. */
  withLogo?: boolean;
}

/** Warm off-white matching the logo's cream tone (slightly warmer than pure white). */
const CREAM = "#F2EEE9";
/** Brand navy (voxcina-blue). */
const NAVY = "#1A3C69";

/**
 * Fine monochrome fractal noise tile (SVG feTurbulence) — like the natural
 * imperfections of linen or lightly textured paper.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

export default function TexturedBackground({
  className = "",
  withLogo = true,
}: TexturedBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      style={{ backgroundColor: CREAM }}
    >
      {/* Top-right navy blob — soft, slightly irregular edge, bleeds off frame */}
      <svg
        className="absolute right-0 top-0 h-auto w-[72vw] max-w-[680px] sm:w-[46vw]"
        viewBox="0 0 720 720"
        preserveAspectRatio="xMaxYMin meet"
        fill="none"
      >
        <path
          d="M312 0
             C260 8 214 34 190 78
             C164 126 176 190 216 228
             C258 268 326 262 372 296
             C420 332 428 402 474 440
             C518 476 584 480 632 452
             C666 432 696 438 720 452
             L720 0 Z"
          fill={NAVY}
        />
      </svg>

      {/* Bottom-left navy blob — asymmetrical counterweight */}
      <svg
        className="absolute bottom-0 left-0 h-auto w-[64vw] max-w-[560px] sm:w-[38vw]"
        viewBox="0 0 720 720"
        preserveAspectRatio="xMinYMax meet"
        fill="none"
      >
        <path
          d="M0 296
             C42 282 92 292 122 326
             C156 364 148 424 178 464
             C210 506 272 512 312 548
             C354 586 360 650 396 690
             C405 701 415 711 428 720
             L0 720 Z"
          fill={NAVY}
        />
      </svg>

      {/* Wing mark embedded in the top-right blob — cream, partial opacity */}
      {withLogo && (
        <div
          className="absolute right-[4%] top-[3%] aspect-[951/522] w-[clamp(96px,14vw,190px)] opacity-[0.16]"
          style={{
            backgroundColor: CREAM,
            WebkitMaskImage: "url(/images/Logo/WXTransparent-org.png)",
            maskImage: "url(/images/Logo/WXTransparent-org.png)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      )}

      {/* Film grain over the whole surface (base + blobs) */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
