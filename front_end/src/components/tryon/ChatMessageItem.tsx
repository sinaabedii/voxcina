"use client";

import { motion } from "framer-motion";
import { Loader2, Maximize2, Sparkles, User } from "lucide-react";
import CatalogHitsCard from "./CatalogHitsCard";
import RecommendationCard from "./RecommendationCard";
import { cn } from "@/lib/utils";
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex flex-col items-center gap-1.5 mt-3"
      >
        {message.tryonData?.afterImage && (
          <div
            className="relative w-24 h-24 rounded-full overflow-hidden border border-secondary-400 dark:border-voxcina-blue/30 shadow-inset-button cursor-pointer group"
            onClick={() =>
              onCompare(
                message.tryonData?.beforeImage || "",
                message.tryonData?.afterImage || ""
              )
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.tryonData.afterImage}
              alt={message.content}
              className="absolute inset-0 w-full h-full object-cover blur-[6px] group-hover:blur-0 transition-all duration-300"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-voxcina-blue/20 group-hover:bg-transparent transition-all duration-300 pointer-events-none">
              <Maximize2 className="h-5 w-5 text-voxcina-cream opacity-100 group-hover:opacity-0 transition-opacity duration-200" />
            </div>
          </div>
        )}
        <div className="text-center">
          <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">
            {message.content}
          </p>
          {message.tryonData?.productName && (
            <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40">
              {message.tryonData.productName}
            </p>
          )}
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
