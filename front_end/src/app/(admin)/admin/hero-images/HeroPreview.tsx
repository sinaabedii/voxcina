"use client";

import React from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { HeroContent } from "@/types/hero-image";
import HeroContentLayer from "@/components/home/HeroContentLayer";
import HeroDecorations from "@/components/home/HeroDecorations";
import { buildGradient } from "@/components/home/hero-styles";
import HeroPreviewFrame, { PreviewDevice } from "./HeroPreviewFrame";

interface HeroPreviewProps {
  content: HeroContent;
  imageSrc: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
}

/**
 * Live preview of the hero being edited.
 *
 * The stage markup (image, overlay, decorations, `HeroContentLayer`) is the
 * exact same tree the storefront renders. It's mounted inside
 * `HeroPreviewFrame`'s iframe rather than directly in this panel because
 * Tailwind's `sm:`/`md:`/`lg:`/`xl:` classes key off the real browser
 * viewport — a narrow `<div>` here would still render full desktop-sized
 * text, since the admin's own window is desktop-width regardless of how
 * narrow this panel is. The iframe gets its own viewport, sized to a real
 * device, so text sizing matches what a customer actually sees.
 */
export default function HeroPreview({
  content,
  imageSrc,
  device,
  onDeviceChange,
}: HeroPreviewProps) {
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
        <HeroPreviewFrame device={device}>
          <div
            className="relative w-full h-full"
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
        </HeroPreviewFrame>
      </div>

      <p className="text-xs text-gray-400 text-center">
        این پیش‌نمایش دقیقاً همان اندازه متن و چیدمانی را نشان می‌دهد که در سایت روی دستگاه انتخاب‌شده دیده می‌شود.
      </p>
    </div>
  );
}
