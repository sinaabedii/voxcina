// ============================================================================
// Hero image record
// ============================================================================

export interface HeroImage {
  id?: string;
  image: string;
  deviceType: "desktop" | "mobile";
  isActive: boolean;
  gradient: string;
  noGradient: boolean;
  displayOrder: number;
  /**
   * Authored hero content (text, buttons, placement, colors).
   * Absent on legacy records — the renderer falls back to DEFAULT_HERO_CONTENT.
   */
  content?: HeroContent | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Default gradient for hero section background
 * This is the dark gradient applied to the section container
 */
export const DEFAULT_GRADIENT = "bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900";

/**
 * Default transparent overlay gradient
 * This is the colorful semi-transparent overlay applied on top of the image
 * Used when no custom gradient is specified and noGradient is false
 */
export const DEFAULT_OVERLAY_GRADIENT = "bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20";

// ============================================================================
// Hero content model
//
// Colors are stored as hex strings and applied as inline styles so admins get
// a free choice without Tailwind's JIT purge dropping dynamically built class
// names. Everything that *is* a class name (sizes, spacing, alignment) is an
// enum token resolved through a literal map in
// `components/home/hero-styles.ts`, which Tailwind does scan.
// ============================================================================

export type HeroElementType = "badge" | "heading" | "paragraph" | "button";

/** Responsive type scale. `3xl` matches the original hardcoded <h1>. */
export type HeroTextSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export type HeroFontWeight = "normal" | "medium" | "semibold" | "bold" | "extrabold";

/** Logical alignment — `start` is right-hand side in the RTL storefront. */
export type HeroAlign = "start" | "center" | "end";

export type HeroElementAlign = HeroAlign | "inherit";

export type HeroVerticalPosition = "top" | "center" | "bottom";

export type HeroSpacing = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export type HeroBoxWidth = "sm" | "md" | "lg" | "xl" | "full";

export type HeroElementWidth = "auto" | "sm" | "md" | "lg" | "full";

export type HeroAnimation =
  | "none"
  | "slideUp"
  | "slideDown"
  | "fadeIn"
  | "slideInRight"
  | "slideInLeft";

export type HeroHeadingLevel = "h1" | "h2" | "h3" | "div";

export type HeroColorMode = "solid" | "gradient";

export type HeroGradientDirection = "to-r" | "to-l" | "to-b" | "to-br" | "to-bl" | "to-tr";

export type HeroButtonVariant = "gradient" | "solid" | "glass" | "outline";

export type HeroButtonSize = "sm" | "md" | "lg";

export type HeroRounded = "md" | "lg" | "xl" | "full";

export type HeroIconName =
  | "none"
  | "arrowLeft"
  | "arrowRight"
  | "star"
  | "sparkles"
  | "shoppingBag"
  | "flame"
  | "heart"
  | "tag";

export type HeroIconPosition = "start" | "end";

/** Text fill: a flat color, or a clipped gradient (the "وکسینا" treatment). */
export interface HeroColorStyle {
  mode: HeroColorMode;
  /** Used when mode === "solid". */
  color: string;
  /** Used when mode === "gradient". */
  from: string;
  /** Optional middle stop; empty string means a two-stop gradient. */
  via: string;
  to: string;
  direction: HeroGradientDirection;
  /** 0–100. */
  opacity: number;
}

export interface HeroBadgeStyle {
  showDot: boolean;
  dotColor: string;
  pulseDot: boolean;
  background: string;
  /** 0–100. */
  backgroundOpacity: number;
  borderColor: string;
  /** 0–100. */
  borderOpacity: number;
  blur: boolean;
}

export interface HeroButtonStyle {
  href: string;
  variant: HeroButtonVariant;
  /** Gradient start / solid + glass fill. */
  from: string;
  /** Gradient end (ignored by non-gradient variants). */
  to: string;
  /** 0–100, applied to the fill of solid/glass variants. */
  backgroundOpacity: number;
  textColor: string;
  borderColor: string;
  /** 0–100. */
  borderOpacity: number;
  blur: boolean;
  rounded: HeroRounded;
  size: HeroButtonSize;
  icon: HeroIconName;
  iconPosition: HeroIconPosition;
  iconColor: string;
  /** Stretch to the full row width on mobile, like the original CTAs. */
  fullWidthMobile: boolean;
}

/**
 * One inline-styled run of text within a heading/paragraph element.
 *
 * Segments render as consecutive `<span>`s on the same line — each keeps the
 * parent element's size/weight/spacing, but picks its own color or gradient.
 * This is how a single word (e.g. a brand name) gets a different treatment
 * than the sentence around it, without breaking the line.
 */
export interface HeroTextSegment {
  id: string;
  text: string;
  color: HeroColorStyle;
}

export interface HeroElement {
  id: string;
  type: HeroElementType;
  text: string;
  visible: boolean;
  size: HeroTextSize;
  weight: HeroFontWeight;
  /** Per-element override of the content box alignment. */
  align: HeroElementAlign;
  /** Gap below this element. */
  spacing: HeroSpacing;
  maxWidth: HeroElementWidth;
  animation: HeroAnimation;
  color: HeroColorStyle;
  /** heading elements only. */
  headingLevel?: HeroHeadingLevel;
  /** badge elements only. */
  badge?: HeroBadgeStyle;
  /** button elements only. */
  button?: HeroButtonStyle;
  /**
   * heading/paragraph only. When present and non-empty, these render instead
   * of `text`/`color` — each segment keeps its own color on the same line.
   */
  segments?: HeroTextSegment[];
}

/** Section background gradient behind the image. */
export interface HeroBackgroundStyle {
  from: string;
  via: string;
  to: string;
  direction: HeroGradientDirection;
}

/** Tinted gradient layered on top of the image. */
export interface HeroOverlayStyle {
  enabled: boolean;
  from: string;
  via: string;
  to: string;
  direction: HeroGradientDirection;
  /** 0–100. */
  opacity: number;
}

export interface HeroContent {
  /** When false the hero renders image + overlay only. */
  enabled: boolean;
  elements: HeroElement[];
  /** Placement of the content box inside the hero. */
  verticalPosition: HeroVerticalPosition;
  horizontalPosition: HeroAlign;
  /** Default text alignment inside the content box. */
  textAlign: HeroAlign;
  maxWidth: HeroBoxWidth;
  /** Fine-tuning nudge, percent of the hero box. -50..50. */
  offsetX: number;
  offsetY: number;
  /** The two blurred decorative blobs in the corners. */
  showDecorations: boolean;
  background: HeroBackgroundStyle;
  overlay: HeroOverlayStyle;
  /** 0–100. */
  imageOpacity: number;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_COLOR_STYLE: HeroColorStyle = {
  mode: "solid",
  color: "#ffffff",
  from: "#22d3ee",
  via: "#60a5fa",
  to: "#c084fc",
  direction: "to-r",
  opacity: 100,
};

export const DEFAULT_BADGE_STYLE: HeroBadgeStyle = {
  showDot: true,
  dotColor: "#4ade80",
  pulseDot: true,
  background: "#ffffff",
  backgroundOpacity: 10,
  borderColor: "#ffffff",
  borderOpacity: 20,
  blur: true,
};

export const DEFAULT_BUTTON_STYLE: HeroButtonStyle = {
  href: "/",
  variant: "gradient",
  from: "#06b6d4",
  to: "#2563eb",
  backgroundOpacity: 100,
  textColor: "#ffffff",
  borderColor: "#ffffff",
  borderOpacity: 30,
  blur: false,
  rounded: "full",
  size: "lg",
  icon: "none",
  iconPosition: "end",
  iconColor: "#ffffff",
  fullWidthMobile: true,
};

export const DEFAULT_BACKGROUND_STYLE: HeroBackgroundStyle = {
  from: "#111827",
  via: "#1e3a8a",
  to: "#111827",
  direction: "to-br",
};

export const DEFAULT_OVERLAY_STYLE: HeroOverlayStyle = {
  enabled: true,
  from: "#2563eb",
  via: "#9333ea",
  to: "#db2777",
  direction: "to-br",
  opacity: 10,
};

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Blank text run, used by the admin "add segment" action. */
export function createHeroTextSegment(text = ""): HeroTextSegment {
  return { id: randomId("seg"), text, color: { ...DEFAULT_COLOR_STYLE } };
}

/** Blank element of a given type, used by the admin "add element" action. */
export function createHeroElement(type: HeroElementType): HeroElement {
  const id = randomId("el");

  const base: HeroElement = {
    id,
    type,
    text: "",
    visible: true,
    size: "md",
    weight: "normal",
    align: "inherit",
    spacing: "md",
    maxWidth: "auto",
    animation: "slideUp",
    color: { ...DEFAULT_COLOR_STYLE },
  };

  switch (type) {
    case "badge":
      return {
        ...base,
        text: "متن نشان",
        size: "sm",
        weight: "medium",
        badge: { ...DEFAULT_BADGE_STYLE },
      };
    case "heading":
      return {
        ...base,
        text: "عنوان هیرو",
        size: "3xl",
        weight: "bold",
        headingLevel: "h2",
      };
    case "button":
      return {
        ...base,
        text: "دکمه",
        size: "md",
        weight: "medium",
        spacing: "none",
        button: { ...DEFAULT_BUTTON_STYLE },
      };
    case "paragraph":
    default:
      return { ...base, text: "متن توضیحات", maxWidth: "md" };
  }
}

/**
 * The original hardcoded homepage hero, expressed in the content model.
 *
 * Used as the fallback for hero records saved before content authoring existed,
 * and as the starting point when an admin creates a new hero.
 */
export const DEFAULT_HERO_CONTENT: HeroContent = {
  enabled: true,
  verticalPosition: "center",
  horizontalPosition: "center",
  textAlign: "center",
  maxWidth: "xl",
  offsetX: 0,
  offsetY: 0,
  showDecorations: true,
  background: { ...DEFAULT_BACKGROUND_STYLE },
  overlay: { ...DEFAULT_OVERLAY_STYLE },
  imageOpacity: 30,
  elements: [
    {
      id: "default-badge",
      type: "badge",
      text: "کالکشن جدید",
      visible: true,
      size: "sm",
      weight: "medium",
      align: "inherit",
      spacing: "md",
      maxWidth: "auto",
      animation: "slideUp",
      color: { ...DEFAULT_COLOR_STYLE, opacity: 90 },
      badge: { ...DEFAULT_BADGE_STYLE },
    },
    {
      id: "default-title",
      type: "heading",
      text: "فروشگاه اینترنتی لباس و پوشاک",
      visible: true,
      size: "3xl",
      weight: "bold",
      align: "inherit",
      spacing: "xs",
      maxWidth: "auto",
      animation: "slideUp",
      color: { ...DEFAULT_COLOR_STYLE },
      headingLevel: "h1",
    },
    {
      id: "default-brand",
      type: "heading",
      text: "وکسینا",
      visible: true,
      size: "3xl",
      weight: "bold",
      align: "inherit",
      spacing: "md",
      maxWidth: "auto",
      animation: "slideUp",
      color: {
        mode: "gradient",
        color: "#ffffff",
        from: "#22d3ee",
        via: "#60a5fa",
        to: "#c084fc",
        direction: "to-r",
        opacity: 100,
      },
      headingLevel: "div",
    },
    {
      id: "default-subtitle",
      type: "paragraph",
      text: "با جدیدترین ترندهای مد تابستانی، استایل منحصر به فرد خود را خلق کنید",
      visible: true,
      size: "md",
      weight: "normal",
      align: "inherit",
      spacing: "lg",
      maxWidth: "md",
      animation: "slideUp",
      color: { ...DEFAULT_COLOR_STYLE, opacity: 80 },
    },
    {
      id: "default-cta-primary",
      type: "button",
      text: "مشاهده کالکشن",
      visible: true,
      size: "md",
      weight: "medium",
      align: "inherit",
      spacing: "none",
      maxWidth: "auto",
      animation: "slideUp",
      color: { ...DEFAULT_COLOR_STYLE },
      button: {
        ...DEFAULT_BUTTON_STYLE,
        href: "/collection",
        variant: "gradient",
        from: "#06b6d4",
        to: "#2563eb",
        icon: "arrowLeft",
        iconPosition: "end",
      },
    },
    {
      id: "default-cta-secondary",
      type: "button",
      text: "پرفروش‌ترین‌ها",
      visible: true,
      size: "md",
      weight: "medium",
      align: "inherit",
      spacing: "none",
      maxWidth: "auto",
      animation: "slideUp",
      color: { ...DEFAULT_COLOR_STYLE },
      button: {
        ...DEFAULT_BUTTON_STYLE,
        href: "/categories/trending",
        variant: "glass",
        from: "#ffffff",
        backgroundOpacity: 10,
        borderColor: "#ffffff",
        borderOpacity: 30,
        blur: true,
        icon: "star",
        iconPosition: "end",
        iconColor: "#facc15",
      },
    },
  ],
};

/** Deep clone so callers can mutate freely without touching the shared default. */
export function cloneHeroContent(content: HeroContent): HeroContent {
  return {
    ...content,
    background: { ...content.background },
    overlay: { ...content.overlay },
    elements: content.elements.map((element) => ({
      ...element,
      color: { ...element.color },
      badge: element.badge ? { ...element.badge } : undefined,
      button: element.button ? { ...element.button } : undefined,
      segments: element.segments?.map((segment) => ({ ...segment, color: { ...segment.color } })),
    })),
  };
}

/**
 * Fills in anything a stored record is missing so older documents (and content
 * written by an earlier version of the editor) always render.
 */
export function normalizeHeroContent(content?: HeroContent | null): HeroContent {
  if (!content) {
    return cloneHeroContent(DEFAULT_HERO_CONTENT);
  }

  const fallback = DEFAULT_HERO_CONTENT;

  return {
    enabled: content.enabled ?? fallback.enabled,
    verticalPosition: content.verticalPosition ?? fallback.verticalPosition,
    horizontalPosition: content.horizontalPosition ?? fallback.horizontalPosition,
    textAlign: content.textAlign ?? fallback.textAlign,
    maxWidth: content.maxWidth ?? fallback.maxWidth,
    offsetX: content.offsetX ?? 0,
    offsetY: content.offsetY ?? 0,
    showDecorations: content.showDecorations ?? fallback.showDecorations,
    imageOpacity: content.imageOpacity ?? fallback.imageOpacity,
    background: { ...fallback.background, ...(content.background || {}) },
    overlay: { ...fallback.overlay, ...(content.overlay || {}) },
    elements: (content.elements || []).map((element) => ({
      ...element,
      visible: element.visible ?? true,
      align: element.align ?? "inherit",
      spacing: element.spacing ?? "md",
      maxWidth: element.maxWidth ?? "auto",
      animation: element.animation ?? "none",
      color: { ...DEFAULT_COLOR_STYLE, ...(element.color || {}) },
      badge:
        element.type === "badge"
          ? { ...DEFAULT_BADGE_STYLE, ...(element.badge || {}) }
          : element.badge,
      button:
        element.type === "button"
          ? { ...DEFAULT_BUTTON_STYLE, ...(element.button || {}) }
          : element.button,
      segments:
        (element.type === "heading" || element.type === "paragraph") && element.segments?.length
          ? element.segments.map((segment) => ({
              id: segment.id || randomId("seg"),
              text: segment.text ?? "",
              color: { ...DEFAULT_COLOR_STYLE, ...(segment.color || {}) },
            }))
          : undefined,
    })),
  };
}
