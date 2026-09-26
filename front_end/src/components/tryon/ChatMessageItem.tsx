"use client";

import { motion } from "framer-motion";
import { Loader2, Maximize2, SlidersHorizontal, Sparkles, User } from "lucide-react";
import CatalogHitsCard from "./CatalogHitsCard";
import RecommendationCard from "./RecommendationCard";
import { cn, toPersianNumber } from "@/lib/utils";
import { ChatMessage, RecommendedProduct } from "@/types/tryon";

export interface RecommendationActions {
  /** The product whose add-to-cart or try-on is in flight, if any. */
  busyProductId: string | null;
  onAddToCart: (product: RecommendedProduct) => void;
  onTryOn: (product: RecommendedProduct) => void;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  /** Same speaker as the message above — the avatar column stays empty. */
  grouped: boolean;
  recommendation: RecommendationActions;
  onCompare: (beforeImage: string, afterImage: string) => void;
}

/**
 * One turn of the fitting room transcript: the bubble (or try-on card) plus the
 * cards that turn produced, anchored under the message that produced them.
 */
export default function ChatMessageItem({
  message,
  grouped,
  recommendation,
  onCompare,
}: ChatMessageItemProps) {
  // Try-on completed result card
  if (message.role === "tryon") {
    const afterImage = message.tryonData?.afterImage;
    const beforeImage = message.tryonData?.beforeImage || "";
    const productName = message.tryonData?.productName;
    const roomNumber = message.tryonData?.roomNumber;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="my-3 flex flex-col items-center"
      >
        <div className="w-full max-w-sm rounded-2xl border border-secondary-300 dark:border-voxcina-blue/30 bg-background dark:bg-voxcina-blue/15 overflow-hidden shadow-soft">
          {/* Card Header */}
          <div className="p-3 bg-secondary-100/70 dark:bg-voxcina-blue/25 border-b border-secondary-300 dark:border-voxcina-blue/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
                {roomNumber ? `نتیجه اتاق پرو ${toPersianNumber(roomNumber)}` : "نتیجه پرو هوشمند"}
              </span>
            </div>
            {productName && (
              <span className="text-[11px] font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 truncate max-w-[150px]">
                {productName}
              </span>
            )}
          </div>

          {/* Result Image Preview with compare prompt */}
          {afterImage && (
            <div
              className="relative aspect-[3/4] max-h-72 w-full bg-secondary-200/50 dark:bg-voxcina-blue/20 overflow-hidden cursor-pointer group"
              onClick={() => onCompare(beforeImage, afterImage)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={afterImage}
                alt={productName || "نتیجه پرو مجازی"}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                draggable={false}
              />

              {/* Hover overlay badge */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-voxcina-blue/90 text-voxcina-blue dark:text-voxcina-cream text-xs font-bold shadow-lg backdrop-blur-sm">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>مشاهده و مقایسه قبل و بعد</span>
                </span>
              </div>

              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md pointer-events-none flex items-center gap-1">
                <Maximize2 className="h-3 w-3" />
                <span>کلیک برای مقایسه</span>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="p-2.5 bg-background dark:bg-voxcina-blue/20 border-t border-secondary-300 dark:border-voxcina-blue/30">
            <button
              type="button"
              onClick={() => onCompare(beforeImage, afterImage || "")}
              className="w-full py-2 px-3 rounded-xl bg-voxcina-blue/10 dark:bg-voxcina-cream/10 hover:bg-voxcina-blue/15 dark:hover:bg-voxcina-cream/15 text-voxcina-blue dark:text-voxcina-cream text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>مقایسه عکس اصلی و نتیجه پرو</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Try-on in-progress placeholder card
  if (message.role === "tryon_processing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2 my-2"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-voxcina-blue dark:bg-voxcina-cream text-voxcina-cream dark:text-voxcina-blue flex items-center justify-center shadow-inset-button">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </div>
        <div className="bg-background rounded-2xl rounded-tl-sm border border-secondary-300 dark:border-voxcina-blue/30 p-3 shadow-soft space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
              در حال آماده‌سازی پرو {message.tryonData?.productName || "لباس"}...
            </span>
          </div>
          <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
            هوش مصنوعی در حال پوشاندن لباس روی عکس شماست (حدود ۳۰ ثانیه)
          </p>
          <div className="w-full bg-secondary-200 dark:bg-voxcina-blue/30 h-1 rounded-full overflow-hidden mt-1.5">
            <div className="bg-voxcina-blue dark:bg-voxcina-cream h-full w-2/3 animate-pulse-soft rounded-full" />
          </div>
        </div>
      </motion.div>
    );
  }

  const isUser = message.role === "user";
  const isStreaming = message.role === "agent_streaming";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "flex items-start gap-2",
          isUser ? "flex-row-reverse" : "flex-row",
          grouped ? "mt-1" : "mt-2.5"
        )}
      >
        <div className={cn("flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center", grouped && "invisible")}>
          <div className="w-full h-full rounded-xl bg-voxcina-blue dark:bg-voxcina-cream text-voxcina-cream dark:text-voxcina-blue flex items-center justify-center shadow-inset-button">
            {isUser ? (
              <User className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </div>
        </div>

        <div
          className={cn(
            "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs md:text-sm leading-relaxed shadow-soft",
            isUser
              ? "bg-voxcina-blue text-voxcina-cream rounded-tr-sm shadow-inset-button"
              : "bg-background text-voxcina-blue dark:text-voxcina-cream rounded-tl-sm border border-secondary-300 dark:border-voxcina-blue/30"
          )}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3 ml-1 bg-current animate-pulse align-middle" />
          )}
        </div>
      </motion.div>

      {!!message.catalogHits?.length && <CatalogHitsCard hits={message.catalogHits} />}
      {message.recommendedProduct && (
        <RecommendationCard
          product={message.recommendedProduct}
          busy={recommendation.busyProductId === message.recommendedProduct.product_id}
          disabled={!!recommendation.busyProductId}
          onAddToCart={() => recommendation.onAddToCart(message.recommendedProduct!)}
          onTryOn={() => recommendation.onTryOn(message.recommendedProduct!)}
        />
      )}
    </>
  );
}
