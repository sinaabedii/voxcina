/**
 * Central GSAP plugin registration.
 *
 * Import `gsap` from this module (instead of directly from "gsap") in any
 * component that needs ScrollTrigger / SplitText / Flip so the plugins are
 * guaranteed to be registered before use. Registration is idempotent and
 * guarded for SSR (Next.js renders this module on the server too, where
 * `window` is unavailable and plugin registration must be skipped).
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
