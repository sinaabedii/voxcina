import { ContentPosition, OverlayStrength } from "@/types/slider";

/**
 * Presentation rules shared by the public slider and the admin preview.
 *
 * Both need to turn the same stored `contentPosition` / `overlayStrength`
 * values into the same classes. Keeping that mapping here is what lets the
 * admin preview be trustworthy — if it were duplicated, the preview could drift
 * from what visitors actually see.
 *
 * Every returned class string is written literally so Tailwind emits it; see
 * the note in the admin's `gradient-presets.ts` for why that matters.
 */

/** Overlay darkness applied above the slide image and gradient. */
export function overlayClassFor(strength?: OverlayStrength | string): string {
  switch (strength) {
    case "none":
      return "";
    case "light":
      return "bg-gradient-to-t from-black/50 via-black/20 to-transparent";
    case "dark":
      return "bg-gradient-to-t from-black/90 via-black/60 to-transparent";
    default:
      // Matches the look slides had before the field existed.
      return "bg-gradient-to-t from-black/80 via-black/40 to-transparent";
  }
}

/** Flex alignment for the slide's text column. */
export function contentAlignmentFor(position?: ContentPosition | string): string {
  switch (position) {
    case "left":
      return "items-start text-left";
    case "center":
      return "items-center text-center";
    case "right":
    default:
      return "items-end text-right";
  }
}
