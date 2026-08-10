import React from "react";
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
  desktopImage?: HeroImage | null;
  mobileImage?: HeroImage | null;
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

const HeroSectionClient: React.FC<HeroSectionClientProps> = ({
  desktopImage,
  mobileImage,
}) => {
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
        priority: true,
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
        priority: true,
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
    <section
      className={`relative max-w-7xl mx-4 sm:mx-6 lg:mx-auto rounded-lg sm:rounded-xl md:rounded-2xl mb-6 sm:mb-8 md:mb-10 py-4 sm:py-5 md:py-6 aspect-[3/4] md:aspect-video flex items-center overflow-hidden ${
        isLegacyStyling ? DEFAULT_GRADIENT : ""
      }`}
      style={sectionBackground}
    >
      {/* One responsive source prevents the hidden device image from competing with LCP. */}
      {(desktopImageProps || mobileImageProps) && (
        <>
          {desktopImageProps && (
            <link
              rel="preload"
              as="image"
              href={desktopImageProps.src}
              imageSrcSet={desktopImageProps.srcSet}
              imageSizes="100vw"
              media="(min-width: 768px)"
            />
          )}
          {mobileImageProps && (
            <link
              rel="preload"
              as="image"
              href={mobileImageProps.src}
              imageSrcSet={mobileImageProps.srcSet}
              imageSizes="100vw"
              media="(max-width: 767px)"
            />
          )}
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
        </>
      )}

      {content.showDecorations && <HeroDecorations />}

      <HeroContentLayer content={content} />
    </section>
  );
};

export default HeroSectionClient;
