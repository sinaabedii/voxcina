"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { toast } from "react-toastify";

import ChatComposer, { TRYON_CHAT_OPENERS } from "@/components/tryon/ChatComposer";
import ChatHeader from "@/components/tryon/ChatHeader";
import ChatTranscript from "@/components/tryon/ChatTranscript";
import CompareModal, { ComparePair } from "@/components/tryon/CompareModal";
import EmptyFittingRoom from "@/components/tryon/EmptyFittingRoom";
import FittingRoomItems from "@/components/tryon/FittingRoomItems";
import FittingRoomTabs, { FittingRoomTab } from "@/components/tryon/FittingRoomTabs";
import PhotoGuideModal from "@/components/tryon/PhotoGuideModal";
import PhotoUploadCard from "@/components/tryon/PhotoUploadCard";
import SizePickerModal from "@/components/tryon/SizePickerModal";
import TryOnActionButton from "@/components/tryon/TryOnActionButton";
import TryOnStepIndicator from "@/components/tryon/TryOnStepIndicator";
import ImageCropModal from "@/components/ui/ImageCropModal";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { activityTracker } from "@/lib/activity-tracker";
import { getCanonicalColor } from "@/lib/product-variants";
import { sessionManager } from "@/lib/session-manager";
import { makeMessageId as makeDbMessageId, streamNegotiation } from "@/lib/tryon-api";
import { containerVariants, itemVariants } from "@/lib/tryon-motion";
import {
  buildRecommendedProduct,
  computeEligibleItems,
  getRecommendedColor,
  getRecommendedColorName,
  getRecommendedSize,
  getRecommendedVariant,
  matchesRecommendedVariant,
  missingCouponProducts,
} from "@/lib/tryon-recommendation";
import {
  AGENT_ERROR_REPLY,
  agentMessageForTurn,
  replaceStreamingMessage,
  restoreChatMessages,
  welcomeReply,
} from "@/lib/tryon-transcript";
import { cn, toPersianNumber } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { useTryOnStore } from "@/store/tryon-store";
import { ChatMessage, RecommendedProduct, RequiredColorEntry, TryOnEligibleItem } from "@/types/tryon";

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
    startTryOn,
    inspectedItemName,
    setInspectedItem,
    clearInspectedItem,
    couponCode,
    couponProductIds,
    couponRequiredColors,
    setCoupon,
    chatId,
    persistedMessages,
    persistedTryons,
    isLoadingSession,
    ensureChatId,
    loadSession,
    persistMessage,
    persistTryonMessage,
    startNewRoom,
  } = useTryOnStore();

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponExpired, setCouponExpired] = useState(false);
  const [couponApplying, setCouponApplying] = useState(false);
  // The cards hang off their message; these track only what a card action is
  // busy with — the product whose buttons spin, and the one the size modal adds.
  const [recommendedAdding, setRecommendedAdding] = useState<string | null>(null);
  const [sizeModalProduct, setSizeModalProduct] = useState<RecommendedProduct | null>(null);
  const [tryOnCount, setTryOnCount] = useState(0);
  const [showNegotiationPrompt, setShowNegotiationPrompt] = useState(false);
  const [comparePair, setComparePair] = useState<ComparePair | null>(null);
  const [mobileTab, setMobileTab] = useState<FittingRoomTab>("products");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  // Two inputs rather than one with a toggled `capture`: the attribute is read
  // when the picker opens, so flipping it in state right before .click() is not
  // guaranteed to have been applied yet.
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const negotiationInitializedRef = useRef(false);

  const eligibleItems = useMemo<TryOnEligibleItem[]>(
    () => computeEligibleItems(cart.items),
    [cart.items]
  );
  const hasPhoto = !!(uploadedFile || uploadedPreview);

  const steps = [
    { label: "آپلود عکس", done: hasPhoto },
    { label: "انتخاب لباس", done: activeItemIndex !== null },
    { label: "نتیجه + مذاکره", done: !!resultImage && !error },
  ];

  // Load persisted chat session for this user on mount
  useEffect(() => {
    if (!isAuthorized) return;
    loadSession(ensureChatId());
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
      setChatMessages(restoreChatMessages(persistedMessages, persistedTryons));
    } else if (eligibleItems.length > 0 && chatMessages.length === 0) {
      // First visit — no persisted messages, cart has eligible items: show welcome
      const welcomeText = welcomeReply(user?.name?.split(" ")[0] || "رفیق");
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
    const openerTexts = new Set(TRYON_CHAT_OPENERS.map((o) => o.text));
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
    // reset file inputs so the same file can be re-selected after cancel
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGuideOpen(false);
    openCropModal(file);
  };

  const handleClearImage = () => {
    setUploadedFile(null);
    setActiveItemIndex(null);
  };

  const handleSelectItem = (index: number) => {
    if (!hasPhoto || isProcessing) return;
    if (activeItemIndex === index) {
      setActiveItemIndex(null);
      clearInspectedItem();
      return;
    }
    const item = eligibleItems[index];
    setActiveItemIndex(index);
    setInspectedItem(item.product.name, item.colorVariant.tryOnGarmentType || "upper_body");
  };

  const handleTryOn = async (item: TryOnEligibleItem, index: number) => {
    setActiveItemIndex(index);
    const garmentType = item.colorVariant.tryOnGarmentType || "upper_body";
    setInspectedItem(item.product.name, garmentType);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileTab("chat");
    }

    const processingId = Date.now();
    setChatMessages((prev) => [...prev, {
      role: "tryon_processing",
      content: item.product.name,
      tryonData: { processingId, productName: item.product.name },
    }]);
    const dropProcessingCard = () =>
      setChatMessages((prev) => prev.filter((m) => m.tryonData?.processingId !== processingId));

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
      await startTryOn(item.colorVariant.tryOnImage!, garmentType, {
        productId: item.product.id,
        variantId: item.colorVariant.variantId,
        productName: item.product.name,
        color: getCanonicalColor(item.colorVariant) || item.colorVariant.color,
        colorName: item.colorVariant.colorName,
        size: item.cartItem.size,
      });
    } catch {
      dropProcessingCard();
      return;
    }

    const store = useTryOnStore.getState();
    if (!store.resultImage) {
      dropProcessingCard();
      return;
    }

    const newCount = tryOnCount + 1;
    setTryOnCount(newCount);
    const resultMsg: ChatMessage = {
      role: "tryon",
      content: `اتاق پرو ${toPersianNumber(newCount)}`,
      tryonData: {
        roomNumber: newCount,
        beforeImage: store.uploadedPreview || "",
        afterImage: store.resultImage || "",
        productName: item.product.name,
      },
    };
    setChatMessages((prev) => prev.map((m) =>
      m.tryonData?.processingId === processingId ? resultMsg : m
    ));

    // Persist the tryon card to the chat transcript
    persistTryonMessage({
      tryon_id: store.currentTryonId || "",
      product_id: item.product.id,
      product_name: item.product.name,
      color: item.colorVariant?.colorName || item.colorVariant?.color,
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
      tryon_id: store.currentTryonId || "",
      chat_id: store.chatId || "",
      product_id: item.product.id,
      product_name: item.product.name,
      garment_type: garmentType,
      room_number: newCount,
      color: item.colorVariant?.colorName || item.colorVariant?.color,
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

  const tryOnRecommendedProduct = async (rec: RecommendedProduct) => {
    const currentItems = computeEligibleItems(useCartStore.getState().cart.items);
    let index = currentItems.findIndex((ei) => matchesRecommendedVariant(ei, rec));
    if (index === -1) {
      await addItem(
        buildRecommendedProduct(rec),
        1,
        getRecommendedSize(rec),
        getRecommendedColor(rec),
        getRecommendedColorName(rec),
        getRecommendedVariant(rec)?.variantId
      );
      const updatedItems = computeEligibleItems(useCartStore.getState().cart.items);
      index = updatedItems.findIndex((ei) => matchesRecommendedVariant(ei, rec));
      if (index !== -1) await handleTryOn(updatedItems[index], index);
      return;
    }
    await handleTryOn(currentItems[index], index);
  };

  const addRecommendedToCart = async (rec: RecommendedProduct, size?: string) => {
    const currentItems = computeEligibleItems(useCartStore.getState().cart.items);
    if (currentItems.some((ei) => matchesRecommendedVariant(ei, rec))) {
      toast.info("این محصول در سبد خرید شما موجود است");
      return;
    }
    await addItem(
      buildRecommendedProduct(rec),
      1,
      size || getRecommendedSize(rec),
      getRecommendedColor(rec),
      getRecommendedColorName(rec),
      getRecommendedVariant(rec)?.variantId
    );
    toast.success("به سبد خرید اضافه شد");
  };

  /** Runs one card action at a time, keeping every card's buttons in step. */
  const runRecommendationAction = async (rec: RecommendedProduct, action: () => Promise<void>) => {
    setRecommendedAdding(rec.product_id);
    try {
      await action();
    } catch { /* ignore */ }
    setRecommendedAdding(null);
  };

  // Resolve the garment Voxa negotiates over. Talking to her never required a
  // try-on, so the chain falls back past the explicit selection: the actively
  // selected item, then the item behind the last try-on, then the first
  // eligible cart item. Without the fallback a message typed before any try-on
  // resolved to null and was dropped with no bubble and no error.
  const resolveNegotiationTarget = useCallback(
    (explicit?: TryOnEligibleItem): TryOnEligibleItem | null =>
      explicit
      ?? (activeItemIndex !== null ? eligibleItems[activeItemIndex] : null)
      ?? (inspectedItemName
        ? eligibleItems.find((el) => el.product.name === inspectedItemName)
        : null)
      ?? eligibleItems[0]
      ?? null,
    [activeItemIndex, eligibleItems, inspectedItemName]
  );

  // The negotiation prompts target the same item the input box does, so both
  // work when no product is explicitly selected (e.g. after a page reload).
  const negotiationTargetItem = resolveNegotiationTarget();

  const sendNegotiationMessage = async (message: string, item?: TryOnEligibleItem) => {
    const targetItem = resolveNegotiationTarget(item);
    if (!targetItem) {
      // Only reachable with an empty fitting room, where the chat is not even
      // rendered — still say so rather than swallowing the message.
      toast.warning("ابتدا یک محصول قابل پرو به سبد خرید اضافه کنید");
      return;
    }

    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    // Snapshot live state for the body
    const liveState = useTryOnStore.getState();
    let streamed = "";

    try {
      await streamNegotiation({
        message,
        tryon_product_id: targetItem.product.id,
        tryon_color: getCanonicalColor(targetItem.colorVariant) || targetItem.colorVariant.colorName,
        tryon_id: liveState.currentTryonId || "",
        chat_id: liveState.chatId || "",
      }, {
        onToken: (text) => {
          streamed += text;
          setChatMessages((prev) =>
            replaceStreamingMessage(prev, { role: "agent_streaming", content: streamed })
          );
        },
        onDone: (turn) => {
          setChatMessages((prev) => replaceStreamingMessage(prev, agentMessageForTurn(turn, streamed)));

          if (turn.coupon) {
            const { code, value, valid_until, product_ids, comp_product_id } = turn.coupon;
            const requiredColors: RequiredColorEntry[] = [];
            if (product_ids?.[0]) {
              requiredColors.push({
                productId: product_ids[0],
                color: turn.coupon.main_color,
                colorName: turn.coupon.main_color_name,
              });
            }
            if (comp_product_id) {
              requiredColors.push({
                productId: comp_product_id,
                color: turn.coupon.comp_color,
                colorName: turn.coupon.comp_color_name,
              });
            }
            setCoupon(code, value, valid_until, product_ids, requiredColors);
            setCouponExpired(false);
          }

          // The backend persists both halves of this turn to the room
          // transcript, including the tool_call the reload path reads back.
        },
      });
    } catch {
      setChatMessages((prev) =>
        replaceStreamingMessage(prev, { role: "agent", content: AGENT_ERROR_REPLY })
      );
      // A failed turn never reaches the backend's own persistence, so record
      // both halves here to keep the transcript complete across a reload.
      persistMessage({
        id: makeDbMessageId(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });
      persistMessage({
        id: makeDbMessageId(),
        role: "agent",
        content: AGENT_ERROR_REPLY,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatInput("");
    sendNegotiationMessage(message);
  };

  const handleSelectOpener = (text: string) => {
    setShowNegotiationPrompt(false);
    setCouponApplied(false);
    setCouponExpired(false);
    sendNegotiationMessage(text, negotiationTargetItem ?? undefined);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode || couponApplying || couponExpired) return;

    const cartItems = useCartStore.getState().cart.items;

    // The coupon only pays out once every product it was negotiated for is in
    // the cart, in the exact color variant it was pinned to (any size).
    if (couponProductIds.length > 0) {
      const missing = missingCouponProducts(cartItems, couponProductIds, couponRequiredColors);
      if (missing.length > 0) {
        toast.warning("این کد تخفیف زمانی اعمال می شود که هر دو محصول اصلی و پیشنهادی، در همان رنگ پیشنهادی، در سبد خرید باشند");
        return;
      }
    }

    setCouponApplying(true);
    try {
      const res = await sessionManager.fetchWithAuth("/api/tryon/apply-negotiated-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          cart_items: cartItems.map((item) => ({
            product_id: item.productId,
            color: item.color,
            color_name: item.colorName,
          })),
        }),
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

  const handleStartNewRoom = useCallback(() => {
    startNewRoom();
    setActiveItemIndex(null);
    setChatMessages([]);
    setCouponApplied(false);
    setCouponExpired(false);
    setTryOnCount(0);
    setComparePair(null);
    setShowNegotiationPrompt(false);
    negotiationInitializedRef.current = false;
    negotiationRestoredRef.current = false;
    hydratedForChatIdRef.current = null;
    restoredFromDbRef.current = false;
  }, [startNewRoom]);

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
          هوش مصنوعی، لباس‌ها را روی عکس شما پرو می‌کند و ووکسا در انتخاب کمکتان می‌کند
        </p>
      </motion.div>

      {eligibleItems.length === 0 ? (
        <EmptyFittingRoom cartIsEmpty={cart.items.length === 0} />
      ) : (
        <>
          <TryOnStepIndicator steps={steps} />

          <FittingRoomTabs value={mobileTab} onChange={setMobileTab} productCount={eligibleItems.length} />

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
              <PhotoUploadCard
                previewUrl={uploadedPreview}
                onOpenGuide={() => setGuideOpen(true)}
                onClear={handleClearImage}
                onFileDropped={openCropModal}
              />

              <FittingRoomItems
                items={eligibleItems}
                activeIndex={activeItemIndex}
                unlocked={hasPhoto}
                onSelect={handleSelectItem}
              />

              <TryOnActionButton
                productName={activeItem?.product.name}
                processing={isProcessing}
                disabled={!hasPhoto || activeItemIndex === null || isProcessing}
                onClick={() => {
                  if (activeItemIndex !== null) handleTryOn(eligibleItems[activeItemIndex], activeItemIndex);
                }}
              />
            </div>

            {/* Right panel: the conversation with Voxa */}
            <div className={cn(
              "min-h-0 flex-col flex-1",
              mobileTab === "chat" ? "flex" : "hidden lg:flex"
            )}>
              <motion.div
                className="bg-background rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 flex flex-col flex-1 min-h-0 max-h-[600px] overflow-hidden"
                variants={itemVariants}
              >
                <div className="flex flex-col flex-1 min-h-0 px-3 py-3">
                  <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-voxcina-blue/20 rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 overflow-hidden p-3">
                    <ChatHeader onNewRoom={handleStartNewRoom} />

                    <ChatTranscript
                      messages={chatMessages}
                      loading={isLoadingSession}
                      typing={chatLoading}
                      coupon={{
                        activeCode: couponCode,
                        expired: couponExpired,
                        applied: couponApplied,
                        applying: couponApplying,
                        basePrice: activeItem?.product.price ?? null,
                        onApply: handleApplyCoupon,
                        onExpire: () => setCouponExpired(true),
                      }}
                      recommendation={{
                        busyProductId: recommendedAdding,
                        onAddToCart: (product) => setSizeModalProduct(product),
                        onTryOn: (product) => runRecommendationAction(product, () => tryOnRecommendedProduct(product)),
                      }}
                      onCompare={(beforeImage, afterImage) => setComparePair({ beforeImage, afterImage })}
                    />

                    <ChatComposer
                      value={chatInput}
                      onChange={setChatInput}
                      onSubmit={handleChatSubmit}
                      disabled={chatLoading}
                      showOpeners={!!resultImage && !chatLoading && showNegotiationPrompt && !!negotiationTargetItem}
                      onSelectOpener={handleSelectOpener}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}

      {/* Photo pickers. Kept at the page root so they outlive the upload zone,
          which unmounts as soon as a photo is chosen. `capture` asks mobile
          browsers for the camera; desktop browsers ignore it, and only the
          gallery input is ever reachable there. */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo guide — shown before the picker so requirements are read first */}
      <PhotoGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onChooseFile={() => galleryInputRef.current?.click()}
        onOpenCamera={() => cameraInputRef.current?.click()}
      />

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

      <SizePickerModal
        product={sizeModalProduct}
        adding={!!recommendedAdding}
        onClose={() => setSizeModalProduct(null)}
        onConfirm={(size) => {
          if (!sizeModalProduct) return;
          const product = sizeModalProduct;
          runRecommendationAction(product, async () => {
            await addRecommendedToCart(product, size);
            setSizeModalProduct(null);
          });
        }}
      />

      <CompareModal pair={comparePair} onClose={() => setComparePair(null)} />
    </div>
  );
}
