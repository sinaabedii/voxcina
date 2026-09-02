"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap-plugins";
import { BlogPost } from "@/types/blog";
import { CalendarIcon, ClockIcon, ArrowRight as ArrowRightIcon } from "lucide-react";
import AuthorAvatar from "./AuthorAvatar";

interface BlogHeroProps {
  post: BlogPost;
}

/**
 * Full-bleed hero for the blog detail page: parallax cover image behind a
 * SplitText title reveal, with the category/author/date/read-time meta row
 * fading up right after. Mirrors the entrance recipe used in
 * CollectionIntro.tsx (SplitText chars fromTo) but without an exit timeline —
 * this hero just plays once and stays.
 */
export default function BlogHero({ post }: BlogHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const coverImage = post.coverImage || post.coverImageId;

  useGSAP(
    () => {
      const heading = titleRef.current;
      if (!heading) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          noPreference: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            gsap.set([breadcrumbRef.current, heading, metaRef.current], { autoAlpha: 1, y: 0 });
            return undefined;
          }

          // Persian/Arabic script is cursive — splitting into individual `chars`
          // breaks contextual letter shaping (glyphs render disconnected and
          // out of order). Word-level splitting keeps each word's shaping intact.
          const split = SplitText.create(heading, {
            type: "words",
            wordsClass: "blog-hero-word",
          });

          const parallaxTween = imgWrapRef.current
            ? gsap.to(imgWrapRef.current, {
                yPercent: 14,
                ease: "none",
                scrollTrigger: {
                  trigger: heroRef.current,
                  start: "top top",
                  end: "bottom top",
                  scrub: true,
                },
              })
            : null;

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.fromTo(
            breadcrumbRef.current,
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.5 }
          )
            .fromTo(
              split.words,
              { autoAlpha: 0, yPercent: 120, rotationX: -60 },
              {
                autoAlpha: 1,
                yPercent: 0,
                rotationX: 0,
                duration: 0.8,
                stagger: { each: 0.05, from: "start" },
              },
              "-=0.2"
            )
            .fromTo(
              metaRef.current,
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.6 },
              "-=0.4"
            );

          return () => {
            tl.kill();
            parallaxTween?.scrollTrigger?.kill();
            parallaxTween?.kill();
            split.revert();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative isolate flex min-h-[60vh] items-end overflow-hidden sm:min-h-[70vh] lg:-mt-[121px]"
      style={{ perspective: "900px" }}
    >
      <div ref={imgWrapRef} className="absolute inset-x-0 -top-[8%] -z-10 h-[116%] w-full will-change-transform">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={post.title}
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-voxcina-blue" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-voxcina-darkBlue via-voxcina-darkBlue/60 to-voxcina-darkBlue/10" />
      </div>

      <div className="container relative px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-32 md:px-8 md:pb-16">
        <div className="mx-auto max-w-4xl">
          <div
            ref={breadcrumbRef}
            className="mb-4 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:gap-3 sm:text-sm"
          >
            <Link href="/blog" className="flex items-center gap-1 transition-colors hover:text-white">
              <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>بازگشت به بلاگ</span>
            </Link>
            <span className="text-white/40">•</span>
            <Link
              href={`/blog?category=${encodeURIComponent(post.category)}`}
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:px-3"
            >
              {post.category}
            </Link>
          </div>

          <h1
            ref={titleRef}
            className="mb-4 break-words text-2xl font-bold leading-tight text-white sm:text-3xl md:mb-5 md:text-4xl lg:text-5xl"
            style={{ transformStyle: "preserve-3d" }}
          >
            {post.title}
          </h1>

          <div
            ref={metaRef}
            className="flex flex-wrap items-center gap-3 text-xs text-white/85 sm:gap-4 sm:text-sm"
          >
            <div className="flex items-center gap-2">
              <AuthorAvatar
                avatar={post.authorSnapshot?.avatar}
                name={post.authorSnapshot?.name || "تیم وکسینا"}
                className="h-6 w-6 sm:h-8 sm:w-8"
                tone="white"
              />
              <span>{post.authorSnapshot?.name || "تیم وکسینا"}</span>
            </div>

            {formattedDate && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{formattedDate}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{post.readTime} دقیقه مطالعه</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
