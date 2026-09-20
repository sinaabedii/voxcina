"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronUp, Lock, Send, Sparkles, Tag, User } from "lucide-react";
import { toast } from "react-toastify";

import CouponCard from "@/components/cart/CouponCard";
import { streamCheckoutNegotiation } from "@/lib/checkout-chat-api";
import { localStorageManager } from "@/lib/local-storage-manager";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutChatStore } from "@/store/checkout-chat-store";
import { CheckoutUIMessage } from "@/types/checkout-chat";

const OPENERS = [
  "سلام! می‌خوام یه تخفیف خوب برای این سبد بگیرم.",
  "این قیمت برام کمی بالاست، می‌تونی کمک کنی؟",
  "اگه تخفیف خوبی بدی همین الان پرداخت می‌کنم.",
];

/**
 * The discount-negotiation agent's home on the cart page. It sits directly
 * above the promo-code box because that is where the shopper expects a code:
 * the agent mints the coupon, the apply button drops it into that same field.
 * Collapsed it is a loud call to action; expanded it becomes the chat itself.
 */
export default function DiscountNegotiationCard() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [expired, setExpired] = useState(false);

  const initializedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const summary = useCartStore((s) => s.summary);
  const applyPromoCode = useCartStore((s) => s.applyPromoCode);
  const cartPromoCode = useCartStore((s) => s.promoCode);

  const {
    chatId,
    messages,
    hasLoadedOnce,
    couponCode,
    couponValue,
    couponValidUntil,
    ensureChatId,
    loadSession,
    appendLocalMessage,
    replaceLastStreaming,
    persistMessage,
    setCoupon,
    reset,
  } = useCheckoutChatStore();

  const guest = isInitialized && !isAuthenticated;

  // Load the existing negotiation session up front (signed-in shoppers only)
  // so a coupon minted earlier can advertise itself while the chat is closed.
  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      initializedRef.current = false;
      reset();
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    void loadSession(ensureChatId());
  }, [isInitialized, isAuthenticated, ensureChatId, loadSession, reset]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  const applied = Boolean(
    couponCode &&
      cartPromoCode?.isValid &&
      cartPromoCode.code?.toLowerCase() === couponCode.toLowerCase()
  );
  const hasLiveOffer = Boolean(
    couponCode &&
      !applied &&
      !expired &&
      couponValidUntil &&
      new Date(couponValidUntil).getTime() > Date.now()
  );

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
      const { promoCode, error } = useCartStore.getState();
      if (promoCode?.isValid && promoCode.code?.toLowerCase() === couponCode.toLowerCase()) {
        toast.success("کد تخفیف اعمال شد!");
      } else {
        toast.error(error || "خطا در اعمال کد تخفیف");
      }
    } finally {
      setApplying(false);
    }
  };

  const handlePrimaryAction = () => {
    if (guest) {
      localStorageManager.setReturnUrl("/cart");
      router.push("/sign-in");
      return;
    }
    setOpen(true);
  };

  const ctaLabel = guest
    ? "ورود و شروع چونه زنی"
    : applied
    ? "مشاهده گفتگو"
    : hasLiveOffer
    ? "دیدن و اعمال پیشنهاد"
    : "شروع چونه زنی";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-shadow",
        applied
          ? "border-emerald-400/40 dark:border-emerald-500/40"
          : hasLiveOffer
          ? "border-amber-300/60 shadow-medium dark:border-amber-400/40"
          : "border-voxcina-cream/30 dark:border-voxcina-blue/30"
      )}
    >
      {/* ───────── Hero (always visible) ───────── */}
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            applied
              ? "from-emerald-700 via-emerald-800 to-voxcina-darkBlue"
              : "from-voxcina-blue via-voxcina-darkBlue to-voxcina-blue"
          )}
        />
        <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-white/20 to-transparent motion-reduce:hidden"
          />
        )}

        <div className="relative p-4">
          {open ? (
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-soft">
                <span className="absolute -inset-1 rounded-full bg-amber-400/25 blur-md animate-pulse-glow" />
                <Sparkles className="relative h-4 w-4 text-voxcina-darkBlue" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-voxcina-cream">ووکسا</p>
                <p className="flex items-center gap-1.5 text-[11px] text-voxcina-cream/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مذاکره‌کننده تخفیف · آنلاین
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن گفتگو"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-voxcina-cream/80 ring-1 ring-white/15 transition-colors hover:bg-white/20 hover:text-voxcina-cream"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <span className="absolute -inset-1 rounded-2xl bg-amber-400/25 blur-md animate-pulse-glow" />
                  <Sparkles className="relative h-5 w-5 text-amber-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-voxcina-cream">
                      {applied
                        ? "کد تخفیف فعال شد"
                        : hasLiveOffer
                        ? `${couponValue ?? 0}٪ تخفیف آماده‌ست!`
                        : "قیمت بهتری می‌خوای؟"}
                    </h3>
                    {hasLiveOffer && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-200 ring-1 ring-amber-300/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                        پیشنهاد ویژه
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-voxcina-cream/70">
                    {applied ? (
                      <>
                        کد{" "}
                        <span className="font-mono font-bold text-emerald-300">{couponCode}</span> روی
                        سبد خریدت فعال شد.
                      </>
                    ) : hasLiveOffer ? (
                      "ووکسا یه کد اختصاصی برای همین سبد در آورده؛ ببین و با یک کلیک اعمالش کن."
                    ) : guest ? (
                      "برای چونه زنی با ووکسا، اول وارد حساب کاربریت شو."
                    ) : (
                      "با ووکسا چونه بزن تا یه کد تخفیف اختصاصی برای همین سبد در بیاره."
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrimaryAction}
                aria-expanded={open}
                aria-controls="discount-negotiation-body"
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70",
                  applied
                    ? "bg-white/10 text-voxcina-cream ring-1 ring-white/20 hover:bg-white/20"
                    : "bg-gradient-to-l from-amber-300 to-amber-400 text-voxcina-darkBlue shadow-soft hover:shadow-medium hover:brightness-105"
                )}
              >
                {guest ? (
                  <Lock className="h-4 w-4" />
                ) : applied ? (
                  <Check className="h-4 w-4" />
                ) : hasLiveOffer ? (
                  <Tag className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {ctaLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ───────── Chat body ───────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="discount-negotiation-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-voxcina-cream/40 bg-white/95 px-4 pb-4 pt-3 dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
              <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto pl-1 scrollbar-thin">
                {!hasLoadedOnce && (
                  <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                    در حال بارگذاری گفتگو...
                  </p>
                )}
                {hasLoadedOnce && messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-1.5">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500">
                        <Sparkles className="h-3 w-3 text-voxcina-darkBlue" />
                      </span>
                      <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-secondary-400 bg-background px-3 py-2 text-sm leading-relaxed text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream">
                        سلام! ووکسا هستم؛ بگو چطور می‌تونم بهترین قیمت رو برات جور کنم.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {OPENERS.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => sendMessage(text)}
                          className="rounded-full border border-voxcina-blue/15 bg-voxcina-blue/[0.04] px-3 py-1.5 text-xs text-voxcina-blue/70 transition-all hover:-translate-y-0.5 hover:border-amber-400/60 hover:text-voxcina-blue dark:border-voxcina-cream/15 dark:bg-voxcina-cream/[0.05] dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream"
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
                      <span
                        className={cn(
                          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                          message.role === "user"
                            ? "bg-voxcina-blue"
                            : "bg-gradient-to-br from-amber-300 to-amber-500"
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="h-3 w-3 text-voxcina-cream" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-voxcina-darkBlue" />
                        )}
                      </span>
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          message.role === "user"
                            ? "rounded-tr-sm bg-voxcina-blue text-voxcina-cream"
                            : "rounded-tl-sm border border-secondary-400 bg-background text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
                        )}
                      >
                        {message.role === "agent_streaming" && !message.content ? (
                          <span className="flex h-3.5 items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60"
                                style={{ animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </span>
                        ) : (
                          <>
                            {message.content}
                            {message.role === "agent_streaming" && (
                              <span className="ms-0.5 inline-block h-3 w-[3px] animate-pulse rounded-full bg-current align-middle" />
                            )}
                          </>
                        )}
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
                className="mt-3 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="پیام به ووکسا..."
                  disabled={loading}
                  aria-label="پیام به ووکسا"
                  className="flex-1 rounded-xl border border-secondary-400 bg-white px-3 py-2.5 text-sm text-voxcina-blue transition-all placeholder:text-voxcina-blue/40 focus:border-voxcina-blue/60 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/15 disabled:opacity-60 dark:border-voxcina-blue/40 dark:bg-voxcina-blue/30 dark:text-voxcina-cream dark:placeholder:text-voxcina-cream/40"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="ارسال پیام"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-voxcina-blue text-voxcina-cream transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
