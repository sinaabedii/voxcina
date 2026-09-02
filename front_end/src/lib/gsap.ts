/**
 * Bare GSAP core — no plugins loaded or registered here.
 *
 * Import `gsap` from this module for simple tweens (e.g. `gsap.to(el, {
 * scrollLeft })`). This keeps the plugin JavaScript (ScrollTrigger, SplitText,
 * Flip, ScrollToPlugin) off the route's bundle — they were previously imported
 * eagerly here, which made the homepage pay ~100 KB+ of Script Evaluation /
 * Parsing & Compilation cost for plugins it never uses.
 *
 * Components that actually use a GSAP plugin must import it from
 * `@/lib/gsap-plugins` instead, which registers the plugins. That import lands
 * the plugin payload only in the route chunks that need it (blog / collection
 * / article), not the homepage.
 */
import gsap from "gsap";

export { gsap };
