/**
 * Curated gradient pairs for slide backgrounds.
 *
 * IMPORTANT: `bgColor` / `accentColor` are Tailwind class fragments that the
 * public slider interpolates (`bg-gradient-to-br ${bgColor}`). Tailwind only
 * emits classes it can see in source at build time, so a gradient typed freely
 * into the admin form would be stored happily and then render as *nothing*.
 * Every value an admin can pick therefore has to appear literally in this file —
 * that is what makes these presets the safe path rather than a convenience.
 */
export interface GradientPreset {
  /** Persian label shown on the swatch. */
  label: string;
  /** Background gradient classes, applied over the slide image. */
  bgColor: string;
  /** Accent gradient classes, used for highlights within the slide. */
  accentColor: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    label: "فروش ویژه",
    bgColor: "from-rose-900 via-pink-800 to-purple-900",
    accentColor: "from-rose-400 to-pink-500",
  },
  {
    label: "پاییز",
    bgColor: "from-amber-900 via-orange-800 to-red-900",
    accentColor: "from-amber-400 to-orange-500",
  },
  {
    label: "شب",
    bgColor: "from-slate-900 via-gray-900 to-black",
    accentColor: "from-slate-400 to-gray-500",
  },
  {
    label: "دریا",
    bgColor: "from-cyan-900 via-blue-800 to-indigo-900",
    accentColor: "from-cyan-400 to-blue-500",
  },
  {
    label: "جنگل",
    bgColor: "from-emerald-900 via-green-800 to-teal-900",
    accentColor: "from-emerald-400 to-green-500",
  },
  {
    label: "غروب",
    bgColor: "from-orange-900 via-red-800 to-rose-900",
    accentColor: "from-orange-400 to-red-500",
  },
  {
    label: "بنفش",
    bgColor: "from-violet-900 via-purple-800 to-fuchsia-900",
    accentColor: "from-violet-400 to-purple-500",
  },
  {
    label: "طلایی",
    bgColor: "from-yellow-900 via-amber-800 to-orange-900",
    accentColor: "from-yellow-400 to-amber-500",
  },
];

export const DEFAULT_GRADIENT = GRADIENT_PRESETS[0];

/** Finds the preset matching a stored bg/accent pair, if any. */
export function findPreset(
  bgColor?: string,
  accentColor?: string
): GradientPreset | undefined {
  return GRADIENT_PRESETS.find(
    (p) => p.bgColor === bgColor && p.accentColor === accentColor
  );
}
