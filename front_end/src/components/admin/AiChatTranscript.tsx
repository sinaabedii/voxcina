"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Image as ImageIcon,
  Maximize2,
  MessageSquareOff,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import BackendImage from "@/components/BackendImage";
import CatalogHitsCard from "@/components/tryon/CatalogHitsCard";
import { cn, formatPrice, toPersianNumber } from "@/lib/utils";
import {
  getRecommendedDisplayImage,
  getRecommendedHref,
} from "@/lib/tryon-recommendation";
import { TryonChatMessage } from "@/lib/tryon-api";
import { ChatMessage, RecommendedProduct } from "@/types/tryon";

interface AiChatTranscriptProps {
  /** The restored transcript, exactly as the fitting room renders it. */
  messages: ChatMessage[];
  /** The stored transcript; index-aligned with `messages` for admin extras. */
  storedMessages: TryonChatMessage[];
  onCompare: (beforeImage: string, afterImage: string) => void;
}

const formatTimestamp = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fa-IR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const garmentTypeLabels: Record<string, string> = {
  upper_body: "بالاتنه",
  lower_body: "پایین تنه",
  dresses: "لباس",
};

/** The read-only card for a product the agent pitched — no cart actions. */
function AdminRecommendationCard({ product }: { product: RecommendedProduct }) {
  const image = getRecommendedDisplayImage(product);
  const extras = [
    product.color_name || product.color,
    product.size,
  ].filter(Boolean);

  return (
    <div className="bg-background border border-secondary-400 dark:border-voxcina-blue/30 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream animate-badge-float" />
        <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">پیشنهاد فروشنده</p>
      </div>
      <a
        href={getRecommendedHref(product)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center gap-3 group"
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
              <ImageIcon className="h-6 w-6 text-voxcina-blue/30 dark:text-voxcina-cream/30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream truncate group-hover:underline">
            {product.product_name}
          </p>
          <p className="text-[11px] font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-0.5">
            {formatPrice(product.price)}
          </p>
          {extras.length > 0 && (
            <p className="text-[10px] text-voxcina-blue/45 dark:text-voxcina-cream/45 mt-0.5">
              {extras.join(" • ")}
            </p>
          )}
        </div>
      </a>
    </div>
  );
}

/** Collapsible technical details of one agent turn: tool call, model, latency. */
function AdminMessageDetails({ stored }: { stored: TryonChatMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = !!(stored.tool_call || stored.model_used || stored.response_time_ms);

  const rows = [
    stored.model_used && { label: "مدل", value: stored.model_used },
    stored.response_time_ms && {
      label: "زمان پاسخ",
      value: `${stored.response_time_ms.toLocaleString("fa-IR")} میلی‌ثانیه`,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mt-1.5 max-w-[80%]">
      {(hasDetails || rows.length > 0) && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] text-voxcina-blue/45 dark:text-voxcina-cream/45 hover:text-voxcina-blue dark:hover:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-cream/5 transition-colors"
        >
          <Wrench className="h-3 w-3" />
          {stored.tool_call ? `فراخوانی ابزار: ${stored.tool_call.name}` : "جزئیات فنی"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        </button>
      )}
      {isOpen && (
        <div className="mt-1.5 rounded-xl border border-secondary-300 dark:border-voxcina-blue/30 bg-background p-2.5 space-y-2">
          {(rows.length > 0 || formatTimestamp(stored.timestamp)) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
              {rows.map((row) => (
                <span key={row.label} className="dir-ltr text-right">
                  <span className="text-voxcina-blue/40 dark:text-voxcina-cream/40">{row.label}:</span>{" "}
                  <span className="font-medium">{row.value}</span>
                </span>
              ))}
              {formatTimestamp(stored.timestamp) && <span>{formatTimestamp(stored.timestamp)}</span>}
            </div>
          )}
          {stored.tool_call && (
            <>
              <div>
                <p className="mb-1 text-[10px] font-medium text-voxcina-blue/50 dark:text-voxcina-cream/50">ورودی ابزار</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words dir-ltr text-left rounded-lg bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04] p-2 text-[10px] leading-4 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                  {JSON.stringify(stored.tool_call.arguments || {}, null, 2)}
                </pre>
              </div>
              {stored.tool_call.result && (
                <div>
                  <p className="mb-1 text-[10px] font-medium text-voxcina-blue/50 dark:text-voxcina-cream/50">خروجی ابزار</p>
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words dir-ltr text-left rounded-lg bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04] p-2 text-[10px] leading-4 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                    {JSON.stringify(stored.tool_call.result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One turn of the fitting-room transcript, rendered for the admin exactly as
 * the customer sees it on /tryon, with the agent's technical trail (tool calls,
 * model, latency) tucked behind a collapsible row.
 */
function AdminChatMessageItem({
  message,
  stored,
  grouped,
  onCompare,
}: {
  message: ChatMessage;
  stored?: TryonChatMessage;
  grouped: boolean;
  onCompare: (beforeImage: string, afterImage: string) => void;
}) {
  const timestamp = formatTimestamp(stored?.timestamp);

  if (message.role === "tryon") {
    const { beforeImage, afterImage, productName, roomNumber } = message.tryonData || {};
    const size = stored?.tryon_data?.size;
    const color = stored?.tryon_data?.color;
    const garmentType = stored?.tryon_data?.garment_type;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex flex-col items-center gap-1.5 mt-3"
      >
        {afterImage ? (
          <div
            className="relative w-24 h-24 rounded-full overflow-hidden border border-secondary-400 dark:border-voxcina-blue/30 shadow-inset-button cursor-pointer group"
            onClick={() => onCompare(beforeImage || "", afterImage)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={afterImage}
              alt={message.content}
              className="absolute inset-0 w-full h-full object-cover blur-[6px] group-hover:blur-0 transition-all duration-300"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-voxcina-blue/20 group-hover:bg-transparent transition-all duration-300 pointer-events-none">
              <Maximize2 className="h-5 w-5 text-voxcina-cream opacity-100 group-hover:opacity-0 transition-opacity duration-200" />
            </div>
          </div>
        ) : (
          <div className="flex w-24 h-24 items-center justify-center rounded-full border border-dashed border-secondary-400 dark:border-voxcina-blue/30 text-voxcina-blue/40 dark:text-voxcina-cream/40">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <div className="text-center">
          <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">{message.content}</p>
          {productName && (
            <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40">{productName}</p>
          )}
          <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 text-[10px] text-voxcina-blue/35 dark:text-voxcina-cream/35">
            {color && <span>رنگ: {color}</span>}
            {size && <span>سایز: {size}</span>}
            {garmentType && <span>{garmentTypeLabels[garmentType] || garmentType}</span>}
            {roomNumber ? <span>اتاق {toPersianNumber(roomNumber)}</span> : null}
            {timestamp && <span>{timestamp}</span>}
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
          {timestamp && (
            <p
              className={cn(
                "mt-1 text-[10px]",
                isUser ? "text-voxcina-cream/50" : "text-voxcina-blue/35 dark:text-voxcina-cream/35"
              )}
            >
              {timestamp}
            </p>
          )}
        </div>
      </motion.div>

      {!isUser && stored && <AdminMessageDetails stored={stored} />}

      {!!message.catalogHits?.length && <CatalogHitsCard hits={message.catalogHits} />}
      {message.recommendedProduct && <AdminRecommendationCard product={message.recommendedProduct} />}
    </>
  );
}

/**
 * The fitting-room transcript for the admin: the same bubbles, try-on cards
 * and product cards the customer saw, with the technical trail of each agent
 * turn collapsed into its message. Read-only — no cart or try-on actions.
 */
export default function AiChatTranscript({
  messages,
  storedMessages,
  onCompare,
}: AiChatTranscriptProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl bg-voxcina-blue/[0.06] dark:bg-voxcina-cream/[0.05] border border-secondary-400 dark:border-voxcina-blue/30 p-3">
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-voxcina-blue/50 dark:text-voxcina-cream/50">
          <MessageSquareOff className="h-8 w-8" />
          <p className="text-sm">پیامی در این گفتگو ثبت نشده است.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-voxcina-blue/[0.06] dark:bg-voxcina-cream/[0.05] border border-secondary-400 dark:border-voxcina-blue/30 p-3 space-y-1.5">
      {messages.map((message, idx) => (
        <AdminChatMessageItem
          key={storedMessages[idx]?.id || `${message.role}-${idx}`}
          message={message}
          stored={storedMessages[idx]}
          grouped={messages[idx - 1]?.role === message.role}
          onCompare={onCompare}
        />
      ))}
    </div>
  );
}
