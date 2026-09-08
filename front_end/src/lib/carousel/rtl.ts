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

export function isRtl(el: HTMLElement): boolean {
  return getComputedStyle(el).direction === "rtl";
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
