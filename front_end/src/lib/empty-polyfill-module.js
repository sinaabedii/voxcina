/**
 * Intentionally empty. Wired as the resolution target for
 * Next's hard-coded `../build/polyfills/polyfill-module` require in
 * next.config.js `turbopack.resolveAlias`.
 *
 * Next injects those Baseline-era polyfills (trimStart/trimEnd, Symbol.description,
 * Array.flat/flatMap, Promise.finally, Object.fromEntries, Array.at,
 * Object.hasOwn, URL.canParse) into the initial client bundle unconditionally,
 * regardless of browserslist — see vercel/next.js#86785. Every API in it is
 * natively supported by all browsers that execute this ESM-only chunk, so the
 * shims are dead bytes Lighthouse reports as "Legacy JavaScript".
 *
 * Upstream ships no opt-out until that issue lands; this alias is the only
 * config-level removal. If a Next upgrade renames the module path, the alias
 * silently stops matching — the post-build grep in CI/deploy must catch that.
 */
