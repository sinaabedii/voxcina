"use client";

import { useState } from "react";
import { Slider } from "@/types/slider";
import { overlayClassFor, contentAlignmentFor } from "@/lib/slider-presentation";

interface SliderPreviewProps {
  slider: Partial<Slider>;
  /** Object URL for a freshly cropped image not yet uploaded. */
  pendingImage?: string | null;
}

/**
 * Live preview of a slide as the admin edits it.
 *
 * Composition mirrors ModernSliderClient — same gradient layering, overlay and
 * content alignment — so what's previewed is what ships. It reads the same
 * `slider-presentation` helpers the public component uses rather than
 * re-deriving the classes, which is what keeps the two from drifting.
 */
export default function SliderPreview({ slider, pendingImage }: SliderPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const image = pendingImage ?? slider.image;
  const alignment = contentAlignmentFor(slider.contentPosition);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">پیش‌نمایش</label>
        <div className="flex gap-1 text-xs">
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDevice(option)}
              className={`px-2 py-1 rounded ${
                device === option ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
            >
              {option === "desktop" ? "دسکتاپ" : "موبایل"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`mx-auto transition-all ${
          device === "mobile" ? "max-w-[320px]" : "w-full"
        }`}
      >
        <div className="relative h-56 rounded-xl overflow-hidden bg-gray-200">
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {slider.bgColor && (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${slider.bgColor} opacity-85`}
            />
          )}
          <div className={`absolute inset-0 ${overlayClassFor(slider.overlayStrength)}`} />

          <div className={`relative h-full p-4 flex flex-col justify-center ${alignment}`}>
            {slider.badge && (
              <span className="inline-block w-fit text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full mb-1">
                {slider.badge}
              </span>
            )}
            {slider.title && (
              <h3 className="text-white text-lg font-bold leading-tight">{slider.title}</h3>
            )}
            {slider.subtitle && (
              <p className="text-white/85 text-xs mt-1">{slider.subtitle}</p>
            )}
            {slider.buttonText && (
              <span className="mt-3 inline-block w-fit bg-white text-gray-900 text-xs px-3 py-1.5 rounded-full font-medium">
                {slider.buttonText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
