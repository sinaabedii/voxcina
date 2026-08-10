import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import type {
  HeroAlign,
  HeroContent,
  HeroElement,
  HeroIconName,
} from "@/types/hero-image";
import {
  ANIMATION_CLASSES,
  BOX_WIDTH_CLASSES,
  BUTTON_SIZE_CLASSES,
  ELEMENT_WIDTH_CLASSES,
  FONT_WEIGHT_CLASSES,
  HORIZONTAL_POSITION_CLASSES,
  ROUNDED_CLASSES,
  ROW_JUSTIFY_CLASSES,
  SELF_ALIGN_CLASSES,
  SPACING_CLASSES,
  TEXT_ALIGN_CLASSES,
  TEXT_SIZE_CLASSES,
  VERTICAL_POSITION_CLASSES,
  buildGradient,
  resolveAlign,
  resolveTextStyle,
  sanitizeHeroHref,
  withAlpha,
} from "./hero-styles";

/**
 * Renders admin-authored hero content.
 *
 * Shared by the public hero (`HeroSectionClient`) and the admin live preview so
 * the editor is genuinely WYSIWYG — there is only one implementation of the
 * layout rules. Pure and hook-free, so it also works inside Server Components.
 */

const ICONS: Record<Exclude<HeroIconName, "none">, React.ComponentType<{ className?: string }>> = {
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  star: Star,
  sparkles: Sparkles,
  shoppingBag: ShoppingBag,
  flame: Flame,
  heart: Heart,
  tag: Tag,
};

export const HERO_ICON_NAMES: HeroIconName[] = [
  "none",
  "arrowLeft",
  "arrowRight",
  "star",
  "sparkles",
  "shoppingBag",
  "flame",
  "heart",
  "tag",
];

function HeroIcon({ name, color }: { name: HeroIconName; color: string }) {
  if (name === "none") return null;
  const Icon = ICONS[name];
  if (!Icon) return null;
  return (
    <span style={{ color }} className="inline-flex shrink-0">
      <Icon className="w-[1em] h-[1em]" />
    </span>
  );
}

function cx(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Element renderers
// ---------------------------------------------------------------------------

function BadgeElement({ element }: { element: HeroElement }) {
  const badge = element.badge;
  if (!badge) return null;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border font-medium",
        TEXT_SIZE_CLASSES[element.size],
        FONT_WEIGHT_CLASSES[element.weight],
        badge.blur && "backdrop-blur-md"
      )}
      style={{
        backgroundColor: withAlpha(badge.background, badge.backgroundOpacity),
        borderColor: withAlpha(badge.borderColor, badge.borderOpacity),
      }}
    >
      {badge.showDot && (
        <span
          className={cx(
            "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0",
            badge.pulseDot && "animate-pulse"
          )}
          style={{ backgroundColor: badge.dotColor }}
        />
      )}
      <span style={resolveTextStyle(element.color)}>{element.text}</span>
    </span>
  );
}

/**
 * Renders an element's text as one or more inline-styled runs.
 *
 * When `segments` is set, each run gets its own color/gradient but stays on
 * the same line as its siblings — e.g. one word in a headline picked out
 * with a gradient while the rest stays plain. Falls back to the element's
 * single `text`/`color` otherwise. Each run is `inline-block` so a gradient
 * fill clips to just that run's own box, not the whole (possibly wrapped)
 * line — but `inline-block` boxes trim leading/trailing whitespace of their
 * *own* content by default, which would silently eat a space an admin types
 * at the edge of a segment. `whiteSpace: "pre"` disables that collapsing so
 * spaces are preserved exactly as typed; it doesn't stop the line itself
 * from wrapping between segments, since that break can still happen at each
 * inline-block's own boundary.
 */
function ElementText({ element }: { element: HeroElement }) {
  if (element.segments && element.segments.length > 0) {
    return (
      <>
        {element.segments.map((segment) => (
          <span
            key={segment.id}
            className="inline-block"
            style={{ ...resolveTextStyle(segment.color), whiteSpace: "pre" }}
          >
            {segment.text}
          </span>
        ))}
      </>
    );
  }

  return (
    <span className="inline-block" style={{ ...resolveTextStyle(element.color), whiteSpace: "pre" }}>
      {element.text}
    </span>
  );
}

function HeadingElement({ element }: { element: HeroElement }) {
  const Tag = (element.headingLevel || "h2") as keyof JSX.IntrinsicElements;

  return (
    <Tag
      className={cx(
        "leading-tight",
        TEXT_SIZE_CLASSES[element.size],
        FONT_WEIGHT_CLASSES[element.weight],
        ELEMENT_WIDTH_CLASSES[element.maxWidth]
      )}
    >
      <ElementText element={element} />
    </Tag>
  );
}

function ParagraphElement({ element }: { element: HeroElement }) {
  return (
    <p
      className={cx(
        "leading-relaxed",
        TEXT_SIZE_CLASSES[element.size],
        FONT_WEIGHT_CLASSES[element.weight],
        ELEMENT_WIDTH_CLASSES[element.maxWidth]
      )}
    >
      <ElementText element={element} />
    </p>
  );
}

