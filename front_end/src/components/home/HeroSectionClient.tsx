"use client";

import React, { useEffect, useState } from "react";
import { getImageProps } from "next/image";
import {
  HeroImage,
  DEFAULT_GRADIENT,
  DEFAULT_OVERLAY_GRADIENT,
  DEFAULT_HERO_CONTENT,
  normalizeHeroContent,
} from "@/types/hero-image";
import HeroContentLayer from "./HeroContentLayer";
import HeroDecorations from "./HeroDecorations";
import { buildGradient } from "./hero-styles";

interface HeroSectionClientProps {
  heroImages: HeroImage[];
}

interface HeroSlide {
  key: string;
  displayOrder: number;
  desktopImage: HeroImage | null;
  mobileImage: HeroImage | null;
}

const ROTATION_INTERVAL_MS = 7000;

/** Pair the desktop and mobile records that represent one ordered hero design. */
function buildHeroSlides(heroImages: HeroImage[]): HeroSlide[] {
  const grouped = new Map<number, HeroSlide>();

  for (const heroImage of heroImages) {
    if (!heroImage.isActive) continue;

    const existing = grouped.get(heroImage.displayOrder);
    if (existing) {
      if (heroImage.deviceType === "desktop" && !existing.desktopImage) {
        existing.desktopImage = heroImage;
      }
      if (heroImage.deviceType === "mobile" && !existing.mobileImage) {
        existing.mobileImage = heroImage;
      }
      continue;
    }

    grouped.set(heroImage.displayOrder, {
      key: `hero-${heroImage.displayOrder}`,
      displayOrder: heroImage.displayOrder,
      desktopImage: heroImage.deviceType === "desktop" ? heroImage : null,
      mobileImage: heroImage.deviceType === "mobile" ? heroImage : null,
    });
  }

  const slides = Array.from(grouped.values()).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return slides.length > 0
    ? slides
    : [{ key: "hero-fallback", displayOrder: 0, desktopImage: null, mobileImage: null }];
}

function getOverlayGradient(heroImage: HeroImage | null | undefined): string {
  if (!heroImage) {
    return DEFAULT_OVERLAY_GRADIENT;
  }
  if (heroImage.noGradient) {
    return "";
  }
  if (heroImage.gradient && heroImage.gradient.trim() !== "") {
    return heroImage.gradient;
  }
  return DEFAULT_OVERLAY_GRADIENT;
}

function getImageOpacity(heroImage: HeroImage | null | undefined): string {
  if (heroImage?.noGradient) {
    return "opacity-100";
  }
  return "opacity-30";
}

interface HeroSlideViewProps {
  slide: HeroSlide;
  active: boolean;
  first: boolean;
}

