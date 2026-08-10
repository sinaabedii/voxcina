"use client";

import React from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { HeroContent } from "@/types/hero-image";
import HeroContentLayer from "@/components/home/HeroContentLayer";
import HeroDecorations from "@/components/home/HeroDecorations";
import { buildGradient } from "@/components/home/hero-styles";

export type PreviewDevice = "desktop" | "mobile";

interface HeroPreviewProps {
  content: HeroContent;
  imageSrc: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
}

/**
 * Live preview of the hero being edited.
 *
 * Reuses `HeroContentLayer` / `HeroDecorations` — the very components the
 * storefront renders — so what the admin sees here is what ships. Only the
 * outer frame differs: it is scaled to the panel and swaps aspect ratio with
 * the device toggle instead of a media query.
 */
export default function HeroPreview({
  content,
  imageSrc,
  device,
  onDeviceChange,
}: HeroPreviewProps) {
  const aspectClass = device === "desktop" ? "aspect-video" : "aspect-[3/4]";
  const frameClass = device === "desktop" ? "w-full" : "w-full max-w-[280px] mx-auto";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">پیش‌نمایش زنده</h3>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => onDeviceChange("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
              device === "desktop"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            دسکتاپ
          </button>
          <button
            type="button"
            onClick={() => onDeviceChange("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
              device === "mobile"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            موبایل
          </button>
        </div>
      </div>

      <div className={frameClass}>
        <div
          className={`relative ${aspectClass} rounded-xl overflow-hidden shadow-inner`}
          style={{
            backgroundImage: buildGradient(
              content.background.direction,
              content.background.from,
              content.background.via,
              content.background.to
            ),
          }}
        >
          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt="پیش‌نمایش هیرو"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: content.imageOpacity / 100 }}
            />
          )}

          {content.overlay.enabled && (
            <div
              className="absolute inset-0 z-10"
              style={{
                backgroundImage: buildGradient(
                  content.overlay.direction,
                  content.overlay.from,
                  content.overlay.via,
                  content.overlay.to
                ),
                opacity: content.overlay.opacity / 100,
              }}
            />
          )}

          {content.showDecorations && <HeroDecorations />}

          <HeroContentLayer content={content} preview />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        اندازه متن‌ها در پیش‌نمایش نسبت به عرض پنل کوچک‌تر است؛ نسبت‌ها و چیدمان دقیقاً مطابق سایت است.
      </p>
    </div>
  );
}
