"use client";

import React, { useEffect, useState } from "react";
import { getImageProps } from "next/image";
import { Pause, Play } from "lucide-react";
import {
  HeroImage,
  DEFAULT_GRADIENT,
  DEFAULT_OVERLAY_GRADIENT,
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

function getSlideContent(slide: HeroSlide) {
  return normalizeHeroContent(slide.desktopImage?.content || slide.mobileImage?.content || null);
}

function getPrimaryHeading(slides: HeroSlide[]) {
  const slide = slides[0];
  if (!slide) return null;

  const content = getSlideContent(slide);
  const heading = content.enabled
    ? content.elements.find((element) => element.visible && element.type === "heading")
    : undefined;

  if (heading) {
    return { slideKey: slide.key, elementId: heading.id };
  }

  return null;
}

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
  primaryHeading: ReturnType<typeof getPrimaryHeading>;
}

function HeroSlideView({ slide, active, first, primaryHeading }: HeroSlideViewProps) {
  const { desktopImage, mobileImage } = slide;

  /**
   * Content is authored once per hero. The desktop record wins so the same copy
   * renders on both breakpoints — duplicating it per device would put two <h1>
   * elements in the DOM. Records saved before content authoring existed keep
   * their legacy gradient-class behaviour untouched.
   */
  const authoredContent = desktopImage?.content || mobileImage?.content || null;
  const content = getSlideContent(slide);
  const isLegacyStyling = !authoredContent;

  const desktopOverlay = getOverlayGradient(desktopImage);
  const mobileOverlay = getOverlayGradient(mobileImage);
  const desktopImageOpacity = getImageOpacity(desktopImage);
  const mobileImageOpacity = getImageOpacity(mobileImage);

  const desktopImageProps = desktopImage
    ? getImageProps({
        src: desktopImage.image,
        alt: "",
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
        alt: "",
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
                alt=""
                aria-hidden="true"
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

      <HeroContentLayer
        content={content}
        active={active}
        interactive={active}
        seoPrimaryHeadingId={primaryHeading?.elementId}
        isSeoPrimarySlide={primaryHeading?.slideKey === slide.key}
        enforceSingleH1
      />
    </div>
  );
}

const HeroSectionClient: React.FC<HeroSectionClientProps> = ({ heroImages }) => {
  const slides = buildHeroSlides(heroImages);
  const primaryHeading = getPrimaryHeading(slides);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isPointerOver, setIsPointerOver] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentHidden(document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    if (
      slides.length < 2 ||
      isUserPaused ||
      isPointerOver ||
      isFocusWithin ||
      isDocumentHidden ||
      prefersReducedMotion
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isDocumentHidden, isFocusWithin, isPointerOver, isUserPaused, prefersReducedMotion, slides.length]);

  const selectSlide = (index: number) => {
    setActiveIndex(index);
    setIsUserPaused(true);
  };

  return (
    <section
      className={`relative max-w-7xl mx-4 sm:mx-6 lg:mx-auto rounded-lg sm:rounded-xl md:rounded-2xl mb-6 sm:mb-8 md:mb-10 py-4 sm:py-5 md:py-6 aspect-[3/4] md:aspect-video flex items-center overflow-hidden animate-heroReveal ${DEFAULT_GRADIENT}`}
      role="region"
      aria-label="بنرهای ویژه"
      aria-roledescription="اسلایدشو"
      onMouseEnter={() => setIsPointerOver(true)}
      onMouseLeave={() => setIsPointerOver(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-hero-pause]")) {
          setIsFocusWithin(true);
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
        }
      }}
    >
      {slides.map((slide, index) => (
        <HeroSlideView
          key={slide.key}
          slide={slide}
          active={index === activeIndex}
          first={index === 0}
          primaryHeading={primaryHeading}
        />
      ))}

      {!primaryHeading && (
        <h1 className="sr-only">وکسینا، فروشگاه اینترنتی لباس و پوشاک</h1>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/30 px-2 py-1.5 backdrop-blur-md sm:bottom-4 sm:gap-2 sm:px-3 sm:py-2">
          {!prefersReducedMotion && (
            <button
              type="button"
              data-hero-pause
              aria-label={isUserPaused ? "پخش خودکار بنرها" : "توقف خودکار بنرها"}
              aria-pressed={isUserPaused}
              onClick={() => {
                setIsUserPaused((paused) => !paused);
                setIsFocusWithin(false);
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
            >
              {isUserPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            </button>
          )}
          {slides.map((slide, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={slide.key}
                type="button"
                data-hero-control
                aria-label={`نمایش بنر ${index + 1} از ${slides.length}`}
                aria-current={active ? "true" : undefined}
                onClick={() => selectSlide(index)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all duration-500 ${
                    active ? "h-2 w-7 bg-white" : "h-2 w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HeroSectionClient;
