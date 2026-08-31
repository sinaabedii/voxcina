"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Send, Sparkles, Tag, User } from "lucide-react";
import { toast } from "react-hot-toast";

import CouponCard from "@/components/tryon/CouponCard";
import { streamCheckoutNegotiation } from "@/lib/checkout-chat-api";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutChatStore } from "@/store/checkout-chat-store";
import { CheckoutUIMessage } from "@/types/checkout-chat";

const OPENERS = [
  "سلام! می‌خوام یه تخفیف خوب برای این سبد بگیرم.",
  "این قیمت برام کمی بالاست، می‌تونی کمک کنی؟",
  "اگه تخفیف خوبی بدی همین الان پرداخت می‌کنم.",
];

/** A collapsed-by-default chat widget for negotiating a discount right before payment. */
export default function DiscountChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [expired, setExpired] = useState(false);
  const initializedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { summary, applyPromoCode } = useCartStore();
  const {
    chatId,
    messages,
    hasLoadedOnce,
    couponCode,
    ensureChatId,
    loadSession,
    appendLocalMessage,
    replaceLastStreaming,
    persistMessage,
    setCoupon,
  } = useCheckoutChatStore();

  useEffect(() => {
    if (!open || initializedRef.current) return;
    initializedRef.current = true;
    const id = ensureChatId();
    loadSession(id);
  }, [open, ensureChatId, loadSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setLoading(true);
    setExpired(false);

    const userMessage: CheckoutUIMessage = { role: "user", content: trimmed };
    appendLocalMessage(userMessage);
    void persistMessage(userMessage);
    appendLocalMessage({ role: "agent_streaming", content: "" });

    let streamed = "";
    try {
      await streamCheckoutNegotiation(
        { message: trimmed, chat_id: chatId || ensureChatId() },
        {
          onToken: (chunk) => {
            streamed += chunk;
            replaceLastStreaming({ role: "agent_streaming", content: streamed });
          },
          onDone: (turn) => {
            const agentMessage: CheckoutUIMessage = {
              role: "agent",
              content: turn.reply || streamed,
              coupon: turn.coupon,
            };
            replaceLastStreaming(agentMessage);
            if (turn.coupon) {
              setCoupon(turn.coupon.code, turn.coupon.value, turn.coupon.valid_until);
              setApplied(false);
              setExpired(false);
            }
          },
        }
      );
    } catch {
      replaceLastStreaming({
        role: "agent",
        content: "وای ببخشید، الان یه لحظه سرم شلوغ شد! یه بار دیگه بگو چی می‌خواستی.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!couponCode || applying || expired) return;
    setApplying(true);
    try {
      await applyPromoCode(couponCode);
      setApplied(true);
      toast.success("کد تخفیف اعمال شد!");
    } catch (err: any) {
      toast.error(err?.message || "خطا در اعمال کد تخفیف");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/10 shadow-sm backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-right"
      >
        <span className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream font-semibold">
          <Tag className="h-4 w-4" />
          چت برای گرفتن تخفیف
        </span>
        <ChevronDown className={cn("h-4 w-4 text-voxcina-blue/50 dark:text-voxcina-cream/50 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-secondary-400/50 dark:border-voxcina-blue/30 pt-3">
              <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {!hasLoadedOnce && (
                  <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">در حال بارگذاری...</p>
                )}
                {hasLoadedOnce && messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      سلام! ووکسا هستم، بگو چطور می‌تونم بهترین قیمت رو برات جور کنم.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {OPENERS.map((text) => (
                        <button
                          key={text}
                          onClick={() => sendMessage(text)}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue dark:hover:text-voxcina-cream text-[11px] transition-colors"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((message, idx) => (
                  <div key={idx}>
                    <div
                      className={cn(
                        "flex items-start gap-1.5",
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-voxcina-blue flex items-center justify-center">
                        {message.role === "user" ? (
                          <User className="h-3 w-3 text-voxcina-cream" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-voxcina-cream" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                          message.role === "user"
                            ? "bg-voxcina-blue text-voxcina-cream rounded-tr-sm"
                            : "bg-background text-voxcina-blue dark:text-voxcina-cream border border-secondary-400 dark:border-voxcina-blue/30 rounded-tl-sm"
                        )}
                      >
                        {message.content || (message.role === "agent_streaming" ? "..." : "")}
                      </div>
                    </div>
                    {message.coupon && (
                      <CouponCard
                        coupon={message.coupon}
                        isCurrent={couponCode === message.coupon.code}
                        expired={expired}
                        applied={applied}
                        applying={applying}
                        basePrice={summary.subtotal}
                        onApply={handleApply}
                        onExpire={() => setExpired(true)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2 mt-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="پیام به ووکسا..."
                  disabled={loading}
                  className="flex-1 bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 rounded-xl px-3 py-2 text-xs text-voxcina-blue dark:text-voxcina-cream placeholder:text-voxcina-blue/40 focus:outline-none focus:border-voxcina-blue/60 focus:ring-2 focus:ring-voxcina-blue/15 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-voxcina-blue text-voxcina-cream disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
