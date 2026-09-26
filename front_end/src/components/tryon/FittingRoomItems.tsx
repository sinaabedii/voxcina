"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, Shirt, ShoppingBag } from "lucide-react";
import BackendImage from "@/components/BackendImage";
import { getCartItemImage } from "@/lib/product-variants";
import { itemVariants } from "@/lib/tryon-motion";
import { cn, formatPrice, toPersianNumber } from "@/lib/utils";
import { TryOnEligibleItem } from "@/types/tryon";

interface FittingRoomItemsProps {
  items: TryOnEligibleItem[];
  activeIndex: number | null;
  /** A photo has been uploaded, so garments can be picked. */
  unlocked: boolean;
  onSelect: (index: number) => void;
}

function getGarmentTypeLabel(type?: string): string {
  switch (type) {
    case "upper_body":
      return "بالاتنه";
    case "lower_body":
      return "پایین‌تنه";
    case "dresses":
      return "لباس کامل / پیراهن";
    default:
      return "پوشاک";
  }
}

/** The cart's try-on-able garments, one of which is the room's active piece. */
export default function FittingRoomItems({
  items,
  activeIndex,
  unlocked,
  onSelect,
}: FittingRoomItemsProps) {
  return (
    <motion.div
      className="bg-background rounded-2xl border border-secondary-300 dark:border-voxcina-blue/30 p-3.5 shadow-soft"
      variants={itemVariants}
    >
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          <span>لباس‌های قابل پرو ({toPersianNumber(items.length)})</span>
        </h3>
        {unlocked && activeIndex !== null && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            ۱ لباس انتخاب شده
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-[340px] overflow-y-auto scrollbar-thin pr-0.5">
        <AnimatePresence>
          {items.map((item, idx) => {
            const isSelected = activeIndex === idx;
            const garmentTypeLabel = getGarmentTypeLabel(item.colorVariant.tryOnGarmentType);
            const image = getCartItemImage(item.cartItem) || "";

            return (
              <motion.div
                key={item.cartItem.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group relative",
                  isSelected
                    ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.05] shadow-sm ring-1 ring-voxcina-blue/20 dark:ring-voxcina-cream/20"
                    : "border-secondary-300/60 dark:border-voxcina-blue/20 hover:border-secondary-400 dark:hover:border-voxcina-blue/40 hover:bg-secondary-100/50 dark:hover:bg-voxcina-blue/10",
                  !unlocked && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => onSelect(idx)}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary-100 dark:bg-voxcina-blue/20 flex-shrink-0 border border-secondary-300/60 dark:border-voxcina-blue/20 relative shadow-inner-soft">
                  <BackendImage
                    src={image}
                    alt={item.product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-voxcina-blue/15 dark:bg-voxcina-cream/15 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-voxcina-blue dark:bg-voxcina-cream text-voxcina-cream dark:text-voxcina-blue flex items-center justify-center shadow-sm">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream truncate leading-tight">
                      {item.product.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    <span>{item.cartItem.colorName || item.colorVariant.colorName}</span>
                    {item.cartItem.size && (
                      <>
                        <span>·</span>
                        <span>سایز {item.cartItem.size}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-secondary-200/80 dark:bg-voxcina-blue/30">
                      {garmentTypeLabel}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-voxcina-blue/90 dark:text-voxcina-cream/90 pt-0.5">
                    {formatPrice(item.product.price)}
                  </p>
                </div>

                <div
                  className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200",
                    isSelected
                      ? "bg-voxcina-blue text-voxcina-cream dark:bg-voxcina-cream dark:text-voxcina-blue shadow-inset-button"
                      : "bg-secondary-200/80 dark:bg-voxcina-blue/30 text-voxcina-blue/40 dark:text-voxcina-cream/40 group-hover:bg-secondary-300 dark:group-hover:bg-voxcina-blue/50"
                  )}
                >
                  {!unlocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : isSelected ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Shirt className="h-3.5 w-3.5" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!unlocked && (
        <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center flex items-center justify-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>برای انتخاب لباس، ابتدا عکس خود را بارگذاری کنید</span>
        </div>
      )}
    </motion.div>
  );
}
