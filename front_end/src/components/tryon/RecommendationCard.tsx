"use client";

import Link from "next/link";
import { Camera, ShoppingBag, Sparkles } from "lucide-react";
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
    <div className="bg-background border border-secondary-400 dark:border-voxcina-blue/30 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream animate-badge-float" />
        <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">پیشنهاد فروشنده</p>
      </div>
      <Link
        href={getRecommendedHref(product)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center gap-3 mb-2 group"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-background border border-secondary-300 dark:border-voxcina-blue/20 flex-shrink-0">
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
          <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream truncate group-hover:underline">{product.product_name}</p>
          <p className="text-[11px] font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-0.5">{formatPrice(product.price)}</p>
        </div>
      </Link>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="text-[10px] flex-1 h-7 shadow-inset-button focus:shadow-focus-warm"
          onClick={onAddToCart}
          disabled={disabled}
        >
          <ShoppingBag className="h-3 w-3 ml-1" />
          افزودن به سبد
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] flex-1 h-7 border-voxcina-blue/40 dark:border-voxcina-cream/40 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04] focus:shadow-focus-warm"
          onClick={onTryOn}
          disabled={disabled}
        >
          <Camera className="h-3 w-3 ml-1" />
          {busy ? "..." : "پرو کن"}
        </Button>
      </div>
    </div>
  );
}
