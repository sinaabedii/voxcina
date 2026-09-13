/**
 * The masthead's brand surface.
 *
 * Same material as `TexturedBackground` — warm cream, a navy presence bleeding
 * from the top-right, a counterweight at the bottom-left, the wing mark, film
 * grain — but built from soft radial washes instead of that component's hard
 * blob paths. Those blobs are cut for a full-viewport intro; dropped into a
 * band a few hundred pixels tall they reach right across the headline, and a
 * centred Persian h1 ends up navy-on-navy.
 *
 * Washes have no edge to collide with, so the band stays legible at any height.
 */

/** Warm off-white matching the logo's cream tone. Same value TexturedBackground uses. */
const CREAM = "#F2EEE9";

/** Fine monochrome fractal noise — the paper grain shared with the rest of the brand surfaces. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

export default function MastheadSurface() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: CREAM }}
    >
      {/* Navy from the top-right, brass from the bottom-left: the same
          asymmetric weighting as the brand background, without hard edges. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(115% 80% at 100% 0%, rgba(26,60,105,0.18) 0%, rgba(26,60,105,0.06) 42%, rgba(26,60,105,0) 68%), " +
            "radial-gradient(85% 70% at 0% 100%, rgba(152,127,85,0.16) 0%, rgba(152,127,85,0.04) 45%, rgba(152,127,85,0) 70%)",
        }}
      />

      {/* The wing alone, bleeding off the top-right corner in navy at low
          opacity — large enough to read as texture rather than as a logo
          placement. The full lockup is deliberately not used: its wordmark
          stays legible at this size and looks like a stray watermark. */}
      <div
        className="absolute -right-[8%] -top-[10%] aspect-[951/311] w-[clamp(300px,42vw,640px)] opacity-[0.07]"
        style={{
          backgroundColor: "#1A3C69",
          WebkitMaskImage: "url(/images/Logo/icon-navy.png)",
          maskImage: "url(/images/Logo/icon-navy.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
