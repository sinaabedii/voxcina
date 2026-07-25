"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Camera, Shirt, ShoppingBag, Tag, Send,
  Sparkles, User, Upload, Lock, Check, X, RefreshCw, Maximize2, Layers, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useCartStore } from "@/store/cart-store";
import { useTryOnStore } from "@/store/tryon-store";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { cn, formatPrice } from "@/lib/utils";
import { ColorVariant, Product } from "@/types/product";
import { CartItem } from "@/types/cart";
import Button from "@/components/ui/Button";
import BackendImage from "@/components/BackendImage";
import BeforeAfterSlider from "@/components/ui/BeforeAfterSlider";
import CountdownTimer from "@/components/ui/CountdownTimer";
import ImageCropModal from "@/components/ui/ImageCropModal";
import Modal from "@/components/ui/Modal";
import SizeSelector from "@/components/ui/SizeSelector";
import { activityTracker } from "@/lib/activity-tracker";
import {
  TryonChatMessage as DbTryonChatMessage,
  makeMessageId as makeDbMessageId,
} from "@/lib/tryon-api";
import {
  findColorVariant,
  getCanonicalColor,
  getCartItemImage,
  getProductDisplayImage,
} from "@/lib/product-variants";

interface TryOnEligibleItem {
  cartItem: CartItem;
  colorVariant: ColorVariant;
  product: Product;
}

interface ChatMessage {
  role: "user" | "agent" | "agent_streaming" | "tryon" | "tryon_processing";
  content: string;
  tryonData?: {
    roomNumber?: number;
    beforeImage?: string;
    afterImage?: string;
    productName?: string;
    processingId?: number;
  };
}

const toPersianDigits = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });

interface CouponOffer {
  code: string;
  value: number;
  valid_until: string;
  product_ids: string[];
}

interface RecommendedProduct {
  product_id: string;
  product_name: string;
  price: number;
  image: string;
  color?: string;
  color_name?: string;
  size?: string;
  selected_color?: string;
  product?: Product;
}

const RECOMMENDATION_TEMPLATES: Record<string, Record<string, (a: string, b: string) => string>> = {
  upper_body: {
    lower_body: (upper, lower) =>
      `این ${lower} ست فوق‌العاده‌ای با ${upper} انتخابی شما می‌شود!`,
  },
  lower_body: {
    upper_body: (lower, upper) =>
      `یک ${upper} شیک می‌تواند این ${lower} را به یک تیپ کامل تبدیل کند.`,
  },
  dresses: {
    upper_body: (dress, other) => `این ${other} همراه با ${dress} استایل لایه‌ای جذابی می‌سازد.`,
    lower_body: (dress, other) => `این ${other} با ${dress} ترکیب جالبی می‌شود!`,
  },
};

const QUICK_REPLIES: string[] = [];

const NEGOTIATION_OPENERS = [
  { icon: Tag, text: "سلام! می‌خوام یه تخفیف خوب برای این محصول بگیرم." },
  { icon: Sparkles, text: "سلام سارا! این قیمت برام کمی بالاست، می‌تونی کمک کنی؟" },
  { icon: ShoppingBag, text: "سلام! اگه تخفیف خوبی بدی همین الان خرید می‌کنم." },
  { icon: Layers, text: "یه ست پیشنهاد بده" },
];

function getComplementaryType(garmentType: string): string {
  if (garmentType === "upper_body") return "lower_body";
  if (garmentType === "lower_body") return "upper_body";
  return "";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};


