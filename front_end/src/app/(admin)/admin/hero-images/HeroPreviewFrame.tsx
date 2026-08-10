"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type PreviewDevice = "desktop" | "mobile";

interface HeroPreviewFrameProps {
  device: PreviewDevice;
  children: React.ReactNode;
}

/**
 * Real device widths, not arbitrary panel sizes.
 *
 * `desktop` sits comfortably above Tailwind's `xl` (1280px) breakpoint —
 * the same tier a real customer's monitor hits — and `mobile` sits below
 * `sm` (640px) so no responsive prefix activates, matching a phone.
 */
const DEVICE_WIDTH: Record<PreviewDevice, number> = {
  desktop: 1440,
  mobile: 390,
};

/** Mirrors the hero section's own `aspect-[3/4] md:aspect-video` classes. */
const DEVICE_RATIO: Record<PreviewDevice, number> = {
  desktop: 9 / 16,
  mobile: 4 / 3,
};

/**
 * Renders `children` inside a same-origin iframe sized to a real device
 * viewport, then visually scales that iframe down to fit the admin panel.
 *
 * Tailwind's `sm:`/`md:`/`lg:`/`xl:` classes key off the browser's actual
 * viewport, not the width of the element they're applied to — shrinking a
 * plain `<div>` to preview a "mobile" layout does nothing, because the
 * admin's own browser window is still desktop-sized. An iframe is the only
 * element that gets its own independent viewport, so it's the only way to
 * make those classes resolve the way they would on the real device.
 *
 * `transform: scale()` (applied to the iframe's box, after layout) is what
 * shrinks it to fit the panel — it does not affect the iframe's internal
 * viewport, so breakpoint evaluation stays tied to the real device width.
 */
export default function HeroPreviewFrame({ device, children }: HeroPreviewFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(0);

  const logicalWidth = DEVICE_WIDTH[device];
  const logicalHeight = Math.round(logicalWidth * DEVICE_RATIO[device]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      const width = wrapper.getBoundingClientRect().width;
      if (width > 0) setScale(width / logicalWidth);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [logicalWidth]);

  // Runs once: prepares the iframe document and hands off a mount point.
  // Later `device` changes only resize the iframe box, which re-evaluates
  // media queries in place — no need to rebuild the document.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setup = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.documentElement.lang = "fa";
      doc.documentElement.dir = "rtl";
      doc.documentElement.style.height = "100%";
      doc.body.style.margin = "0";
      doc.body.style.height = "100%";

      const existingHrefs = new Set(
        Array.from(doc.querySelectorAll("link[rel='stylesheet']")).map((el) =>
          el.getAttribute("href")
        )
      );

      // Mirror the storefront's compiled stylesheets so every utility class
      // (and the IranSansX @font-face rules) resolves identically.
      document.head.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
        if (node.tagName === "LINK") {
          const href = node.getAttribute("href");
          if (!href) return;
          const absoluteHref = new URL(href, window.location.href).href;
          if (existingHrefs.has(absoluteHref)) return;
          const clone = doc.createElement("link");
          clone.rel = "stylesheet";
          clone.href = absoluteHref;
          doc.head.appendChild(clone);
        } else {
          const clone = doc.createElement("style");
          clone.textContent = node.textContent || "";
          doc.head.appendChild(clone);
        }
      });

      let root = doc.getElementById("hero-preview-root");
      if (!root) {
        root = doc.createElement("div");
        root.id = "hero-preview-root";
        doc.body.appendChild(root);
      }
      root.style.height = "100%";
      setMountNode(root);
    };

    if (iframe.contentDocument?.readyState === "complete") {
      setup();
    } else {
      iframe.addEventListener("load", setup);
      return () => iframe.removeEventListener("load", setup);
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden rounded-xl shadow-inner bg-gray-900"
      style={{ aspectRatio: `${logicalWidth} / ${logicalHeight}` }}
    >
      <iframe
        ref={iframeRef}
        title="پیش‌نمایش هیرو"
        tabIndex={-1}
        style={{
          width: logicalWidth,
          height: logicalHeight,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      />
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
}
