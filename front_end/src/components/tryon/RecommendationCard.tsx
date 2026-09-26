"use client";

import Link from "next/link";
import { Camera, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import BackendImage from "@/components/BackendImage";
import Button from "@/components/ui/Button";
import { getRecommendedDisplayImage, getRecommendedHref } from "@/lib/tryon-recommendation";
import { formatPrice } from "@/lib/utils";
import { RecommendedProduct } from "@/types/tryon";

interface RecommendationCardProps {
  product: RecommendedProduct;
  /** This card's own add-to-cart or try-on is in flight. */
  busy: boolean;
  /** Some card's action is in flight — every card's buttons wait for it. */
  disabled: boolean;
  onAddToCart: () => void;
  onTryOn: () => void;
}

/** The piece the agent is pitching — recommended outright or as a styling companion. */
export default function RecommendationCard({
  product,
  busy,
  disabled,
  onAddToCart,
  onTryOn,
}: RecommendationCardProps) {
  const image = getRecommendedDisplayImage(product);

  return (
    <div className="bg-background border border-secondary-300 dark:border-voxcina-blue/30 rounded-2xl p-3.5 mt-3 shadow-soft max-w-sm mr-9">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse-soft" />
        <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
          پیشنهاد استایلیست
        </p>
      </div>

      <Link
        href={getRecommendedHref(product)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center gap-3 mb-3 group"
      >
        <div className="w-14 h-16 rounded-xl overflow-hidden bg-secondary-100 dark:bg-voxcina-blue/20 border border-secondary-300 dark:border-voxcina-blue/20 flex-shrink-0 shadow-inner-soft">
          {image ? (
            <BackendImage
              src={image}
              alt={product.product_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-voxcina-blue/30 dark:text-voxcina-cream/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream truncate group-hover:underline">
            {product.product_name}
          </p>
          <p className="text-xs font-semibold text-voxcina-blue/80 dark:text-voxcina-cream/80 mt-1">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="text-xs flex-1 h-8 rounded-xl shadow-inset-button font-medium"
          onClick={onAddToCart}
          disabled={disabled}
        >
          <ShoppingBag className="h-3.5 w-3.5 ml-1.5" />
          افزودن به سبد
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs flex-1 h-8 rounded-xl border-secondary-300 dark:border-voxcina-blue/30 hover:bg-secondary-100 dark:hover:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream font-medium"
          onClick={onTryOn}
          disabled={disabled}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5 ml-1.5" />
          )}
          {busy ? "در حال آماده‌سازی..." : "پرو این مدل"}
        </Button>
      </div>
    </div>
  );
}
