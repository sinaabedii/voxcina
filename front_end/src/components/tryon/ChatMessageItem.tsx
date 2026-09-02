"use client";

import { motion } from "framer-motion";
import { Maximize2, RefreshCw, Sparkles, User } from "lucide-react";
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
            onClick={() => onCompare(message.tryonData?.beforeImage || "", message.tryonData?.afterImage || "")}
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
          <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">{message.content}</p>
          {message.tryonData?.productName && (
            <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40">{message.tryonData.productName}</p>
          )}
        </div>
      </motion.div>
    );
  }

  if (message.role === "tryon_processing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-1.5 mt-2"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
          <RefreshCw className="h-3 w-3 text-voxcina-cream animate-spin" />
        </div>
        <div className="bg-white dark:bg-voxcina-blue/25 rounded-xl rounded-tl-sm border border-secondary-400 dark:border-voxcina-blue/30 px-3 py-2">
          <p className="text-xs text-voxcina-blue dark:text-voxcina-cream">
            در حال پرو {message.tryonData?.productName || "لباس"}...
          </p>
          <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">
            حدود ۳۰ ثانیه
          </p>
        </div>
      </motion.div>
    );
  }

  const isUser = message.role === "user";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "flex items-start gap-1.5",
          isUser ? "flex-row-reverse" : "flex-row",
          grouped ? "mt-0.5" : "mt-2"
        )}
      >
        <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center", grouped && "invisible")}>
          <div className="w-full h-full rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
            {isUser ? (
              <User className="h-3.5 w-3.5 text-voxcina-cream" />
            ) : (
              <Sparkles className="h-3 w-3 text-voxcina-cream" />
            )}
          </div>
        </div>
        <div
          className={cn(
            "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
            isUser
              ? "bg-voxcina-blue text-voxcina-cream rounded-tr-sm shadow-inset-button"
              : "bg-white dark:bg-voxcina-blue/25 text-voxcina-blue dark:text-voxcina-cream rounded-tl-sm border border-secondary-400 dark:border-voxcina-blue/30"
          )}
        >
          {message.content}
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