export default function TryOnRoomPage() {
  const { isLoading: authLoading, isAuthorized, user } = useProtectedRoute({ requiredAuth: true });
  const { cart, isLoading: cartLoading, addItem, applyNegotiatedDiscount } = useCartStore();
  const {
    uploadedPreview,
    uploadedFile,
    resultImage,
    isProcessing,
    error,
    setUploadedFile,
    setUploadedPreview,
    setResultImage,
    startTryOn,
    clear,
    clearResult,
    inspectedItemName,
    inspectedGarmentType,
    setInspectedItem,
    clearInspectedItem,
    couponCode,
    couponValue,
    couponValidUntil,
    couponProductIds,
    setCoupon,
    clearCoupon,
    chatId,
    persistedMessages,
    persistedTryons,
    isLoadingSession,
    ensureChatId,
    loadSession,
    persistMessage,
    persistTryonMessage,
    setCurrentTryonId,
    startNewRoom,
  } = useTryOnStore();

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponExpired, setCouponExpired] = useState(false);
  const [recommendedProduct, setRecommendedProduct] = useState<RecommendedProduct | null>(null);
  const [recommendedAdding, setRecommendedAdding] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [sizeModalSize, setSizeModalSize] = useState<string | undefined>(undefined);
  const [couponApplying, setCouponApplying] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tryOnCount, setTryOnCount] = useState(0);
  const [showNegotiationPrompt, setShowNegotiationPrompt] = useState(false);
  const [compareModalData, setCompareModalData] = useState<{ beforeImage: string; afterImage: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"products" | "chat">("products");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const negotiationInitializedRef = useRef(false);

  const computeEligibleItems = useCallback((items: CartItem[]): TryOnEligibleItem[] => {
    return items
      .filter((item) => item.product?.colorVariants?.length)
      .map((item) => {
        const colorVariant = findColorVariant(item.product, item.color, item.colorName) || item.product.colorVariants[0];
        return colorVariant?.tryOnImage
          ? { cartItem: item, colorVariant, product: item.product }
          : null;
      })
      .filter((x): x is TryOnEligibleItem => x !== null);
  }, []);

  const eligibleItems = useMemo<TryOnEligibleItem[]>(
    () => computeEligibleItems(cart.items),
    [cart.items, computeEligibleItems]
  );

  const complementaryItems = useMemo(() => {
    if (!inspectedGarmentType || activeItemIndex === null) return null;
    const compType = getComplementaryType(inspectedGarmentType);
    if (!compType) {
      if (inspectedGarmentType === "dresses") {
        const others = eligibleItems.filter((_, idx) => idx !== activeItemIndex);
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

  const steps = [
    { label: "آپلود عکس", done: !!(uploadedFile || uploadedPreview) },
    { label: "انتخاب لباس", done: activeItemIndex !== null },
    { label: "نتیجه + مذاکره", done: !!resultImage && !error },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompareModalData(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Load persisted chat session for this user on mount
  useEffect(() => {
    if (!isAuthorized) return;
    const id = ensureChatId();
    loadSession(id).then(() => {
      // restore handled by store.loadSession (sets persistedMessages/persistedTryons)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // Single hydration effect: restore persisted messages OR show welcome on first visit.
  // Consolidates welcome + hydration to eliminate race conditions that caused
  // duplicate welcome messages.
  const hydratedForChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chatId) return;
    if (hydratedForChatIdRef.current === chatId) return;
    if (isLoadingSession) return;

    if (persistedMessages.length > 0) {
      // Restore from DB
      const tryonPersonImageMap = new Map<string, string>();
      for (const t of persistedTryons) {
        if (t.tryon_id && t.person_image_url) {
          tryonPersonImageMap.set(t.tryon_id, t.person_image_url);
        }
      }

      const restored: ChatMessage[] = persistedMessages.map((m) => {
        if (m.role === "tryon" && m.tryon_data) {
          let beforeImg = m.tryon_data.before_image || "";
          if (beforeImg.startsWith("blob:") && m.tryon_data.tryon_id) {
            const backendUrl = tryonPersonImageMap.get(m.tryon_data.tryon_id);
            if (backendUrl) beforeImg = backendUrl;
          }
          return {
            role: "tryon",
            content: m.content,
            tryonData: {
              roomNumber: m.tryon_data.room_number,
              beforeImage: beforeImg,
              afterImage: m.tryon_data.after_image,
              productName: m.tryon_data.product_name,
              tryonId: m.tryon_data.tryon_id,
            },
          };
        }
        if (m.role === "user" || m.role === "agent") {
          return { role: m.role as "user" | "agent", content: m.content };
        }
        return { role: "agent", content: m.content };
      });
      setChatMessages(restored);

      // Restore recommended product from the last agent message with a tool_call
      const lastRecMsg = [...persistedMessages].reverse().find(
        (m) => m.role === "agent" && (m.tool_call?.result as any)?.recommended_product
      );
      if (lastRecMsg?.tool_call?.result) {
        const rp = (lastRecMsg.tool_call.result as any).recommended_product;
        if (rp) setRecommendedProduct(rp as RecommendedProduct);
      }
    } else if (eligibleItems.length > 0 && chatMessages.length === 0) {
      // First visit — no persisted messages, cart has eligible items: show welcome
      const firstName = user?.name?.split(" ")[0] || "رفیق";
      const welcomeText = `سلام ${firstName} جان، سارا هستم! لباستو پرو کن خریدت رو نهایی کنیم.`;
      setChatMessages([{ role: "agent", content: welcomeText }]);
      persistMessage({
        id: makeDbMessageId(),
        role: "agent",
        content: welcomeText,
        timestamp: new Date().toISOString(),
      });
    }

    hydratedForChatIdRef.current = chatId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isLoadingSession, eligibleItems.length]);

  // After hydration, restore negotiation prompt visibility.
  // Show prompts if a try-on result exists and the user hasn't used an opener yet.
  const negotiationRestoredRef = useRef(false);
  useEffect(() => {
    if (negotiationRestoredRef.current) return;
    if (!hydratedForChatIdRef.current || isLoadingSession) return;
    if (!resultImage || chatMessages.length === 0) return;

    negotiationRestoredRef.current = true;
    const openerTexts = new Set(NEGOTIATION_OPENERS.map((o) => o.text));
    const userUsedOpener = chatMessages.some((m) => m.role === "user" && openerTexts.has(m.content));
    if (!userUsedOpener) {
      setShowNegotiationPrompt(true);
      negotiationInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultImage, chatMessages.length, isLoadingSession]);

  // When persisted tryons are loaded, restore garment/inspected-item UI state.
  // uploadedPreview, resultImage, and currentTryonId are already restored by
  // loadSession() in the store — this effect only fills in the page-local state
  // (inspectedItem) that the store doesn't own.
  const restoredFromDbRef = useRef(false);
  useEffect(() => {
    if (restoredFromDbRef.current) return;
    if (!persistedTryons.length) return;
    const done = persistedTryons.filter((t) => t.status === "done");
    if (!done.length) return;
    const last = done[done.length - 1];
    if (last.garment_product_name && !inspectedItemName) {
      setInspectedItem(last.garment_product_name, last.garment_type);
    }
    restoredFromDbRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedTryons.length]);

  // Reset hydration flag when the user starts a fresh room (after clear)
  useEffect(() => {
    if (!chatId) {
      hydratedForChatIdRef.current = null;
      restoredFromDbRef.current = false;
    }
  }, [chatId]);

  const openCropModal = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
    // reset file input so the same file can be re-selected after cancel
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openCropModal(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      openCropModal(file);
    } else if (file) {
      toast.error("لطفاً یک فایل تصویری انتخاب کنید");
    }
  };

  const handleTryOn = async (item: TryOnEligibleItem, index: number) => {
    setActiveItemIndex(index);
    const garmentType = item.colorVariant.tryOnGarmentType || "upper_body";
    setInspectedItem(item.product.name, garmentType);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileTab("chat");
    }

    const processingId = Date.now();
    const procMsg: ChatMessage = {
      role: "tryon_processing",
      content: item.product.name,
      tryonData: { processingId, productName: item.product.name },
    };
    setChatMessages((prev) => [...prev, procMsg]);

    try {
      // After reload, uploadedFile is null but uploadedPreview is set from DB.
      // Recreate the File from the persisted image URL so it gets sent in the
      // tryon request.
      if (!uploadedFile && uploadedPreview) {
        const imgRes = await fetch(uploadedPreview);
        const blob = await imgRes.blob();
        const ext = blob.type === "image/png" ? "png" : "jpg";
        const file = new File([blob], `person.${ext}`, { type: blob.type || "image/jpeg" });
        useTryOnStore.setState({ uploadedFile: file });
      }
      await startTryOn(item.colorVariant.tryOnImage!, garmentType);
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.tryonData?.processingId !== processingId));
      return;
    }

    const store = useTryOnStore.getState();
    if (!store.resultImage) {
      setChatMessages((prev) => prev.filter((m) => m.tryonData?.processingId !== processingId));
      return;
    }

    const newCount = tryOnCount + 1;
    setTryOnCount(newCount);
    const newMsg: ChatMessage = {
      role: "tryon",
      content: `اتاق پرو ${toPersianDigits(newCount)}`,
      tryonData: {
        roomNumber: newCount,
        beforeImage: store.uploadedPreview || "",
        afterImage: store.resultImage || "",
        productName: item.product.name,
      },
    };
    setChatMessages((prev) => prev.map((m) =>
      m.tryonData?.processingId === processingId ? newMsg : m
    ));

    // Persist the tryon card to the chat transcript
    const colorVariant = item.colorVariant;
    const liveState = useTryOnStore.getState();
    persistTryonMessage({
      tryon_id: liveState.currentTryonId || "",
      product_id: item.product.id,
      product_name: item.product.name,
      color: colorVariant?.colorName || colorVariant?.color,
      size: item.cartItem.size,
      garment_type: garmentType,
      before_image: store.uploadedPreview || "",
      after_image: store.resultImage || "",
      room_number: newCount,
    });

    // Activity tracking — tryon page is auth-gated (useProtectedRoute
    // requiredAuth:true) so every visitor is a logged-in user. The
    // activity tracker attaches user_id from the JWT context; no
    // session_id / anonymous fallback is needed here. Other activity
    // sections (cart, checkout, product pages) are untouched.
    const activityMeta: Record<string, unknown> = {
      tryon_id: liveState.currentTryonId || "",
      chat_id: liveState.chatId || "",
      product_id: item.product.id,
      product_name: item.product.name,
      garment_type: garmentType,
      room_number: newCount,
      color: colorVariant?.colorName || colorVariant?.color,
      size: item.cartItem.size,
    };
    activityTracker.trackImageViewed(
      item.product.id,
      item.product.name,
      0,
      1,
      "tryon_result",
      undefined,
      { ...activityMeta, stage: "after_generation" }
    );

    if (!negotiationInitializedRef.current) {
      negotiationInitializedRef.current = true;
      setCouponApplied(false);
      setCouponExpired(false);
      setShowNegotiationPrompt(true);
      activityTracker.trackChatStarted({
        ...activityMeta,
        context: "coupon_negotiation",
        trigger: "post_tryon",
        cartItemCount: cart.items.length,
      });
    }
  };

  const handleSelectOpener = (text: string, item: TryOnEligibleItem) => {
    setShowNegotiationPrompt(false);
    setCouponApplied(false);
    setCouponExpired(false);
    sendNegotiationMessage(text, item);
  };

  const buildRecommendedProduct = (rec: RecommendedProduct): Product => {
    if (rec.product) return rec.product;
    const selectedColor = rec.selected_color || rec.color || rec.color_name || "";
    const selectedColorName = rec.color_name || rec.selected_color || rec.color || "";
    return {
      id: rec.product_id,
      name: rec.product_name,
      description: "",
      price: rec.price,
      originalPrice: rec.price,
      mainImages: rec.image ? [rec.image] : [],
      colorVariants: [{
        color: selectedColor,
        colorName: selectedColorName,
        images: rec.image ? [rec.image] : [],
        tryOnImage: rec.image,
        tryOnGarmentType: "upper_body",
        sizes: rec.size ? [{ size: rec.size, quantity: 99, sku: "" }] : [],
      }],
      category_ids: [],
      brand_id: "",
      attributes: [],
      is_flash_sale: false,
      is_active: true,
      inStock: true,
      created_at: "",
      updated_at: "",
    };
  };

  const getRecommendedColor = (rec: RecommendedProduct): string | undefined => {
    const variant = rec.product
      ? findColorVariant(rec.product, rec.selected_color || rec.color, rec.color_name)
      : undefined;
    return getCanonicalColor(variant) || rec.selected_color || rec.color || rec.color_name || undefined;
  };

  const getRecommendedColorName = (rec: RecommendedProduct): string | undefined => {
    const variant = rec.product
      ? findColorVariant(rec.product, rec.selected_color || rec.color, rec.color_name)
      : undefined;
    return variant?.colorName || rec.color_name || rec.selected_color || rec.color || undefined;
  };

  const getRecommendedSize = (rec: RecommendedProduct): string | undefined => {
    if (rec.size) return rec.size;
    if (!rec.product) return undefined;
    const color = getRecommendedColor(rec);
    const cv = findColorVariant(rec.product, color, rec.color_name);
    return cv?.sizes?.[0]?.size;
  };

  const getRecommendedSizeOptions = (rec: RecommendedProduct): { all: string[]; available: string[] } => {
    const color = getRecommendedColor(rec);
    const colorName = getRecommendedColorName(rec);
    const variant = rec.product ? findColorVariant(rec.product, color, colorName) : undefined;
    if (variant?.sizes?.length) {
      return {
        all: variant.sizes.map((s) => s.size),
        available: variant.sizes.filter((s) => s.quantity > 0).map((s) => s.size),
      };
    }
    if (rec.size) return { all: [rec.size], available: [rec.size] };
    return { all: [], available: [] };
  };

  const getRecommendedDisplayImage = (rec: RecommendedProduct): string | null => {
    const image = getProductDisplayImage(rec.product, getRecommendedColor(rec), getRecommendedColorName(rec));
    if (image) return image;
    return rec.image || null;
  };

  const matchesRecommendedVariant = (item: TryOnEligibleItem, rec: RecommendedProduct): boolean => {
    const color = getRecommendedColor(rec);
    const colorName = getRecommendedColorName(rec);
    return item.product.id === rec.product_id && !!findColorVariant([item.colorVariant], color, colorName);
  };

  const tryOnRecommendedProduct = async (rec: RecommendedProduct) => {
    const color = getRecommendedColor(rec);
    const size = getRecommendedSize(rec);
    const colorName = getRecommendedColorName(rec);
    const currentItems = computeEligibleItems(useCartStore.getState().cart.items);
    let index = currentItems.findIndex((ei) => matchesRecommendedVariant(ei, rec));
    if (index === -1) {
      const product = buildRecommendedProduct(rec);
      await addItem(product, 1, size, color, colorName);
      const updatedItems = computeEligibleItems(useCartStore.getState().cart.items);
      index = updatedItems.findIndex((ei) => matchesRecommendedVariant(ei, rec));
      if (index !== -1) {
        await handleTryOn(updatedItems[index], index);
      }
    } else {
      await handleTryOn(currentItems[index], index);
    }
  };

  const addRecommendedToCart = async (rec: RecommendedProduct, size?: string) => {
    const color = getRecommendedColor(rec);
    const resolvedSize = size || getRecommendedSize(rec);
    const colorName = getRecommendedColorName(rec);
    const currentItems = computeEligibleItems(useCartStore.getState().cart.items);
    const exists = currentItems.some((ei) => matchesRecommendedVariant(ei, rec));
    if (!exists) {
      const product = buildRecommendedProduct(rec);
      await addItem(product, 1, resolvedSize, color, colorName);
      toast.success("به سبد خرید اضافه شد");
    } else {
      toast.info("این محصول در سبد خرید شما موجود است");
    }
  };

  const buildCartContext = (): { product_id: string; product_name: string; price: number; color?: string; color_name?: string; selected_color?: string; size?: string }[] => {
    const latestItems = computeEligibleItems(useCartStore.getState().cart.items);
    return latestItems.map((ei) => ({
      product_id: ei.product.id,
      product_name: ei.product.name,
      price: ei.product.price,
      color: getCanonicalColor(ei.colorVariant) || ei.cartItem.color,
      color_name: ei.cartItem.colorName || ei.colorVariant.colorName,
      selected_color: getCanonicalColor(ei.colorVariant) || ei.cartItem.color,
      size: ei.cartItem.size,
    }));
  };

  const sendNegotiationMessage = async (message: string, item?: TryOnEligibleItem) => {
    const targetItem = item || (activeItemIndex !== null ? eligibleItems[activeItemIndex] : null);
    if (!targetItem) return;

    setChatLoading(true);
    setRecommendedProduct(null);
    const userMsg: ChatMessage = { role: "user", content: message };
    setChatMessages((prev) => [...prev, userMsg]);

    // Persist user message
    persistMessage({
      id: makeDbMessageId(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Snapshot live state for the body
    const liveState = useTryOnStore.getState();

    try {
      const tryonCtx = `${targetItem.product.name} - ${targetItem.colorVariant.colorName} - ${formatPrice(targetItem.product.price)}`;
      const res = await fetch("/api/tryon/negotiate-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          message,
          chat_history: chatMessages.filter((m) => m.role === "user" || m.role === "agent"),
          cart_items: buildCartContext(),
          tryon_context: tryonCtx,
          tryon_product_id: targetItem.product.id,
          tryon_color: getCanonicalColor(targetItem.colorVariant) || targetItem.colorVariant.colorName,
          tryon_id: liveState.currentTryonId || "",
          chat_id: liveState.chatId || "",
        }),
      });

      if (!res.ok || !res.body) throw new Error("خطا در ارتباط با فروشنده");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let agentContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              agentContent += data.text;
              setChatMessages((prev) => {
                const copy = [...prev];
                const lastIdx = copy.length - 1;
                if (copy[lastIdx]?.role === "agent_streaming") {
                  copy[lastIdx] = { role: "agent_streaming", content: agentContent } as ChatMessage;
                } else {
                  copy.push({ role: "agent_streaming", content: agentContent } as ChatMessage);
                }
                return copy;
              });
            } else if (data.type === "done") {
              agentContent = data.reply || agentContent;
              setChatMessages((prev) => {
                const copy = [...prev];
                const lastIdx = copy.length - 1;
                if (copy[lastIdx]?.role === "agent_streaming") {
                  copy[lastIdx] = { role: "agent", content: agentContent } as ChatMessage;
                } else {
                  copy.push({ role: "agent", content: agentContent } as ChatMessage);
                }
                return copy;
              });

              if (data.coupon) {
                const c = data.coupon as CouponOffer;
                setCoupon(c.code, c.value, c.valid_until, c.product_ids);
                setCouponExpired(false);
              }
              let recProduct: RecommendedProduct | null = null;
              if (data.complementary_products?.length > 0) {
                const compID = data.coupon ? (data.coupon as any).comp_product_id : undefined;
                const match = compID
                  ? data.complementary_products.find((p: any) => p.product_id === compID)
                  : undefined;
                recProduct = (match || data.complementary_products[0]) as RecommendedProduct;
                setRecommendedProduct(recProduct);
              }

              // Persist agent message (with tool call if present) and coupon
              const agentPersistMsg: DbTryonChatMessage = {
                id: makeDbMessageId(),
                role: "agent",
                content: agentContent,
                timestamp: new Date().toISOString(),
              };
              if (data.coupon) {
                agentPersistMsg.tool_call = {
                  name: "offer_coupon",
                  arguments: {
                    product_id: targetItem.product.id,
                    comp_product_id: (data.coupon as any).comp_product_id || "",
                    message: agentContent,
                  },
                  result: {
                    code: (data.coupon as any).code,
                    value: (data.coupon as any).value,
                    valid_until: (data.coupon as any).valid_until,
                    product_ids: (data.coupon as any).product_ids || [],
                    ...(recProduct && { recommended_product: recProduct }),
                  },
                };
              }
              persistMessage(agentPersistMsg);
            } else if (data.type === "error") {
              throw new Error(data.error || "خطا در مذاکره");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }

        if (done) break;
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        role: "agent",
        content: "وای رفیق ببخشید، الان یه لحظه سرم شلوغ شد و صدات به من نرسید! یه بار دیگه بگو چی می‌خواستی.",
      };
      setChatMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (copy[lastIdx]?.role === "agent_streaming") {
          copy.splice(lastIdx, 1);
        }
        copy.push(errMsg);
        return copy;
      });
      persistMessage({
        id: makeDbMessageId(),
        role: "agent",
        content: errMsg.content,
        timestamp: new Date().toISOString(),
      });
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

  const handleQuickReply = (text: string) => {
    if (chatLoading) return;
    sendNegotiationMessage(text);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode || couponApplying || couponExpired) return;

    // Check that ALL required products (main + complementary) are in cart
    if (couponProductIds.length > 0) {
      const cartItems = useCartStore.getState().cart.items;
      const missingProducts = couponProductIds.filter(
        (pid) => !cartItems.some((item) => item.productId === pid)
      );
      if (missingProducts.length > 0) {
        toast.warning("این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی در سبد خرید باشند");
        return;
      }
    }

    setCouponApplying(true);
    try {
      const cartProductIds = useCartStore.getState().cart.items.map((item) => item.productId);
      const res = await fetch("/api/tryon/apply-negotiated-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ code: couponCode, cart_items: cartProductIds }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطا" }));
        toast.error(err.error || "خطا در اعمال کد تخفیف");
        return;
      }

      const data = await res.json();
      if (data.valid && data.discount) {
        applyNegotiatedDiscount(data.discount);
        setCouponApplied(true);
        toast.success("کد تخفیف اعمال شد!");
      }
    } catch {
      toast.error("خطا در اعمال کد تخفیف");
    } finally {
      setCouponApplying(false);
    }
  };

  const handleClearImage = () => {
    setUploadedFile(null);
    setActiveItemIndex(null);
  };

  const handleClearAll = () => {
    clear();
    setActiveItemIndex(null);
    setChatMessages([]);
    setCouponApplied(false);
    setCouponExpired(false);
    setTryOnCount(0);
    setCompareModalData(null);
    setShowNegotiationPrompt(false);
    negotiationInitializedRef.current = false;
    negotiationRestoredRef.current = false;
    setMobileTab("products");
  };

  const handleStartNewRoom = useCallback(() => {
    startNewRoom();
    setActiveItemIndex(null);
    setChatMessages([]);
    setRecommendedProduct(null);
    setCouponApplied(false);
    setCouponExpired(false);
    setTryOnCount(0);
    setCompareModalData(null);
    setShowNegotiationPrompt(false);
    negotiationInitializedRef.current = false;
    negotiationRestoredRef.current = false;
    hydratedForChatIdRef.current = null;
    restoredFromDbRef.current = false;
  }, [startNewRoom]);

  const handleClearResult = () => {
    clearResult();
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

  // Find the negotiation target: prefer the actively selected item, then
  // fall back to the item matching the last try-on's inspected name, then
  // the first eligible item. Used by negotiation prompts which should work
  // even when no product is explicitly selected (e.g. after page reload).
  const negotiationTargetItem: TryOnEligibleItem | null =
    activeItem
    ?? (inspectedItemName
      ? eligibleItems.find((el) => el.product.name === inspectedItemName) ?? null
      : null)
    ?? eligibleItems[0]
    ?? null;

  return (
    <div className="container py-4 md:py-6 flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header with highlighter */}
      <motion.div
        className="mb-3 md:mb-4 flex-shrink-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-voxcina-blue flex items-center justify-center shadow-inset-button">
            <Camera className="h-4 w-4 text-voxcina-cream" />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-voxcina-blue dark:text-voxcina-cream relative">
            اتاق پرو مجازی
            <span className="absolute -bottom-1 right-0 left-0 h-2.5 bg-secondary-300/50 dark:bg-voxcina-blue/20 rounded-full -z-10" />
          </h1>
        </div>
        <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mr-10">
          هوش مصنوعی، لباس‌ها را روی عکس شما پرو می‌کند و سارا به شما تخفیف می‌دهد
        </p>
      </motion.div>

      {/* Step indicator */}
      {eligibleItems.length > 0 && (
        <div className="flex items-center gap-1 md:gap-2 mb-3 md:mb-4 flex-shrink-0">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-1 md:gap-2">
              {idx > 0 && (
                <div className={cn(
                  "w-4 md:w-8 h-0.5 rounded-full transition-colors",
                  step.done ? "bg-voxcina-blue/15" : idx === currentStep ? "bg-voxcina-blue/30" : "bg-secondary-300/50 dark:bg-voxcina-blue/20"
                )} />
              )}
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                  step.done
                    ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
                    : idx === currentStep
                    ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button animate-pulse-soft"
                    : "bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40"
                )}>
                  {step.done ? <Check className="h-3 w-3" /> : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] md:text-xs transition-colors hidden sm:inline",
                  step.done
                    ? "text-voxcina-blue dark:text-voxcina-cream font-medium"
                    : idx === currentStep
                    ? "text-voxcina-blue dark:text-voxcina-cream font-medium"
                    : "text-voxcina-blue/40 dark:text-voxcina-cream/40"
                )}>
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {eligibleItems.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-16 text-center flex-1 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative gradient wash — Lovable-style atmospheric */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-400/8 rounded-full blur-3xl animate-pulse-soft" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-400/6 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
            <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-400/6 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "3s" }} />
          </div>

          <motion.div
            className="w-20 h-20 rounded-2xl bg-background border border-secondary-300 dark:border-voxcina-blue/20 flex items-center justify-center mb-4 relative z-10 shadow-inset-button"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShoppingBag className="h-10 w-10 text-voxcina-blue/30 dark:text-voxcina-cream/30" />
          </motion.div>
          <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream mb-2 relative z-10">
            {cart.items.length === 0 ? "سبد خرید شما خالی است" : "محصولات سبد خرید قابلیت پرو مجازی ندارند"}
          </h2>
          <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-4 max-w-md relative z-10">
            {cart.items.length === 0
              ? "ابتدا محصولات مورد نظر خود را به سبد خرید اضافه کنید، سپس برای پرو مجازی به این صفحه بازگردید."
              : "محصولاتی که تصویر پرو مجازی دارند در اینجا نمایش داده می‌شوند."}
          </p>
          <Link href="/products" className="relative z-10">
            <Button variant="primary" size="lg">مشاهده محصولات</Button>
          </Link>
        </motion.div>
      )}

      {eligibleItems.length > 0 && (
        <div className="lg:hidden flex-shrink-0 mb-3 flex bg-background rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 p-1">
          <button
            type="button"
            onClick={() => setMobileTab("products")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              mobileTab === "products"
                ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
                : "text-voxcina-blue/60 dark:text-voxcina-cream/60"
            )}
          >
            <Shirt className="h-3.5 w-3.5" />
            محصولات ({eligibleItems.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              mobileTab === "chat"
                ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
                : "text-voxcina-blue/60 dark:text-voxcina-cream/60"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            گفتگو با سارا
          </button>
        </div>
      )}

      {eligibleItems.length > 0 && (
        <motion.div
          className="flex flex-col lg:flex-row gap-4 md:gap-5 flex-1 min-h-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left sidebar: photo upload + cart items */}
          <div className={cn(
            "w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex-1 lg:flex-initial max-lg:min-h-0 space-y-3 overflow-y-auto scrollbar-thin",
            mobileTab === "products" ? "block" : "hidden lg:block"
          )}>
            {/* Photo upload — large drop zone */}
            <motion.div
              className="bg-background rounded-xl border border-secondary-300 dark:border-voxcina-blue/20 overflow-hidden"
              variants={itemVariants}
            >
              {uploadedPreview ? (
                <div className="flex items-center gap-3 p-2.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-secondary-300 dark:border-voxcina-blue/20">
                    <img src={uploadedPreview} alt="تصویر شما" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream">تصویر شما</p>
                    <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">عکس آپلود شده</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleClearImage(); }}
                    className="flex-shrink-0 w-7 h-7 bg-red-500/90 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  className={cn(
                    "flex items-center gap-3 p-2.5 cursor-pointer rounded-xl border-2 border-dashed transition-all",
                    dragOver
                      ? "border-secondary-400 dark:border-voxcina-blue/40 bg-voxcina-blue/[0.04]"
                      : "border-secondary-300 dark:border-voxcina-blue/20 hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04]"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 border border-secondary-300 dark:border-voxcina-blue/20 flex items-center justify-center bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04]">
                    <Upload className="h-6 w-6 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70">عکس خود را آپلود کنید</p>
                    <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">اینجا رها کنید یا کلیک کنید</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </motion.div>

            {/* Cart items list */}
            <motion.div
              className="bg-background rounded-xl border border-secondary-300 dark:border-voxcina-blue/20 p-3"
              variants={itemVariants}
            >
              <h3 className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream mb-3 flex items-center gap-2 px-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                محصولات ({eligibleItems.length})
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {eligibleItems.map((item, idx) => (
                    <motion.div
                      key={item.cartItem.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group",
                        activeItemIndex === idx
                          ? "border-voxcina-blue/40 dark:border-voxcina-cream/40 bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04]"
                          : "border-transparent hover:border-secondary-300 dark:hover:border-voxcina-blue/30 hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04]",
                        !(uploadedFile || uploadedPreview) && "opacity-50"
                      )}
                      onClick={() => {
                        if (!(uploadedFile || uploadedPreview) || isProcessing) return;
                        if (activeItemIndex === idx) {
                          setActiveItemIndex(null);
                          clearInspectedItem();
                          return;
                        }
                        setActiveItemIndex(idx);
                        const garmentType = item.colorVariant.tryOnGarmentType || "upper_body";
                        setInspectedItem(item.product.name, garmentType);
                      }}
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
                        activeItemIndex === idx
                          ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
                          : "bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40 group-hover:bg-voxcina-blue/20 dark:group-hover:bg-voxcina-cream/20"
                      )}>
                        {(uploadedFile || uploadedPreview) ? <Shirt className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {!(uploadedFile || uploadedPreview) && (
                <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-2 text-center flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  ابتدا عکس خود را آپلود کنید
                </p>
              )}
            </motion.div>

            {/* Try-on button */}
            {eligibleItems.length > 0 && (
              <motion.button
                type="button"
                variants={itemVariants}
                onClick={() => {
                  if (activeItemIndex !== null) {
                    handleTryOn(eligibleItems[activeItemIndex], activeItemIndex);
                  }
                }}
                disabled={!(uploadedFile || uploadedPreview) || activeItemIndex === null || isProcessing}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300",
                  !(uploadedFile || uploadedPreview) || activeItemIndex === null || isProcessing
                    ? "bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue/30 dark:text-voxcina-cream/30 cursor-not-allowed"
                    : "bg-voxcina-blue text-voxcina-cream shadow-inset-button hover:opacity-90 active:opacity-80"
                )}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    در حال پرو...
                  </>
                ) : activeItemIndex !== null ? (
                  <>
                    <Shirt className="h-4 w-4" />
                    پرو کن {activeItem?.product.name ? `— ${activeItem.product.name}` : ""}
                  </>
                ) : (
                  <>
                    <Shirt className="h-4 w-4" />
                    ابتدا یک لباس انتخاب کنید
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Right panel: result + chat */}
          <div className={cn(
            "min-h-0 flex-col flex-1",
            mobileTab === "chat" ? "flex" : "hidden lg:flex"
          )}>
            <motion.div
              className="bg-background rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 flex flex-col flex-1 min-h-0 max-h-[600px] overflow-hidden"
              variants={itemVariants}
            >
              {/* Always-visible chat card */}
              <div className="flex flex-col flex-1 min-h-0">
                {/* Chat section */}
                <div className="flex flex-col flex-1 min-h-0 px-3 py-3">
                  <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-voxcina-blue/20 rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 overflow-hidden p-3">
                  {/* Chat header */}
                  <div className="flex items-center gap-2.5 mb-2.5 flex-shrink-0 w-full justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
                          <Sparkles className="h-4 w-4 text-voxcina-cream" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-voxcina-blue/10" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">سارا</span>
                        <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 block -mt-0.5">فروشنده هوشمند</span>
                      </div>
                    </div>
                    <span>
                      <button
                        type="button"
                        onClick={handleStartNewRoom}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-voxcina-cream bg-voxcina-blue/90 hover:bg-voxcina-blue rounded-lg shadow-inset-button transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        {' جدید'}
                      </button>
                    </span>
                  </div>

                  {/* Messages container */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-1.5 rounded-xl bg-voxcina-blue/[0.06] dark:bg-voxcina-cream/[0.05] border border-secondary-400 dark:border-voxcina-blue/30 p-3"
                  >
                    {isLoadingSession ? (
                      <div className="space-y-3 p-2">
                        <div className="flex items-start gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-cream/10 animate-pulse flex-shrink-0" />
                          <div className="space-y-1.5 flex-1 max-w-[65%]">
                            <div className="h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse" />
                            <div className="h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse w-4/5" />
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5 flex-row-reverse">
                          <div className="w-7 h-7 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-cream/10 animate-pulse flex-shrink-0" />
                          <div className="space-y-1.5 flex-1 max-w-[45%]">
                            <div className="h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-cream/10 animate-pulse flex-shrink-0" />
                          <div className="space-y-1.5 flex-1 max-w-[75%]">
                            <div className="h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse" />
                            <div className="h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse w-3/5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                    <AnimatePresence>
                      {chatMessages.map((msg, idx) => {
                        const prevMsg = chatMessages[idx - 1];
                        const isGrouped = prevMsg && prevMsg.role === msg.role;

                        if (msg.role === "tryon") {
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="flex flex-col items-center gap-1.5 mt-3"
                            >
                              {msg.tryonData?.afterImage && (
                                <div
                                  className="relative w-24 h-24 rounded-full overflow-hidden border border-secondary-400 dark:border-voxcina-blue/30 shadow-inset-button cursor-pointer group"
                                  onClick={() => setCompareModalData({ beforeImage: msg.tryonData?.beforeImage || "", afterImage: msg.tryonData?.afterImage || "" })}
                                >
                                  <img
                                    src={msg.tryonData.afterImage}
                                    alt={msg.content}
                                    className="absolute inset-0 w-full h-full object-cover blur-[6px] group-hover:blur-0 transition-all duration-300"
                                    draggable={false}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-voxcina-blue/20 group-hover:bg-transparent transition-all duration-300 pointer-events-none">
                                    <Maximize2 className="h-5 w-5 text-voxcina-cream opacity-100 group-hover:opacity-0 transition-opacity duration-200" />
                                  </div>
                                </div>
                              )}
                              <div className="text-center">
                                <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">{msg.content}</p>
                                {msg.tryonData?.productName && (
                                  <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40">{msg.tryonData.productName}</p>
                                )}
                              </div>
                            </motion.div>
                          );
                        }

                        if (msg.role === "tryon_processing") {
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-1.5 mt-2"
                            >
                              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
                                <RefreshCw className="h-3 w-3 text-voxcina-cream animate-spin" />
                              </div>
                              <div className="bg-white dark:bg-voxcina-blue/25 rounded-xl rounded-tl-sm border border-secondary-400 dark:border-voxcina-blue/30 px-3 py-2">
                                <p className="text-xs text-voxcina-blue dark:text-voxcina-cream">
                                  در حال پرو {msg.tryonData?.productName || "لباس"}...
                                </p>
                                <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-0.5">
                                  حدود ۳۰ ثانیه
                                </p>
                              </div>
                            </motion.div>
                          );
                        }

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={cn(
                              "flex items-start gap-1.5",
                              msg.role === "user" ? "flex-row-reverse" : "flex-row",
                              isGrouped ? "mt-0.5" : "mt-2"
                            )}
                          >
                            <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center", isGrouped && "invisible")}>
                              {msg.role === "user" ? (
                                <div className="w-full h-full rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
                                  <User className="h-3.5 w-3.5 text-voxcina-cream" />
                                </div>
                              ) : (
                                <div className="w-full h-full rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
                                  <Sparkles className="h-3 w-3 text-voxcina-cream" />
                                </div>
                              )}
                            </div>
                            <div
                              className={cn(
                                "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                                msg.role === "user"
                                  ? "bg-voxcina-blue text-voxcina-cream rounded-tr-sm shadow-inset-button"
                                  : "bg-white dark:bg-voxcina-blue/25 text-voxcina-blue dark:text-voxcina-cream rounded-tl-sm border border-secondary-400 dark:border-voxcina-blue/30"
                              )}
                            >
                              {msg.content}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    )}

                    {/* Typing indicator as inline bubble */}
                    {chatLoading && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-1.5 mt-2">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
                          <Sparkles className="h-3 w-3 text-voxcina-cream" />
                        </div>
                        <div className="bg-white dark:bg-voxcina-blue/25 rounded-xl rounded-tl-sm border border-secondary-400 dark:border-voxcina-blue/30 px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-voxcina-blue/40 dark:bg-voxcina-cream/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 bg-voxcina-blue/40 dark:bg-voxcina-cream/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 bg-voxcina-blue/40 dark:bg-voxcina-cream/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Coupon card with countdown */}
                    {couponCode && (
                      <div
                        className={cn(
                          "rounded-lg p-2.5 mt-2.5 transition-colors",
                          couponExpired
                            ? "bg-background border border-gray-300 dark:border-gray-700"
                            : "bg-background border border-emerald-400/40 dark:border-emerald-500/40"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Tag className={cn(
                            "h-3.5 w-3.5 flex-shrink-0",
                            couponExpired ? "text-gray-400" : "text-emerald-600 dark:text-emerald-400"
                          )} />
                          <span className={cn(
                            "text-xs font-bold",
                            couponExpired ? "text-gray-500 dark:text-gray-400" : "text-emerald-700 dark:text-emerald-300"
                          )}>
                            {couponExpired ? "کد تخفیف منقضی شد" : `${couponValue}٪ تخفیف`}
                          </span>
                          {!couponExpired && couponValidUntil && (
                            <div className="mr-auto flex items-center bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04] rounded-md px-1.5 py-0.5">
                              <CountdownTimer
                                validUntil={couponValidUntil}
                                onExpire={() => {
                                  setCouponExpired(true);
                                }}
                                className="text-[10px]"
                              />
                            </div>
                          )}
                        </div>

                        {!couponExpired && (
                          <>
                            <div className="border-t border-dashed border-emerald-300/40 dark:border-emerald-700/40 my-1.5" />
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[10px] select-all tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-md px-1.5 py-0.5">
                                {couponCode}
                              </span>
                              {activeItem && couponValue && (
                                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 whitespace-nowrap">
                                  صرفه‌جویی {formatPrice(activeItem.product.price * couponValue / 100)}ت
                                </span>
                              )}
                              <div className="mr-auto">
                                {couponApplied ? (
                                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    <Check className="h-3 w-3" />
                                    اعمال شد
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={couponApplying}
                                    className="text-[10px] h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-inset-button disabled:opacity-60"
                                  >
                                    {couponApplying ? "..." : "اعمال کد"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Recommended product card */}
                    {recommendedProduct && (
                      <div
                        className="bg-background border border-secondary-400 dark:border-voxcina-blue/30 rounded-xl p-3 mt-3"
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream animate-badge-float" />
                          <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">پیشنهاد فروشنده</p>
                        </div>
                        <Link
                          href={`/products/${recommendedProduct.product_id}?color=${encodeURIComponent(getRecommendedColor(recommendedProduct) || "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 mb-2 group"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-background border border-secondary-300 dark:border-voxcina-blue/20 flex-shrink-0">
                            {getRecommendedDisplayImage(recommendedProduct) ? (
                              <BackendImage
                                src={getRecommendedDisplayImage(recommendedProduct)!}
                                alt={recommendedProduct.product_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-voxcina-blue/30 dark:text-voxcina-cream/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream truncate group-hover:underline">{recommendedProduct.product_name}</p>
                            <p className="text-[11px] font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-0.5">{formatPrice(recommendedProduct.price)}</p>
                          </div>
                        </Link>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-[10px] flex-1 h-7 shadow-inset-button focus:shadow-focus-warm"
                            onClick={() => {
                              setSizeModalSize(undefined);
                              setSizeModalOpen(true);
                            }}
                            disabled={recommendedAdding}
                          >
                            <ShoppingBag className="h-3 w-3 ml-1" />
                            افزودن به سبد
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] flex-1 h-7 border-voxcina-blue/40 dark:border-voxcina-cream/40 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04] focus:shadow-focus-warm"
                            onClick={async () => {
                              setRecommendedAdding(true);
                              try {
                                await tryOnRecommendedProduct(recommendedProduct);
                              } catch { /* ignore */ }
                              setRecommendedAdding(false);
                            }}
                            disabled={recommendedAdding}
                          >
                            <Camera className="h-3 w-3 ml-1" />
                            {recommendedAdding ? "..." : "پرو کن"}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggestions above input */}
                  {resultImage && !chatLoading && (
                    <div className="flex-shrink-0 space-y-2 mt-2">
                      {showNegotiationPrompt && negotiationTargetItem && (
                        <div className="flex flex-wrap gap-1.5">
                          {NEGOTIATION_OPENERS.map((opener, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectOpener(opener.text, negotiationTargetItem)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:border-voxcina-blue/40 dark:hover:border-voxcina-cream/40 hover:bg-voxcina-blue/[0.08] dark:hover:bg-voxcina-cream/[0.08] hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-all text-xs"
                            >
                              <opener.icon className="h-3 w-3" />
                              {opener.text}
                            </button>
                          ))}
                        </div>
                      )}
                      {chatMessages.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_REPLIES.map((text) => (
                            <button
                              key={text}
                              onClick={() => handleQuickReply(text)}
                              className="text-[10px] px-2.5 py-1.5 rounded-full bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-blue/[0.08] dark:hover:bg-voxcina-cream/[0.08] hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-all"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat input */}
                  <form onSubmit={handleChatSubmit} className="flex gap-2 mt-2 flex-shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="پیام به سارا..."
                      className="flex-1 bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 rounded-xl px-3 py-2 text-xs text-voxcina-blue dark:text-voxcina-cream placeholder:text-voxcina-blue/40 focus:outline-none focus:border-voxcina-blue/60 focus:ring-2 focus:ring-voxcina-blue/15 focus:shadow-focus-warm transition-all"
                      disabled={chatLoading}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={chatLoading || !chatInput.trim()}
                      className="rounded-xl px-3 shadow-inset-button focus:shadow-focus-warm"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                  </div>
                </div>
              </div>

              {/* Full comparison modal */}
              <AnimatePresence>
                {compareModalData && (
                  <motion.div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setCompareModalData(null)}
                  >
                    <motion.div
                      className="bg-background rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 p-3 max-w-2xl w-full max-h-[85vh] overflow-hidden"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">مقایسه تصاویر</span>
                        <button
                          type="button"
                          onClick={() => setCompareModalData(null)}
                          className="w-7 h-7 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center transition-colors"
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                      <BeforeAfterSlider
                        beforeImage={compareModalData.beforeImage}
                        afterImage={compareModalData.afterImage}
                        beforeLabel="اصلی"
                        afterLabel="پرو"
                        className="w-full max-h-[70vh]"
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Image crop modal — shown when user selects/drops a photo */}
      <ImageCropModal
        isOpen={!!imageToCrop}
        imageSrc={imageToCrop || ""}
        onConfirm={(croppedFile, previewUrl) => {
          useTryOnStore.setState({ uploadedFile: croppedFile, uploadedPreview: previewUrl });
          setImageToCrop(null);
        }}
        onCancel={() => setImageToCrop(null)}
      />

      {/* Size selection modal — shown before adding the seller-recommended product to cart */}
      <Modal
        isOpen={sizeModalOpen && !!recommendedProduct}
        onClose={() => setSizeModalOpen(false)}
        title="انتخاب سایز"
        contentClassName="max-w-sm"
      >
        {recommendedProduct && (() => {
          const { all: sizeOptions, available: availableSizes } = getRecommendedSizeOptions(recommendedProduct);
          return (
            <>
              <p className="text-sm text-muted-foreground mb-4">{recommendedProduct.product_name}</p>
              {sizeOptions.length > 0 ? (
                <SizeSelector
                  sizes={sizeOptions}
                  availableSizes={availableSizes}
                  selectedSize={sizeModalSize}
                  onSizeChange={setSizeModalSize}
                  showLabel={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground mb-4">سایزی برای این محصول موجود نیست.</p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSizeModalOpen(false)}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  disabled={!sizeModalSize || recommendedAdding}
                  onClick={async () => {
                    setRecommendedAdding(true);
                    try {
                      await addRecommendedToCart(recommendedProduct, sizeModalSize);
                      setSizeModalOpen(false);
                    } catch { /* ignore */ }
                    setRecommendedAdding(false);
                  }}
                >
                  {recommendedAdding ? "..." : "افزودن به سبد"}
                </Button>
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
