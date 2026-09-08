// SKU color-duplication helpers for the admin product forms.
//
// SKU format (Coding.json, G-CC-BSCZ): gender, category (2), brand, style,
// color, size. Duplicating a color keeps everything but the 6th character
// (the color code), which is incremented through 0-9 then A-Z. Existing
// catalog data may hold Persian/Arabic digits in that position, so values
// are normalized before comparison.

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Normalizes Persian/Arabic digits to Latin (e.g. "۲" -> "2"). */
export function normalizeSkuDigits(sku: string): string {
  return sku.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p !== -1) return String(p);
    return String(ARABIC_DIGITS.indexOf(ch));
  });
}

/** True when the char is a valid color-code position value: 0-9 or A-Z. */
function isColorCodeChar(ch: string): boolean {
  return /[0-9A-Z]/.test(ch);
}

/** Position of the color code inside an SKU: second-to-last character. */
const COLOR_CODE_POSITION_FROM_END = 2;

export interface SkuColorInfo {
  /** Prefix before the color code (first 5 chars, e.g. "M41Y0"). */
  prefix: string;
  /** Color code char (6th char, normalized to Latin digits). */
  colorCode: string;
  /** Trailing size code (last char, e.g. "E"). */
  sizeCode: string;
}

/** Splits an SKU into prefix / color code / size code; null when malformed. */
export function parseSkuColorParts(sku: string): SkuColorInfo | null {
  const normalized = normalizeSkuDigits(sku.trim().toUpperCase());
  if (normalized.length < 3) return null;
  const colorCode = normalized[normalized.length - COLOR_CODE_POSITION_FROM_END];
  if (!isColorCodeChar(colorCode)) return null;
  return {
    prefix: normalized.slice(0, normalized.length - COLOR_CODE_POSITION_FROM_END),
    colorCode,
    sizeCode: normalized[normalized.length - 1],
  };
}

/**
 * Finds the highest color code among the SKUs sharing `prefix`
 * (e.g. every size of one color) and returns the next unused code,
 * or null when the sequence is exhausted / no valid SKU was found.
 */
export function nextColorCodeForPrefix(prefix: string, existingSkus: string[]): string | null {
  const wanted = normalizeSkuDigits(prefix.trim().toUpperCase());
  let maxIndex = -1;
  for (const sku of existingSkus) {
    const parts = parseSkuColorParts(sku);
    if (!parts || parts.prefix !== wanted) continue;
    const idx = colorCharToIndex(parts.colorCode);
    if (idx !== null && idx > maxIndex) maxIndex = idx;
  }
  const nextIdx = maxIndex + 1;
  return colorIndexToChar(nextIdx);
}

function colorCharToIndex(ch: string): number | null {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - "0".charCodeAt(0);
  if (ch >= "A" && ch <= "Z") return 10 + (ch.charCodeAt(0) - "A".charCodeAt(0));
  return null;
}

function colorIndexToChar(idx: number): string | null {
  if (idx < 0 || idx > 35) return null;
  return idx < 10 ? String(idx) : String.fromCharCode("A".charCodeAt(0) + (idx - 10));
}

/**
 * Builds the duplicated sizes for one new color: same size names and
 * quantities, with the color code advanced from the highest code already
 * present among the SKUs sharing the source color's prefix.
 * Returns null when the source has no parsable SKU or the codes are used up.
 */
export function duplicateColorSizes(
  sourceSizes: { size: string; sku: string; quantity: number }[],
  allSkusInProduct: string[],
): { size: string; sku: string; quantity: number }[] | null {
  const sourceParts = sourceSizes
    .map((s) => parseSkuColorParts(s.sku))
    .find((p): p is SkuColorInfo => p !== null);
  if (!sourceParts) return null;
  const nextCode = nextColorCodeForPrefix(sourceParts.prefix, allSkusInProduct);
  if (nextCode === null) return null;
  return sourceSizes.map((s) => ({
    size: s.size,
    sku: rewriteColorCode(s.sku, nextCode),
    quantity: s.quantity,
  }));
}

/** Replaces the color-code character of an SKU, preserving its other chars. */
export function rewriteColorCode(sku: string, newColorCode: string): string {
  if (sku.length < 3) return sku;
  const chars = [...sku];
  chars[chars.length - 2] = newColorCode;
  return chars.join("");
}
