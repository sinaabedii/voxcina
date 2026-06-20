"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Camera, Shirt, ShoppingBag, AlertCircle, Tag, Send, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart-store";
import { useTryOnStore } from "@/store/tryon-store";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { cn, formatPrice } from "@/lib/utils";
import { ColorVariant, Product } from "@/types/product";
import { CartItem } from "@/types/cart";
import Button from "@/components/ui/Button";
import BackendImage from "@/components/BackendImage";

interface TryOnEligibleItem {
  cartItem: CartItem;
  colorVariant: ColorVariant;
  product: Product;
}

interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

interface CouponOffer {
  code: string;
  value: number;
  valid_until: string;
  product_ids: string[];
}

const RECOMMENDATION_TEMPLATES: Record<string, Record<string, (a: string, b: string) => string>> = {
  upper_body: {
    lower_body: (upper, lower) =>
      `این ${lower} ست فوق‌العاده‌ای با ${upper} انتخابی شما می‌شود! ترکیب این دو، استایل شما را کامل می‌کند.`,
  },
  lower_body: {
    upper_body: (lower, upper) =>
      `یک ${upper} شیک می‌تواند این ${lower} را به یک تیپ کامل تبدیل کند. این آیتم را هم پرو کنید!`,
  },
  dresses: {
    upper_body: (dress, other) =>
      `این ${other} همراه با ${dress} یک استایل لایه‌ای جذاب می‌سازد.`,
    lower_body: (dress, other) =>
      `این ${other} با ${dress} ترکیب جالبی می‌شود! امتحانش کنید.`,
  },
};

function getCartItemImage(item: CartItem): string {
  if (!item.product) return "";
  if (item.color && item.product.colorVariants?.length) {
    const matched = item.product.colorVariants.find((cv) => cv.color === item.color);
    if (matched?.images?.length) return matched.images[0];
  }
  if (item.product.mainImages?.length) return item.product.mainImages[0];
  if (item.product.colorVariants?.[0]?.images?.length) return item.product.colorVariants[0].images[0];
  return "";
}

