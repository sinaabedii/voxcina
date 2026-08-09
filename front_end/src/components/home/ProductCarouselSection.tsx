"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ColorVariantListItem } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";
import { Button, SectionTitle } from "@/components/ui";
import { getCanonicalColor } from "@/lib/product-variants";

interface ProductCarouselSectionProps {
  title: string;
  viewAllHref: string;
  products: ColorVariantListItem[];
  isLoading: boolean;
  className?: string;
}

export default function ProductCarouselSection({
  title,
  viewAllHref,
  products,
  isLoading,
  className,
}: ProductCarouselSectionProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;

    const scrollAmount = 260;
    const currentScroll = sliderRef.current.scrollLeft;
    const nextScroll = direction === "right" ? currentScroll + scrollAmount : currentScroll - scrollAmount;

    sliderRef.current.scrollTo({ left: nextScroll, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;

    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.section
      className={className ?? "container px-4 md:px-8 mb-16 md:mb-24"}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
    >
      <SectionTitle
        title={title}
        size="lg"
        className="mb-8 md:mb-12"
        titleClassName="text-2xl sm:text-3xl font-bold text-voxcina-blue"
        action={
          <Link
            href={viewAllHref}
            rel="nofollow"
            className="text-voxcina-blue hover:text-voxcina-darkBlue flex items-center group transition-all duration-300"
          >
            <span>مشاهده همه</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 md:h-5 md:w-5 mr-1 transform transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        }
      />

      {isLoading ? (
        <div className="h-52 md:h-64 flex items-center justify-center">
          <div className="relative w-12 h-12 md:w-16 md:h-16">
            <div className="absolute inset-0 border-4 border-secondary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-voxcina-blue rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        <div className="relative group/slider">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scroll("right")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-voxcina-blue/90 shadow-lg rounded-full p-2 sm:p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-voxcina-blue -translate-x-1/2"
            aria-label="قبلی"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue dark:text-white" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => scroll("left")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-voxcina-blue/90 shadow-lg rounded-full p-2 sm:p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-voxcina-blue translate-x-1/2"
            aria-label="بعدی"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-voxcina-blue dark:text-white" />
          </Button>

          <div
            ref={sliderRef}
            className={`flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory ${isDragging ? "" : "scroll-smooth"} select-none`}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {products.map((product) => (
	              <div
                key={`${product.productId}-${product.colorVariant.variantId || getCanonicalColor(product.colorVariant) || product.colorVariant.colorName}`}
                className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px] lg:w-[250px] snap-start"
              >
                <ProductCard item={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}
