"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { activityTracker } from "@/lib/activity-tracker";
import type { ColorVariantListItem } from "@/types/product";
import { buyableSizes, clickMeta, faNumber, variantHref, viewRatio } from "./trending-utils";

interface IndexRowProps {
  item: ColorVariantListItem;
  rank: number;
  listPosition: number;
  /** Views of rank one, which every bar is drawn as a fraction of. */
  leaderViews: number;
  onQuickAdd: (item: ColorVariantListItem) => void;
}

/**
 * One entry in the index — the ranks below the podium, as a list rather than
 * more cards.
 *
 * A list is the honest shape for a ranking: it reads top to bottom in one
 * column, so rank order survives on a phone instead of snaking across a grid,
 * and a row can carry the brand, the colour, the price and the view share at
 * once without any of it shrinking to fit a thumbnail's width.
 */
export default function IndexRow({
  item,
  rank,
  listPosition,
  leaderViews,
  onQuickAdd,
}: IndexRowProps) {
  const image = item.colorVariant.images?.[0];
  const discount = getDiscountPercentage(item.originalPrice, item.price);
  const canQuickAdd = item.inStock && buyableSizes(item).length > 0;
  const ratio = viewRatio(item, leaderViews);

  const track = () =>
    activityTracker.trackProductClick(item.productId, item.name, clickMeta(item, listPosition));

  return (
    <li className="trending-row group relative border-t border-voxcina-blue/10 first:border-t-0">
      {/* Hover wash. Inset and rounded so it reads as the row lifting off the
          page rather than a full-bleed band crossing it. */}
      <span className="pointer-events-none absolute inset-x-[-0.75rem] inset-y-0 -z-10 rounded-2xl bg-voxcina-blue/0 transition-colors duration-300 group-hover:bg-voxcina-blue/[0.035]" />

      <div className="flex items-center gap-3 py-4 sm:gap-5 sm:py-5">
        <span className="w-7 shrink-0 text-center text-xl font-light leading-none tabular-nums text-voxcina-blue/40 transition-colors duration-300 group-hover:text-secondary-900 sm:w-14 sm:text-3xl">
          {faNumber(rank)}
        </span>

        <Link
          href={variantHref(item)}
          rel="nofollow"
          tabIndex={-1}
          aria-hidden="true"
          onClick={track}
          className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-voxcina-blue/[0.07] sm:w-20 lg:w-24"
        >
          {image ? (
            <Image
              src={image}
              alt=""
              width={240}
              height={300}
              quality={75}
              loading="lazy"
              sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px"
              className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-voxcina-blue sm:text-base">
            <Link
              href={variantHref(item)}
              rel="nofollow"
              data-activity-tracked="true"
              onClick={track}
              className="transition-colors hover:text-secondary-900 focus-visible:outline-none focus-visible:text-secondary-900"
            >
              {item.name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-xs text-voxcina-blue/50 sm:text-sm">
            {item.colorVariant.colorName} · {item.brand}
          </p>

          {/* Price lives in the text column on phones; there is no room for a
              column of its own once the numeral, thumb and action are placed. */}
          <p className="mt-1 flex items-baseline gap-2 sm:hidden">
            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-voxcina-blue">
              {formatPrice(item.price)}
            </span>
            {discount > 0 && (
              <span className="whitespace-nowrap text-[11px] tabular-nums text-voxcina-blue/35 line-through">
                {formatPrice(item.originalPrice)}
              </span>
            )}
          </p>

          {/* View share — the one place the page shows the distance between
              ranks rather than only their order. */}
          {item.viewCount !== undefined && (
            <div className="mt-2 hidden items-center gap-3 sm:flex">
              <span className="relative h-px w-full max-w-[13rem] overflow-hidden bg-voxcina-blue/10">
                <span
                  className="trending-bar absolute inset-y-0 right-0 origin-right bg-secondary-900"
                  style={{ width: `${Math.max(ratio * 100, 3)}%` }}
                />
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-voxcina-blue/40">
                {faNumber(item.viewCount)} بازدید
              </span>
            </div>
          )}
        </div>

        <div className="hidden shrink-0 text-left sm:block">
          <div className="text-base font-bold tabular-nums text-voxcina-blue lg:text-lg">
            {formatPrice(item.price)}
          </div>
          {discount > 0 && (
            <div className="mt-0.5 text-xs tabular-nums text-voxcina-blue/35 line-through">
              {formatPrice(item.originalPrice)}
            </div>
          )}
        </div>

        {canQuickAdd ? (
          <button
            type="button"
            onClick={() => onQuickAdd(item)}
            aria-label={`افزودن ${item.name} به سبد خرید`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-voxcina-blue/55 ring-1 ring-voxcina-blue/12 transition-all duration-200 hover:bg-voxcina-blue hover:text-voxcina-cream hover:ring-voxcina-blue active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 sm:h-10 sm:w-10"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        ) : (
          <Link
            href={variantHref(item)}
            rel="nofollow"
            onClick={track}
            aria-label={`مشاهده ${item.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-voxcina-blue/40 transition-all duration-200 group-hover:text-voxcina-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </Link>
        )}
      </div>
    </li>
  );
}