function ButtonElement({ element, preview }: { element: HeroElement; preview: boolean }) {
  const button = element.button;
  if (!button) return null;

  // Only glass/outline actually show a border; gradient/solid paint the
  // whole shape as background. Giving those two a "transparent" border
  // instead of no border at all is what causes the artifact: a border and a
  // rounded gradient/solid background are anti-aliased as separate layers,
  // and on a pill shape (rounded-full) their curves diverge most right at
  // the semicircular tips — the two ends where the radius is tightest —
  // leaving a faint seam exactly there. Not rendering a border for those
  // variants removes the second layer entirely, so there's nothing to seam.
  const hasBorder = button.variant === "glass" || button.variant === "outline";

  const style: React.CSSProperties = {
    color: button.textColor,
  };

  if (hasBorder) {
    style.borderColor = withAlpha(button.borderColor, button.borderOpacity);
  }

  switch (button.variant) {
    case "gradient":
      style.backgroundImage = buildGradient(element.color.direction, button.from, "", button.to);
      break;
    case "solid":
      style.backgroundColor = withAlpha(button.from, button.backgroundOpacity);
      break;
    case "glass":
      style.backgroundColor = withAlpha(button.from, button.backgroundOpacity);
      break;
    case "outline":
      style.backgroundColor = "transparent";
      break;
  }

  const className = cx(
    "relative inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1",
    hasBorder ? "border-2" : "border-0",
    BUTTON_SIZE_CLASSES[button.size],
    ROUNDED_CLASSES[button.rounded],
    FONT_WEIGHT_CLASSES[element.weight],
    button.blur && "backdrop-blur-md",
    button.fullWidthMobile ? "w-full sm:w-auto" : "w-auto"
  );

  const inner = (
    <>
      {button.iconPosition === "start" && <HeroIcon name={button.icon} color={button.iconColor} />}
      <span>{element.text}</span>
      {button.iconPosition === "end" && <HeroIcon name={button.icon} color={button.iconColor} />}
    </>
  );

  // The preview must never navigate away from the admin form.
  if (preview) {
    return (
      <span className={className} style={style}>
        {inner}
      </span>
    );
  }

  return (
    <Link href={sanitizeHeroHref(button.href)} className={className} style={style}>
      {inner}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

type HeroGroup =
  | { kind: "single"; element: HeroElement }
  | { kind: "buttons"; elements: HeroElement[] };

/** Consecutive buttons share one flex row, matching the original CTA pair. */
function groupElements(elements: HeroElement[]): HeroGroup[] {
  const groups: HeroGroup[] = [];

  for (const element of elements) {
    if (element.type === "button") {
      const last = groups[groups.length - 1];
      if (last && last.kind === "buttons") {
        last.elements.push(element);
        continue;
      }
      groups.push({ kind: "buttons", elements: [element] });
      continue;
    }
    groups.push({ kind: "single", element });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

interface HeroContentLayerProps {
  content: HeroContent;
  /** Renders buttons as inert spans and disables entry animations. */
  preview?: boolean;
  /** Only the visible slide should replay its element entry animations. */
  active?: boolean;
  /** Inactive slides must not leave keyboard-focusable links behind. */
  interactive?: boolean;
}

export default function HeroContentLayer({
  content,
  preview = false,
  active = true,
  interactive = true,
}: HeroContentLayerProps) {
  if (!content.enabled) return null;

  const visible = content.elements.filter((element) => element.visible && element.type);
  if (visible.length === 0) return null;

  const boxAlign: HeroAlign = content.textAlign;
  const groups = groupElements(visible);

  const animation = (element: HeroElement) =>
    preview || !active ? "" : ANIMATION_CLASSES[element.animation] || "";

  return (
    <div
      className={cx(
        "absolute inset-0 z-10 flex px-4 sm:px-6 lg:px-8 py-6",
        VERTICAL_POSITION_CLASSES[content.verticalPosition],
        HORIZONTAL_POSITION_CLASSES[content.horizontalPosition]
      )}
    >
      <div
        className={cx(
          "flex flex-col w-full",
          BOX_WIDTH_CLASSES[content.maxWidth],
          TEXT_ALIGN_CLASSES[content.textAlign],
          SELF_ALIGN_CLASSES[content.textAlign]
        )}
        style={
          content.offsetX || content.offsetY
            ? { transform: `translate(${content.offsetX}%, ${content.offsetY}%)` }
            : undefined
        }
      >
        {groups.map((group, index) => {
          if (group.kind === "buttons") {
            const first = group.elements[0];
            const rowAlign = resolveAlign(first.align, boxAlign);
            return (
              <div
                key={first.id || `buttons-${index}`}
                className={cx(
                  "flex flex-col sm:flex-row gap-3 sm:gap-4 items-center w-full",
                  ROW_JUSTIFY_CLASSES[rowAlign],
                  SPACING_CLASSES[first.spacing],
                  animation(first)
                )}
              >
                {group.elements.map((element) => (
                  <ButtonElement
                    key={element.id}
                    element={element}
                    preview={preview || !interactive}
                  />
                ))}
              </div>
            );
          }

          const { element } = group;
          const align = resolveAlign(element.align, boxAlign);

          return (
            <div
              key={element.id || `element-${index}`}
              className={cx(
                "flex flex-col w-full",
                SELF_ALIGN_CLASSES[align],
                TEXT_ALIGN_CLASSES[align],
                SPACING_CLASSES[element.spacing],
                animation(element)
              )}
            >
              {element.type === "badge" && <BadgeElement element={element} />}
              {element.type === "heading" && <HeadingElement element={element} />}
              {element.type === "paragraph" && <ParagraphElement element={element} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