function getComplementaryType(garmentType: string): string {
  if (garmentType === "upper_body") return "lower_body";
  if (garmentType === "lower_body") return "upper_body";
  return "";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export default function TryOnRoomPage() {
  const { isLoading: authLoading, isAuthorized } = useProtectedRoute({ requiredAuth: true });
  const { cart, isLoading: cartLoading, applyPromoCode } = useCartStore();
  const {
    uploadedPreview,
    uploadedFile,
    resultImage,
    isProcessing,
    error,
    setUploadedFile,
    startTryOn,
    clear,
    inspectedItemName,
    inspectedGarmentType,
    setInspectedItem,
    couponCode,
    couponValue,
    couponValidUntil,
    setCoupon,
    clearCoupon,
  } = useTryOnStore();

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const eligibleItems = useMemo<TryOnEligibleItem[]>(() => {
    return cart.items
      .filter((item) => item.product?.colorVariants?.length)
      .map((item) => {
        const colorVariant = item.color
          ? item.product.colorVariants.find((cv) => cv.color === item.color)
          : item.product.colorVariants[0];
        return colorVariant?.tryOnImage
          ? { cartItem: item, colorVariant, product: item.product }
          : null;
      })
      .filter((x): x is TryOnEligibleItem => x !== null);
  }, [cart.items]);

  const complementaryItems = useMemo(() => {
    if (!inspectedGarmentType || activeItemIndex === null) return null;
    const compType = getComplementaryType(inspectedGarmentType);
    if (!compType) {
      if (inspectedGarmentType === "dresses") {
        const others = eligibleItems.filter(
          (_, idx) => idx !== activeItemIndex
        );
        if (!others.length) return null;
        const item = others[0];
        const dressName = eligibleItems[activeItemIndex].product.name;
        const otherName = item.product.name;
        const targetType = item.colorVariant.tryOnGarmentType || "upper_body";
        const templateKey = targetType as keyof typeof RECOMMENDATION_TEMPLATES.dresses;
        const template = RECOMMENDATION_TEMPLATES.dresses[templateKey];
        return {
          item,
          text: template ? template(dressName, otherName) : `این ${otherName} با ${dressName} ترکیب جالبی می‌شود!`,
          index: eligibleItems.indexOf(item),
        };
      }
      return null;
    }
    const match = eligibleItems.find(
      (item, idx) =>
        idx !== activeItemIndex &&
        (item.colorVariant.tryOnGarmentType || "upper_body") === compType
    );
    if (!match) return null;
    const activeItem = eligibleItems[activeItemIndex];
    const compTypeKey = compType as keyof typeof RECOMMENDATION_TEMPLATES;
    const srcTypeKey = inspectedGarmentType as keyof typeof RECOMMENDATION_TEMPLATES;
    const templates = RECOMMENDATION_TEMPLATES[srcTypeKey];
    const textFn = templates?.[compTypeKey];
    return {
      item: match,
      text: textFn
        ? textFn(activeItem.product.name, match.product.name)
        : `پیشنهاد می‌کنیم ${match.product.name} را هم پرو کنید!`,
      index: eligibleItems.indexOf(match),
    };
  }, [inspectedGarmentType, activeItemIndex, eligibleItems]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const handleTryOn = async (item: TryOnEligibleItem, index: number) => {
    setActiveItemIndex(index);
    clearCoupon();
    const garmentType = item.colorVariant.tryOnGarmentType || "upper_body";
    setInspectedItem(item.product.name, garmentType);
    await startTryOn(item.colorVariant.tryOnImage!, garmentType);
    initNegotiation(item);
  };

  const initNegotiation = (item: TryOnEligibleItem) => {
    setChatMessages([]);
    setCouponApplied(false);
    sendNegotiationMessage("سلام! می‌خوام یه تخفیف خوب برای این محصول بگیرم.", item);
  };

  const buildCartContext = (): { product_id: string; product_name: string; price: number; color?: string; size?: string }[] => {
    return eligibleItems.map((ei) => ({
      product_id: ei.product.id,
      product_name: ei.product.name,
      price: ei.product.price,
      color: ei.cartItem.colorName || ei.colorVariant.colorName,
      size: ei.cartItem.size,
    }));
  };

  const sendNegotiationMessage = async (message: string, item?: TryOnEligibleItem) => {
    const targetItem = item || (activeItemIndex !== null ? eligibleItems[activeItemIndex] : null);
    if (!targetItem) return;

    setChatLoading(true);
    const userMsg: ChatMessage = { role: "user", content: message };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);

    try {
      const tryonCtx = `${targetItem.product.name} - ${targetItem.colorVariant.colorName} - ${formatPrice(targetItem.product.price)}`;
      const res = await fetch("/api/tryon/negotiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          message,
          chat_history: chatMessages,
          cart_items: buildCartContext(),
          tryon_context: tryonCtx,
          tryon_product_id: targetItem.product.id,
          tryon_color: targetItem.colorVariant.color,
        }),
      });

      if (!res.ok) throw new Error("خطا در ارتباط با فروشنده");

      const data = await res.json();
      const agentMsg: ChatMessage = { role: "agent", content: data.reply };
      setChatMessages((prev) => [...prev, agentMsg]);

      if (data.coupon) {
        const c = data.coupon as CouponOffer;
        setCoupon(c.code, c.value, c.valid_until);
      }
    } catch {
      const errMsg: ChatMessage = {
        role: "agent",
        content: "متاسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفاً دوباره تلاش کنید.",
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    sendNegotiationMessage(msg);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await fetch("/api/tryon/apply-negotiated-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ code: couponCode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطا" }));
        alert(err.error || "خطا در اعمال کد تخفیف");
        return;
      }

      const data = await res.json();
      if (data.valid) {
        await applyPromoCode(couponCode);
        setCouponApplied(true);
      }
    } catch {
      alert("خطا در اعمال کد تخفیف");
    }
  };

  const handleClear = () => {
    clear();
    setActiveItemIndex(null);
    setChatMessages([]);
    setCouponApplied(false);
  };

  if (authLoading || cartLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-12 h-12 relative">
            <div className="absolute inset-0 border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft" />
            <div className="absolute inset-0 border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">در حال بارگذاری...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const activeItem = activeItemIndex !== null ? eligibleItems[activeItemIndex] : null;

  return (
    <div className="container py-8 md:py-12">
      <motion.div
        className="mb-8 md:mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream relative inline-block">
          <span className="relative z-10 flex items-center gap-3">
            <Camera className="h-7 w-7 md:h-8 md:w-8 text-voxcina-blue dark:text-voxcina-cream" />
            اتاق پرو مجازی
          </span>
          <span className="absolute bottom-1 left-0 right-0 h-3 bg-voxcina-cream/60 dark:bg-voxcina-blue/30 rounded-full -z-0 opacity-60" />
        </h1>
        <p className="text-sm md:text-base text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-3 mr-1">
          لباس‌های سبد خرید خود را روی تصویر خود امتحان کنید
        </p>
      </motion.div>

      {eligibleItems.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-16 md:py-24 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-24 h-24 bg-voxcina-cream/50 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center mb-6"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ShoppingBag className="h-12 w-12 text-voxcina-blue/30 dark:text-voxcina-cream/30" />
          </motion.div>
          <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-3">
            {cart.items.length === 0 ? "سبد خرید شما خالی است" : "محصولات سبد خرید قابلیت پرو مجازی ندارند"}
          </h2>
          <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6 max-w-md">
            {cart.items.length === 0
              ? "ابتدا محصولات مورد نظر خود را به سبد خرید اضافه کنید، سپس برای پرو مجازی به این صفحه بازگردید."
              : "محصولاتی که تصویر پرو مجازی دارند در اینجا نمایش داده می‌شوند."}
          </p>
          <Link href="/products">
            <Button variant="primary" size="lg">مشاهده محصولات</Button>
          </Link>
        </motion.div>
      )}

      {eligibleItems.length > 0 && (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left sidebar: photo upload + cart items */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm backdrop-blur-sm p-5"
              variants={itemVariants}
            >
              <h3 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                تصویر شما
              </h3>
              <label className="block cursor-pointer">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300",
                    uploadedPreview
                      ? "border-voxcina-blue/30 dark:border-voxcina-cream/30"
                      : "border-voxcina-cream/50 dark:border-voxcina-blue/30 hover:border-voxcina-blue/40 dark:hover:border-voxcina-cream/40"
                  )}
                >
                  {uploadedPreview ? (
                    <div className="relative">
                      <img src={uploadedPreview} alt="تصویر شما" className="max-h-48 w-auto mx-auto rounded-lg shadow object-contain" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleClear(); }}
                        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <Camera className="h-10 w-10 mx-auto text-voxcina-blue/30 dark:text-voxcina-cream/30 mb-2" />
                      <p className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50">برای انتخاب تصویر کلیک کنید</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </motion.div>

            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm backdrop-blur-sm p-5"
              variants={itemVariants}
            >
              <h3 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                محصولات سبد خرید ({eligibleItems.length})
              </h3>
              <div className="space-y-3 max-h-[50vh] lg:max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
                <AnimatePresence>
                  {eligibleItems.map((item, idx) => (
                    <motion.div
                      key={item.cartItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer",
                        activeItemIndex === idx
                          ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue/5 dark:bg-voxcina-cream/5 shadow-sm"
                          : "border-voxcina-cream/20 dark:border-voxcina-blue/20 hover:border-voxcina-blue/30 dark:hover:border-voxcina-cream/30 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20",
                        !uploadedFile && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (!uploadedFile || isProcessing) return;
                        handleTryOn(item, idx);
                      }}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0">
                        <BackendImage src={getCartItemImage(item.cartItem)} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream truncate">{item.product.name}</p>
                        <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5">
                          {item.cartItem.colorName || item.colorVariant.colorName}
                          {item.cartItem.size && ` — سایز ${item.cartItem.size}`}
                        </p>
                        <p className="text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-0.5">{formatPrice(item.product.price)}</p>
                      </div>
                      <motion.div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                          !uploadedFile || isProcessing
                            ? "bg-voxcina-cream/30 dark:bg-voxcina-blue/30"
                            : "bg-voxcina-blue/10 dark:bg-voxcina-cream/10 group-hover:bg-voxcina-blue dark:group-hover:bg-voxcina-cream"
                        )}
                        whileHover={uploadedFile && !isProcessing ? { scale: 1.1 } : {}}
                        whileTap={uploadedFile && !isProcessing ? { scale: 0.95 } : {}}
                      >
                        <Shirt className={cn("h-4 w-4", !uploadedFile || isProcessing ? "text-voxcina-blue/30 dark:text-voxcina-cream/30" : "text-voxcina-blue dark:text-voxcina-cream")} />
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {!uploadedFile && (
                <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-3 text-center">ابتدا تصویر خود را آپلود کنید</p>
              )}
            </motion.div>
          </div>

          {/* Right: unified panel — tryon result + negotiation */}
          <div className="lg:col-span-2">
            <motion.div
              className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm backdrop-blur-sm min-h-[400px] flex flex-col"
              variants={itemVariants}
            >
              <div className="flex-1 p-5 flex flex-col gap-5">
                {/* --- TRYON RESULT SECTION --- */}
                {/* Processing */}
                {isProcessing && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 relative">
                      <div className="absolute inset-0 border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft" />
                      <div className="absolute inset-0 border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      {activeItem ? `در حال پرو مجازی ${activeItem.product.name}...` : "در حال پردازش..."}
                    </p>
                  </div>
                )}

                {/* Error */}
                {!isProcessing && error && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleClear}>تلاش مجدد</Button>
                  </div>
                )}

                {/* Empty state (no processing, no error, no result) */}
                {!isProcessing && !error && !resultImage && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      className="w-20 h-20 bg-voxcina-cream/50 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Shirt className="h-10 w-10 text-voxcina-blue/20 dark:text-voxcina-cream/20" />
                    </motion.div>
                    <p className="text-sm text-voxcina-blue/40 dark:text-voxcina-cream/40 text-center max-w-xs">
                      تصویر خود را آپلود کنید و روی یکی از محصولات کلیک کنید<br />تا نتیجه پرو مجازی را ببینید
                    </p>
                  </div>
                )}

                {/* Result: images side by side */}
                {!isProcessing && !error && resultImage && (
                  <div>
                    {activeItem && (
                      <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-4 flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {activeItem.product.name} — {activeItem.colorVariant.colorName}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {uploadedPreview && (
                        <div className="aspect-square relative rounded-xl overflow-hidden border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm">
                          <img src={uploadedPreview} alt="تصویر شما" className="object-cover w-full h-full" />
                          <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">تصویر اصلی</div>
                        </div>
                      )}
                      <div className="aspect-square relative rounded-xl overflow-hidden border border-voxcina-blue/20 dark:border-voxcina-cream/20 shadow-sm">
                        <img src={resultImage} alt="نتیجه پرو مجازی" className="object-cover w-full h-full" />
                        <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-voxcina-blue/80 text-voxcina-blue dark:text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">با لباس</div>
                      </div>
                    </div>

                    {/* Cross-category recommendation */}
                    {complementaryItems && (
                      <motion.div
                        className="mt-4 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-xl border border-voxcina-blue/10 dark:border-voxcina-cream/10 p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">پیشنهاد ویژه</p>
                        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-3">{complementaryItems.text}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleTryOn(complementaryItems.item, complementaryItems.index)}
                          disabled={!uploadedFile || isProcessing}
                        >
                          <Shirt className="h-3 w-3 ml-1" />
                          پرو کن
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* --- NEGOTIATION SECTION --- */}
                {resultImage && !isProcessing && !error && (
                  <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-4">
                    <h3 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream mb-3 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      مذاکره با فروشنده
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin mb-3">
                      <AnimatePresence>
                        {chatMessages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex items-start gap-2",
                              msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                                msg.role === "user"
                                  ? "bg-voxcina-blue text-white rounded-bl-none"
                                  : "bg-voxcina-cream/50 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream rounded-br-none"
                              )}
                            >
                              {msg.content}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Coupon card */}
                      {couponCode && (
                        <motion.div
                          className="bg-gradient-to-r from-voxcina-blue/5 to-voxcina-blue/10 dark:from-voxcina-cream/5 dark:to-voxcina-cream/10 border-2 border-voxcina-blue dark:border-voxcina-cream rounded-xl p-4"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", damping: 25, stiffness: 400 }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Tag className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream" />
                            <span className="font-bold text-voxcina-blue dark:text-voxcina-cream">کد تخفیف {couponValue}٪</span>
                          </div>
                          <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-3">
                            کد: <span className="font-mono font-bold text-voxcina-blue dark:text-voxcina-cream select-all">{couponCode}</span>
                          </div>
                          <div className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mb-3">
                            معتبر تا: {new Date(couponValidUntil!).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {couponApplied ? (
                            <p className="text-xs text-green-600 font-medium">کد تخفیف روی سبد خرید شما اعمال شد</p>
                          ) : (
                            <Button variant="primary" size="sm" onClick={handleApplyCoupon}>
                              اعمال کد روی سبد خرید
                            </Button>
                          )}
                        </motion.div>
                      )}

                      {chatLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-voxcina-blue/30 dark:bg-voxcina-cream/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-voxcina-blue/30 dark:bg-voxcina-cream/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-voxcina-blue/30 dark:bg-voxcina-cream/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </motion.div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat input */}
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="پیام به فروشنده..."
                        className="flex-1 bg-white dark:bg-voxcina-blue/20 border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream placeholder:text-voxcina-blue/30 focus:outline-none focus:border-voxcina-blue dark:focus:border-voxcina-cream transition-colors"
                        disabled={chatLoading}
                      />
                      <Button type="submit" variant="primary" size="sm" disabled={chatLoading || !chatInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