function HeroSlideView({ slide, active, first }: HeroSlideViewProps) {
  const { desktopImage, mobileImage } = slide;

  /**
   * Content is authored once per hero. The desktop record wins so the same copy
   * renders on both breakpoints — duplicating it per device would put two <h1>
   * elements in the DOM. Records saved before content authoring existed keep
   * their legacy gradient-class behaviour untouched.
   */
  const authoredContent = desktopImage?.content || mobileImage?.content || null;
  const content = normalizeHeroContent(authoredContent || DEFAULT_HERO_CONTENT);
  const isLegacyStyling = !authoredContent;

  const desktopOverlay = getOverlayGradient(desktopImage);
  const mobileOverlay = getOverlayGradient(mobileImage);
  const desktopImageOpacity = getImageOpacity(desktopImage);
  const mobileImageOpacity = getImageOpacity(mobileImage);

  const desktopImageProps = desktopImage
    ? getImageProps({
        src: desktopImage.image,
        alt: "Hero banner desktop",
        width: 1920,
        height: 1080,
        sizes: "100vw",
        quality: 75,
        priority: first,
      }).props
    : null;
  const mobileImageProps = mobileImage
    ? getImageProps({
        src: mobileImage.image,
        alt: "Hero banner mobile",
        width: 768,
        height: 1024,
        sizes: "100vw",
        quality: 70,
        priority: first,
      }).props
    : null;
  const legacyImageOpacityClass =
    desktopImageOpacity === mobileImageOpacity
      ? desktopImageOpacity
      : desktopImageOpacity === "opacity-100"
        ? "opacity-30 md:opacity-100"
        : "opacity-100 md:opacity-30";

  const sectionBackground = isLegacyStyling
    ? undefined
    : {
        backgroundImage: buildGradient(
          content.background.direction,
          content.background.from,
          content.background.via,
          content.background.to
        ),
      };

  return (
    <div
      className="hero-slide absolute inset-0"
      aria-hidden={!active}
      style={{
        opacity: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div className="absolute inset-0" style={sectionBackground}>
        {/* Only the first slide is preloaded; the remaining slides can fill the cache naturally. */}
        {first && desktopImageProps && (
          <link
            rel="preload"
            as="image"
            href={desktopImageProps.src}
            imageSrcSet={desktopImageProps.srcSet}
            imageSizes="100vw"
            media="(min-width: 768px)"
          />
        )}
        {first && mobileImageProps && (
          <link
            rel="preload"
            as="image"
            href={mobileImageProps.src}
            imageSrcSet={mobileImageProps.srcSet}
            imageSizes="100vw"
            media="(max-width: 767px)"
          />
        )}
        {(desktopImageProps || mobileImageProps) && (
          <div className="absolute inset-0 md:bg-fixed">
            <picture>
              {mobileImageProps && (
                <source
                  media="(max-width: 767px)"
                  srcSet={mobileImageProps.srcSet}
                  sizes="100vw"
                />
              )}
              <img
                {...(desktopImageProps || mobileImageProps)!}
                alt={desktopImage ? "Hero banner desktop" : "Hero banner mobile"}
                className={`absolute inset-0 h-full w-full object-cover ${
                  isLegacyStyling ? legacyImageOpacityClass : ""
                }`}
                style={isLegacyStyling ? undefined : { opacity: content.imageOpacity / 100 }}
              />
            </picture>

            {isLegacyStyling ? (
              <>
                {mobileOverlay && (
                  <div className={`absolute inset-0 z-10 opacity-50 md:hidden ${mobileOverlay}`} />
                )}
                {desktopOverlay && (
                  <div className={`absolute inset-0 z-10 hidden opacity-50 md:block ${desktopOverlay}`} />
                )}
              </>
            ) : (
              content.overlay.enabled && (
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
              )
            )}
          </div>
        )}
      </div>

      {content.showDecorations && <HeroDecorations />}

      <HeroContentLayer content={content} active={active} interactive={active} />
    </div>
  );
}

const HeroSectionClient: React.FC<HeroSectionClientProps> = ({ heroImages }) => {
  const slides = buildHeroSlides(heroImages);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || isPaused || prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, prefersReducedMotion, slides.length]);

  const pauseRotation = () => setIsPaused(true);
  const resumeRotation = () => setIsPaused(false);

  return (
    <section
      className={`relative max-w-7xl mx-4 sm:mx-6 lg:mx-auto rounded-lg sm:rounded-xl md:rounded-2xl mb-6 sm:mb-8 md:mb-10 py-4 sm:py-5 md:py-6 aspect-[3/4] md:aspect-video flex items-center overflow-hidden animate-heroReveal ${DEFAULT_GRADIENT}`}
      role="region"
      aria-label="بنرهای ویژه"
      onMouseEnter={pauseRotation}
      onMouseLeave={resumeRotation}
      onFocusCapture={pauseRotation}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          resumeRotation();
        }
      }}
    >
      {slides.map((slide, index) => (
        <HeroSlideView
          key={slide.key}
          slide={slide}
          active={index === activeIndex}
          first={index === 0}
        />
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-md">
          {slides.map((slide, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={slide.key}
                type="button"
                aria-label={`نمایش بنر ${index + 1}`}
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  setActiveIndex(index);
                  setIsPaused(true);
                }}
                className={`h-2 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-white/80 ${
                  active ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HeroSectionClient;
