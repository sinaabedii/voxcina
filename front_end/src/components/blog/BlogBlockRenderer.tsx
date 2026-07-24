"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { BlogBlock as BlogBlockType } from "@/types/blog";
import { getBlockId } from "@/lib/blog-blocks";

interface BlogBlockRendererProps {
  blocks: BlogBlockType[];
}

/**
 * Renders a post's typed block stream and animates each block into view as
 * the reader scrolls to it — headings get an animated accent underline,
 * images settle in with a slight scale, text/other blocks fade + lift.
 * Batched via ScrollTrigger.batch so a fast scroll reveals a run of blocks
 * together instead of one at a time.
 */
export default function BlogBlockRenderer({ blocks }: BlogBlockRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      const items = container.querySelectorAll<HTMLElement>("[data-block]");
      if (items.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          noPreference: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            gsap.set(items, { autoAlpha: 1, y: 0, scale: 1 });
            container.querySelectorAll<HTMLElement>("[data-heading-accent]").forEach((el) => {
              gsap.set(el, { scaleX: 1 });
            });
            return undefined;
          }

          items.forEach((el) => {
            const isImage = el.dataset.block === "image";
            gsap.set(el, { autoAlpha: 0, y: 28, scale: isImage ? 1.05 : 1 });
          });
          container.querySelectorAll<HTMLElement>("[data-heading-accent]").forEach((el) => {
            gsap.set(el, { scaleX: 0, transformOrigin: "right center" });
          });

          const batches = ScrollTrigger.batch(items, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                ease: "power2.out",
                stagger: 0.1,
                overwrite: true,
                onComplete: () => {
                  batch.forEach((el) => {
                    const accent = el.querySelector<HTMLElement>("[data-heading-accent]");
                    if (accent) {
                      gsap.to(accent, { scaleX: 1, duration: 0.6, ease: "power2.out" });
                    }
                  });
                },
              });
            },
          });

          return () => batches.forEach((st) => st.kill());
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [blocks.length] }
  );

  return (
    <div ref={containerRef} className="space-y-6">
      {blocks.map((block, index) => (
        <BlogBlockItem key={block.id || index} block={block} index={index} />
      ))}
    </div>
  );
}

function BlogBlockItem({ block, index }: { block: BlogBlockType; index: number }) {
  const id = getBlockId(block, index);

  switch (block.type) {
    case "title":
      return null; // rendered by BlogHero instead

    case "header":
      return (
        <h2
          id={id}
          data-block="header"
          className="mt-8 mb-4 scroll-mt-28 break-words text-2xl font-bold text-voxcina-blue md:text-3xl"
        >
          {block.text}
          <span data-heading-accent className="mt-2 block h-1 w-16 rounded-full bg-primary-300" />
        </h2>
      );

    case "section":
      return (
        <h3
          id={id}
          data-block="section"
          className="mt-6 mb-3 scroll-mt-28 break-words text-xl font-bold text-voxcina-blue md:text-2xl"
        >
          {block.text}
          <span data-heading-accent className="mt-1.5 block h-0.5 w-12 rounded-full bg-primary-300" />
        </h3>
      );

    case "subsection":
      return (
        <h4
          id={id}
          data-block="subsection"
          className="mt-4 mb-2 scroll-mt-28 break-words text-lg font-bold text-voxcina-blue md:text-xl"
        >
          {block.text}
        </h4>
      );

    case "text":
      return (
        <p data-block="text" className="break-words text-base leading-relaxed text-gray-900 md:text-lg">
          {block.text}
        </p>
      );

    case "image":
      return (
        <figure data-block="image" className="my-6">
          {block.imageId ? (
            <>
              <div className="relative h-[300px] w-full overflow-hidden rounded-xl sm:h-[400px] md:h-[500px]">
                <Image
                  src={block.imageId}
                  alt={block.alt || "article image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
                />
              </div>
              {block.caption && (
                <figcaption className="mt-2 text-center text-sm text-gray-600">
                  {block.caption}
                </figcaption>
              )}
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl bg-gray-200 text-gray-500 sm:h-[400px] md:h-[500px]">
              Image not uploaded
            </div>
          )}
        </figure>
      );

    default:
      return null;
  }
}
