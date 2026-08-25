"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Shirt, ShoppingBag } from "lucide-react";
import BackendImage from "@/components/BackendImage";
import { getCartItemImage } from "@/lib/product-variants";
import { itemVariants } from "@/lib/tryon-motion";
import { cn, formatPrice } from "@/lib/utils";
import { TryOnEligibleItem } from "@/types/tryon";

interface FittingRoomItemsProps {
  items: TryOnEligibleItem[];
  activeIndex: number | null;
  /** A photo has been uploaded, so garments can be picked. */
  unlocked: boolean;
  onSelect: (index: number) => void;
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
      className="bg-background rounded-xl border border-secondary-300 dark:border-voxcina-blue/20 p-3"
      variants={itemVariants}
    >
      <h3 className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream mb-3 flex items-center gap-2 px-1">
        <ShoppingBag className="h-3.5 w-3.5" />
        محصولات ({items.length})
      </h3>
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div
              key={item.cartItem.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group",
                activeIndex === idx
                  ? "border-voxcina-blue/40 dark:border-voxcina-cream/40 bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04]"
                  : "border-transparent hover:border-secondary-300 dark:hover:border-voxcina-blue/30 hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04]",
                !unlocked && "opacity-50"
              )}
              onClick={() => onSelect(idx)}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04] flex-shrink-0 border border-secondary-300/60 dark:border-voxcina-blue/20">
                <BackendImage src={getCartItemImage(item.cartItem) || ""} alt={item.product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream truncate leading-tight">{item.product.name}</p>
                <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">
                  {item.cartItem.colorName || item.colorVariant.colorName}
                  {item.cartItem.size && ` · ${item.cartItem.size}`}
                </p>
                <p className="text-[11px] font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-0.5">{formatPrice(item.product.price)}</p>
              </div>
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all",
                activeIndex === idx
                  ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
                  : "bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40 group-hover:bg-voxcina-blue/20 dark:group-hover:bg-voxcina-cream/20"
              )}>
                {unlocked ? <Shirt className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!unlocked && (
        <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-2 text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          ابتدا عکس خود را آپلود کنید
        </p>
      )}
    </motion.div>
  );
}
