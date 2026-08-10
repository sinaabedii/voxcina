import type { CSSProperties } from "react";
import type {
  HeroAlign,
  HeroAnimation,
  HeroBoxWidth,
  HeroButtonSize,
  HeroColorStyle,
  HeroElementAlign,
  HeroElementWidth,
  HeroFontWeight,
  HeroGradientDirection,
  HeroRounded,
  HeroSpacing,
  HeroTextSize,
  HeroVerticalPosition,
} from "@/types/hero-image";

/**
 * Every Tailwind class the hero renderer can emit lives here as a literal
 * string. This file sits under `src/components/`, which is covered by the
 * Tailwind `content` globs, so the JIT compiler keeps these classes even
 * though they are selected at runtime from admin-authored data.
 *
 * Colors are deliberately NOT tokenized — they come from the admin as hex and
 * are applied through inline styles, which the purge step cannot break.
 */

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/** `3xl` reproduces the original hardcoded <h1>; `md` the original <p>. */
export const TEXT_SIZE_CLASSES: Record<HeroTextSize, string> = {
  xs: "text-[10px] sm:text-xs",
  sm: "text-xs sm:text-sm",
  md: "text-xs sm:text-sm md:text-base lg:text-lg",
  lg: "text-sm sm:text-base md:text-lg lg:text-xl",
  xl: "text-lg sm:text-xl md:text-2xl lg:text-3xl",
  "2xl": "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl",
  "3xl": "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl",
};

export const FONT_WEIGHT_CLASSES: Record<HeroFontWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export const VERTICAL_POSITION_CLASSES: Record<HeroVerticalPosition, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

export const HORIZONTAL_POSITION_CLASSES: Record<HeroAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

export const TEXT_ALIGN_CLASSES: Record<HeroAlign, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

/** Horizontal placement of a single element within the content box. */
export const SELF_ALIGN_CLASSES: Record<HeroAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

export const ROW_JUSTIFY_CLASSES: Record<HeroAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

export const BOX_WIDTH_CLASSES: Record<HeroBoxWidth, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
  full: "max-w-full",
};

/** `md` reproduces the original subtitle clamp. */
export const ELEMENT_WIDTH_CLASSES: Record<HeroElementWidth, string> = {
  auto: "",
  sm: "max-w-[16rem] sm:max-w-xs",
  md: "max-w-xs sm:max-w-sm md:max-w-xl",
  lg: "max-w-sm sm:max-w-lg md:max-w-2xl",
  full: "w-full",
};

export const SPACING_CLASSES: Record<HeroSpacing, string> = {
  none: "",
  xs: "mb-1 sm:mb-2",
  sm: "mb-2 sm:mb-3",
  md: "mb-3 sm:mb-4 md:mb-6",
  lg: "mb-4 sm:mb-6 md:mb-8",
  xl: "mb-6 sm:mb-10 md:mb-12",
};

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const ANIMATION_CLASSES: Record<HeroAnimation, string> = {
  none: "",
  slideUp: "animate-slideUp",
  slideDown: "animate-slideDown",
  fadeIn: "animate-fadeIn",
  slideInRight: "animate-slideInRight",
  slideInLeft: "animate-slideInLeft",
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export const BUTTON_SIZE_CLASSES: Record<HeroButtonSize, string> = {
  sm: "px-4 py-2 text-xs sm:text-sm",
  md: "px-5 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base",
  lg: "px-6 sm:px-8 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg",
};

export const ROUNDED_CLASSES: Record<HeroRounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

// ---------------------------------------------------------------------------
// Color helpers (inline styles — purge-proof)
// ---------------------------------------------------------------------------

const GRADIENT_ANGLES: Record<HeroGradientDirection, string> = {
  "to-r": "to right",
  "to-l": "to left",
  "to-b": "to bottom",
  "to-br": "to bottom right",
  "to-bl": "to bottom left",
  "to-tr": "to top right",
};

/** Persian labels for the direction picker in the admin. */
export const GRADIENT_DIRECTION_LABELS: Record<HeroGradientDirection, string> = {
  "to-r": "به راست",
  "to-l": "به چپ",
  "to-b": "به پایین",
  "to-br": "به پایین-راست",
  "to-bl": "به پایین-چپ",
  "to-tr": "به بالا-راست",
};

/** Converts `#rrggbb` + a 0–100 alpha into an `rgba()` string. */
export function withAlpha(hex: string, opacity: number): string {
  const normalized = (hex || "#000000").replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const alpha = Math.min(100, Math.max(0, opacity ?? 100)) / 100;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Builds a CSS `linear-gradient(...)`, skipping an empty middle stop. */
export function buildGradient(
  direction: HeroGradientDirection,
  from: string,
  via: string,
  to: string
): string {
  const stops = [from, via, to].filter((stop) => stop && stop.trim() !== "");
  const angle = GRADIENT_ANGLES[direction] || GRADIENT_ANGLES["to-br"];
  return `linear-gradient(${angle}, ${stops.join(", ")})`;
}

/**
 * Turns a text color config into inline styles. Gradient mode clips the
 * gradient to the glyphs — the treatment used by "وکسینا" in the original hero.
 */
export function resolveTextStyle(color: HeroColorStyle): CSSProperties {
  const opacity = Math.min(100, Math.max(0, color.opacity ?? 100)) / 100;

  if (color.mode === "gradient") {
    return {
      backgroundImage: buildGradient(color.direction, color.from, color.via, color.to),
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      opacity,
    };
  }

  return { color: color.color, opacity };
}

/** Resolves an element's alignment against the content box default. */
export function resolveAlign(align: HeroElementAlign, fallback: HeroAlign): HeroAlign {
  return align === "inherit" ? fallback : align;
}

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

/**
 * Admin-authored links land in an `href`, so anything that is not a relative
 * path, a fragment, or an explicitly allowed scheme is dropped. Blocks
 * `javascript:` and `data:` URLs.
 */
export function sanitizeHeroHref(href: string): string {
  const value = (href || "").trim();
  if (value === "") return "#";
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("?")) {
    return value;
  }

  try {
    const parsed = new URL(value, "https://placeholder.local");
    return SAFE_URL_SCHEMES.includes(parsed.protocol) ? value : "#";
  } catch {
    return "#";
  }
}
