"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { activityTracker } from "@/lib/activity-tracker";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ColorVariantListItem } from "@/types/product";
import { buyableSizes, clickMeta, faNumber, variantHref } from "./trending-utils";

interface PodiumCardProps {
  item: ColorVariantListItem;
  rank: number;
  /** `hero` is the wide slot given to rank one; `standard` is the pair beside it. */
  variant: "hero" | "standard";
  listPosition: number;
  onQuickAdd: (item: ColorVariantListItem) => void;
}

/**
 * A place on the podium — the top three, shown as objects rather than rows.
 *
 * Every size here is expressed per `variant` rather than per breakpoint, because
 * the same card is rendered at ~190px and at ~600px on the same screen. Keying
 * the type scale to the viewport is what makes a wide card look like a small
 * card that got stretched: a giant photo over a caption set for a thumbnail.
 */
export default function PodiumCard({
  item,
  rank,
  variant,
  listPosition,
  onQuickAdd,
}: PodiumCardProps) {
  const isFavorite = useDashboardStore((state) => state.isFavorite(item.productId || ""));
  const addFavorite = useDashboardStore((state) => state.addToFavorites);
  const removeFavorite = useDashboardStore((state) => state.removeFromFavorites);

  const hero = variant === "hero";
  const image = item.colorVariant.images?.[0];
  const discount = getDiscountPercentage(item.originalPrice, item.price);
  const canQuickAdd = item.inStock && buyableSizes(item).length > 0;

  return (
    <article className="group flex flex-col">
      {/* Editorial rank line: numeral, rule, reading count. The rule is what
          makes a bare numeral read as an index entry instead of a badge, and it
          keeps the numeral off the photograph entirely. */}
      <div className="mb-3 flex items-baseline gap-3 sm:mb-4">
        <span
          className={`font-light leading-[0.8] tabular-nums text-secondary-900 ${
            hero ? "text-[3.5rem] sm:text-7xl lg:text-8xl" : "text-4xl sm:text-5xl"
          }`}
        >
          {faNumber(rank)}
        </span>
        <span className="h-px flex-1 bg-voxcina-blue/15" />
        {item.viewCount !== undefined && (
          <span
            className={`shrink-0 tabular-nums text-voxcina-blue/45 ${
              hero ? "text-xs sm:text-sm" : "text-[11px]"
            }`}
          >
            {faNumber(item.viewCount)} بازدید
          </span>
        )}
      </div>

      <div className="relative">
        <Link
          href={variantHref(item)}
          rel="nofollow"
          data-activity-tracked="true"
          onClick={() => activityTracker.trackProductClick(item.productId, item.name, clickMeta(item, listPosition))}
          className={`relative block overflow-hidden bg-white ring-1 ring-voxcina-blue/[0.07] transition-[box-shadow,transform] duration-500 ease-out group-hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 ${
            hero
              ? "rounded-[1.75rem] shadow-[0_22px_60px_-28px_rgba(10,27,60,0.5)] group-hover:shadow-[0_32px_70px_-26px_rgba(10,27,60,0.55)]"
              : "rounded-[1.25rem] shadow-[0_14px_40px_-22px_rgba(10,27,60,0.45)] group-hover:shadow-[0_22px_50px_-22px_rgba(10,27,60,0.5)]"
          }`}
        >
          <div className="aspect-[4/5]">
            {image ? (
              <Image
                src={image}
                alt={`${item.name} — ${item.colorVariant.colorName}`}
                width={hero ? 900 : 460}
                height={hero ? 1125 : 575}
                quality={hero ? 85 : 75}
                // `priority` is deprecated as of Next 16. The docs point at
                // eager + fetchPriority rather than `preload` for an LCP image
                // that is already in the markup, which this one is.
                loading={hero ? "eager" : "lazy"}
                fetchPriority={hero ? "high" : undefined}
                sizes={hero ? "(max-width: 1024px) 94vw, 600px" : "(max-width: 1024px) 45vw, 300px"}
                className="h-full w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-voxcina-blue/30">
                بدون تصویر
              </div>
            )}
          </div>

          {/* Discount tag. A squared-off corner tag rather than a floating pill —
              it reads as a price mark, not a notification. */}
          {discount > 0 && (
            <span
              className={`absolute top-0 right-0 rounded-bl-xl bg-secondary-900 font-bold tabular-nums text-white ${
                hero ? "px-3.5 py-2 text-sm" : "px-2.5 py-1.5 text-[11px]"
              }`}
            >
              ٪{faNumber(discount)} تخفیف
            </span>
          )}

          {!item.inStock && (
            <span className="absolute bottom-3 right-3 rounded-md bg-voxcina-darkBlue/85 px-2.5 py-1 text-[11px] font-medium text-voxcina-cream">
              ناموجود
            </span>
          )}
        </Link>

        {/* Controls are siblings of the link, not children: a button inside an
            anchor is invalid, and each needs its own tab stop. */}
        <div className={`absolute left-3 top-3 flex flex-col ${hero ? "gap-2.5" : "gap-2"}`}>
          <button
            type="button"
            onClick={() => (isFavorite ? removeFavorite(item.productId) : addFavorite(item.productId))}
            aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            aria-pressed={isFavorite}
            className={`flex items-center justify-center rounded-full backdrop-blur transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 ${
              hero ? "h-10 w-10" : "h-8 w-8"
            } ${
              isFavorite
                ? "bg-secondary-900 text-white shadow-[0_6px_16px_-6px_rgba(152,127,85,0.9)]"
                : "bg-white/85 text-voxcina-blue/70 shadow-[0_6px_16px_-8px_rgba(10,27,60,0.5)] hover:bg-white hover:text-voxcina-blue"
            }`}
          >
            <Heart className={hero ? "h-4 w-4" : "h-3.5 w-3.5"} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          {canQuickAdd && (
            <button
              type="button"
              onClick={() => onQuickAdd(item)}
              aria-label={`افزودن ${item.name} به سبد خرید`}
              className={`flex items-center justify-center rounded-full bg-white/85 text-voxcina-blue/70 shadow-[0_6px_16px_-8px_rgba(10,27,60,0.5)] backdrop-blur transition-all duration-200 hover:bg-voxcina-blue hover:text-voxcina-cream active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 ${
                hero ? "h-10 w-10" : "h-8 w-8"
              }`}
            >
              <ShoppingBag className={hero ? "h-4 w-4" : "h-3.5 w-3.5"} />
            </button>
          )}
        </div>
      </div>

      {/* Caption. Sentence-case, no chrome — the whitespace separates it. */}
      <div className={hero ? "mt-5" : "mt-3.5"}>
        <h3
          className={`font-bold leading-snug text-voxcina-blue ${
            hero ? "text-lg sm:text-xl lg:text-2xl" : "line-clamp-2 min-h-[2.75em] text-sm sm:text-base"
          }`}
        >
          <Link href={variantHref(item)} className="transition-colors hover:text-secondary-900">
            {item.name}
          </Link>
        </h3>
        <p className={`mt-1 text-voxcina-blue/50 ${hero ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
          {item.colorVariant.colorName} · {item.brand}
        </p>

        <div className={`mt-2.5 ${hero ? "flex flex-wrap items-baseline gap-x-3 gap-y-1" : ""}`}>
          <span
            className={`block whitespace-nowrap font-bold tabular-nums text-voxcina-blue ${
              hero ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
            }`}
          >
            {formatPrice(item.price)}
          </span>
          {discount > 0 && (
            <span
              className={`block whitespace-nowrap tabular-nums text-voxcina-blue/35 line-through ${
                hero ? "text-sm" : "mt-0.5 text-xs"
              }`}
            >
              {formatPrice(item.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
