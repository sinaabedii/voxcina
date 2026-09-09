/**
 * RTL-aware scroll helpers.
 * Extracted from ProductCarouselSectionClient so any horizontal scroller
 * (categories, products, etc.) can share the same logic without duplication.
 */

let cachedRtlScrollModel: "negative" | "positive" | null = null;

export function detectRtlScrollModel(): "negative" | "positive" {
  if (cachedRtlScrollModel) return cachedRtlScrollModel;
  const outer = document.createElement("div");
  outer.dir = "rtl";
  outer.style.cssText =
    "position:absolute;top:-1000px;left:-1000px;width:4px;height:1px;overflow:auto;visibility:hidden;";
  const inner = document.createElement("div");
  inner.style.cssText = "width:8px;height:1px;";
  outer.appendChild(inner);
  document.body.appendChild(outer);
  if (outer.scrollLeft > 0) {
    cachedRtlScrollModel = "positive";
  } else {
    outer.scrollLeft = 1;
    cachedRtlScrollModel = outer.scrollLeft === 0 ? "negative" : "positive";
  }
  document.body.removeChild(outer);
  return cachedRtlScrollModel;
}

// `getComputedStyle` forces a style recalc, and this runs on every drag move
// and every auto-scroll frame. A scroller's writing direction is fixed by the
// document (`<html dir="rtl">`), so resolve it once per element.
const directionCache = new WeakMap<HTMLElement, boolean>();

export function isRtl(el: HTMLElement): boolean {
  const cached = directionCache.get(el);
  if (cached !== undefined) return cached;
  const rtl = getComputedStyle(el).direction === "rtl";
  directionCache.set(el, rtl);
  return rtl;
}

/** Raw `scrollLeft` value that produces the given logical offset (0..max). */
export function offsetToRaw(el: HTMLElement, offset: number): number {
  if (!isRtl(el)) return offset;
  const max = el.scrollWidth - el.clientWidth;
  return detectRtlScrollModel() === "negative" ? -offset : max - offset;
}

/** Current logical offset (0..max) regardless of scroll direction model. */
export function getScrollOffset(el: HTMLElement): number {
  if (!isRtl(el)) return el.scrollLeft;
  const max = el.scrollWidth - el.clientWidth;
  return detectRtlScrollModel() === "negative" ? -el.scrollLeft : max - el.scrollLeft;
}

/** Set the logical offset (0..max) regardless of scroll direction model. */
export function setScrollOffset(el: HTMLElement, offset: number): void {
  el.scrollLeft = offsetToRaw(el, offset);
}
