"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { getHeadingItems } from "@/lib/blog-blocks";
import type { BlogBlock } from "@/types/blog";
import { cn } from "@/lib/utils";

interface ArticleTOCProps {
  blocks: BlogBlock[];
}

const HEADER_OFFSET = 96;

/**
 * Sticky scroll-spy table of contents for the article (desktop only — on
 * mobile it would just eat space above content the reader hasn't seen yet).
 * Highlights the heading currently in view and smooth-scrolls to a heading
 * on click via ScrollToPlugin.
 */
export default function ArticleTOC({ blocks }: ArticleTOCProps) {
  const items = getHeadingItems(blocks);
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useGSAP(
    () => {
      if (items.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const triggers = items
          .map(({ id }) => {
            const el = document.getElementById(id);
            if (!el) return null;
            return ScrollTrigger.create({
              trigger: el,
              start: "top 40%",
              end: "bottom 40%",
              onToggle: (self) => {
                if (self.isActive) setActiveId(id);
              },
            });
          })
          .filter((st): st is ScrollTrigger => st !== null);

        return () => triggers.forEach((st) => st.kill());
      });

      return () => mm.revert();
    },
    { scope: navRef, dependencies: [items.length] }
  );

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    gsap.to(window, {
      duration: 0.8,
      ease: "power2.inOut",
      scrollTo: { y: el, offsetY: HEADER_OFFSET },
    });
  };

  return (
    <nav
      ref={navRef}
      className="hidden rounded-2xl bg-white p-5 shadow-soft lg:block"
      aria-label="فهرست مطالب"
    >
      <h3 className="mb-3 text-sm font-bold text-voxcina-blue">فهرست مطالب</h3>
      <ul className="space-y-1 border-r-2 border-secondary-200 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => handleClick(item.id)}
              className={cn(
                "-mr-0.5 block w-full border-r-2 py-1.5 pr-3 text-right transition-colors",
                item.level === 3 && "pr-5 text-xs",
                item.level === 4 && "pr-7 text-xs",
                activeId === item.id
                  ? "border-voxcina-blue font-medium text-voxcina-blue"
                  : "border-transparent text-gray-500 hover:text-voxcina-blue"
              )}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
