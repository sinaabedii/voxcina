/**
 * GSAP plugins registration (lazy per route).
 *
 * `@/lib/gsap` exports bare `gsap` only — no plugin JavaScript is loaded on
 * routes that just need a simple tween (e.g. the homepage product carousel's
 * `gsap.to(el, { scrollLeft })`).
 *
 * Import `gsap`/`ScrollTrigger`/`SplitText`/`Flip`/`ScrollToPlugin` from THIS
 * module in components that actually use those features. Next.js then places
 * the plugin payload into those routes' chunks only, keeping it off the
 * homepage bundle (where it was the dominant Script Evaluation + Parsing cost
 * despite none of the plugins being used).
 *
 * Registration is idempotent and guarded for SSR.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, ScrollToPlugin);
}

export { gsap, ScrollTrigger, SplitText, Flip, ScrollToPlugin };
