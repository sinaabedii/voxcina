"use client";

import { GRADIENT_PRESETS, findPreset } from "./gradient-presets";

interface GradientDesignerProps {
  bgColor?: string;
  accentColor?: string;
  onChange: (value: { bgColor: string; accentColor: string }) => void;
}

/**
 * Picks the slide's background/accent gradient pair from a curated set.
 *
 * Deliberately not a free colour picker — see the note in `gradient-presets.ts`
 * for why arbitrary Tailwind gradient strings cannot render.
 */
export default function GradientDesigner({
  bgColor,
  accentColor,
  onChange,
}: GradientDesignerProps) {
  const selected = findPreset(bgColor, accentColor);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">طرح رنگ</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {GRADIENT_PRESETS.map((preset) => {
          const isSelected = selected?.label === preset.label;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                onChange({
                  bgColor: preset.bgColor,
                  accentColor: preset.accentColor,
                })
              }
              aria-pressed={isSelected}
              className={`rounded-lg overflow-hidden border-2 transition ${
                isSelected
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <span
                className={`block h-10 bg-gradient-to-br ${preset.bgColor}`}
                aria-hidden="true"
              />
              <span
                className={`block h-1.5 bg-gradient-to-r ${preset.accentColor}`}
                aria-hidden="true"
              />
              <span className="block text-xs py-1 bg-white">{preset.label}</span>
            </button>
          );
        })}
      </div>
      {!selected && (bgColor || accentColor) && (
        <p className="text-xs text-amber-700">
          طرح رنگ فعلی سفارشی است و ممکن است در سایت نمایش داده نشود. یکی از
          طرح‌های بالا را انتخاب کنید.
        </p>
      )}
    </div>
  );
}
