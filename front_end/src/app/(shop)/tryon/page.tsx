"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

import ChatComposer from "@/components/tryon/ChatComposer";
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
import TryOnHeader from "@/components/tryon/TryOnHeader";
import TryOnStepIndicator from "@/components/tryon/TryOnStepIndicator";
import { useTryOnChat } from "@/components/tryon/useTryOnChat";
import ImageCropModal from "@/components/ui/ImageCropModal";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { activityTracker } from "@/lib/activity-tracker";
import { getCanonicalColor } from "@/lib/product-variants";
import { containerVariants, itemVariants } from "@/lib/tryon-motion";
import {
  buildRecommendedProduct,
  computeEligibleItems,
  getRecommendedColor,
  getRecommendedColorName,
  getRecommendedSize,
  getRecommendedVariant,
  matchesRecommendedVariant,
} from "@/lib/tryon-recommendation";
import { cn, toPersianNumber } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { useTryOnStore } from "@/store/tryon-store";
import { ChatMessage, RecommendedProduct, TryOnEligibleItem } from "@/types/tryon";

export default function TryOnRoomPage() {
  const { isLoading: authLoading, isAuthorized, user } = useProtectedRoute({ requiredAuth: true });
  const { cart, isLoading: cartLoading, addItem } = useCartStore();

  const {
    uploadedPreview,
    uploadedFile,
    resultImage,
    isProcessing,
    error,
    setUploadedFile,
    startTryOn,
    setInspectedItem,
    clearInspectedItem,
    persistTryonMessage,
  } = useTryOnStore();

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [recommendedAdding, setRecommendedAdding] = useState<string | null>(null);
  const [sizeModalProduct, setSizeModalProduct] = useState<RecommendedProduct | null>(null);
  const [tryOnCount, setTryOnCount] = useState(0);
  const [comparePair, setComparePair] = useState<ComparePair | null>(null);
  const [mobileTab, setMobileTab] = useState<FittingRoomTab>("products");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const eligibleItems = useMemo<TryOnEligibleItem[]>(
    () => computeEligibleItems(cart.items),
    [cart.items]
  );
  const hasPhoto = !!(uploadedFile || uploadedPreview);

  const handleResetRoomLocal = useCallback(() => {
    setActiveItemIndex(null);
    setTryOnCount(0);
    setComparePair(null);
  }, []);

  const {
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    showChatOpeners,
    chatTargetItem,
    isLoadingSession,
    handleChatSubmit,
    handleSelectOpener,
    handleStartNewRoom,
    markChatInitialized,
  } = useTryOnChat({
    isAuthorized,
    userName: user?.name,
    eligibleItems,
    activeItemIndex,
    onResetRoom: handleResetRoomLocal,
  });

  const steps = [
    { label: "آپلود عکس", done: hasPhoto },
    { label: "انتخاب لباس", done: activeItemIndex !== null },
    { label: "نتیجه و گفتگو", done: !!resultImage && !error },
  ];

  const openCropModal = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
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
    setChatMessages((prev) => [
      ...prev,
      {
        role: "tryon_processing",
        content: item.product.name,
        tryonData: { processingId, productName: item.product.name },
      },
    ]);

    const dropProcessingCard = () =>
      setChatMessages((prev) => prev.filter((m) => m.tryonData?.processingId !== processingId));

    try {
      // Recreate File from preview URL if missing after session restore
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
      toast.error(store.error || "پرو مجازی ناتمام ماند. دوباره تلاش کنید.");
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

    setChatMessages((prev) =>
      prev.map((m) => (m.tryonData?.processingId === processingId ? resultMsg : m))
    );

    // Persist to room transcript
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

    // Activity tracking
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

    if (markChatInitialized()) {
      activityTracker.trackChatStarted({
        ...activityMeta,
        context: "tryon_styling_chat",
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

  const runRecommendationAction = async (rec: RecommendedProduct, action: () => Promise<void>) => {
    setRecommendedAdding(rec.product_id);
    try {
      await action();
    } catch {
      /* ignore */
    }
    setRecommendedAdding(null);
  };

  if (authLoading || cartLoading) {
    return (
      <div className="container py-24 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-12 h-12 relative">
            <div className="absolute inset-0 border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft" />
            <div className="absolute inset-0 border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70">
            در حال آماده‌سازی اتاق پرو...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const activeItem = activeItemIndex !== null ? eligibleItems[activeItemIndex] : null;

  return (
    <div className="container py-4 md:py-6 flex flex-col flex-1 min-h-0">
      <TryOnHeader eligibleCount={eligibleItems.length} />

      {eligibleItems.length === 0 ? (
        <EmptyFittingRoom cartIsEmpty={cart.items.length === 0} />
      ) : (
        <>
          <TryOnStepIndicator steps={steps} />

          <FittingRoomTabs
            value={mobileTab}
            onChange={setMobileTab}
            productCount={eligibleItems.length}
          />

          <motion.div
            className="flex flex-col lg:flex-row gap-4 md:gap-5 flex-1 min-h-0 lg:h-[calc(100vh-14rem)] lg:min-h-[580px] lg:max-h-[760px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Left Column: Photo Upload + Items List + Action CTA */}
            <div
              className={cn(
                "w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex-col space-y-3 overflow-y-auto scrollbar-thin",
                mobileTab === "products" ? "flex" : "hidden lg:flex"
              )}
            >
              <PhotoUploadCard
                previewUrl={uploadedPreview}
                onOpenGuide={() => setGuideOpen(true)}
                onClear={handleClearImage}
                onFileDropped={openCropModal}
                onRecrop={uploadedPreview ? () => setImageToCrop(uploadedPreview) : undefined}
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
                hasPhoto={hasPhoto}
                hasSelection={activeItemIndex !== null}
                onClick={() => {
                  if (activeItemIndex !== null) {
                    handleTryOn(eligibleItems[activeItemIndex], activeItemIndex);
                  }
                }}
              />
            </div>

            {/* Right Column: Voxa Stylist Chat & Results */}
            <div
              className={cn(
                "min-h-0 flex-col flex-1",
                mobileTab === "chat" ? "flex" : "hidden lg:flex"
              )}
            >
              <motion.div
                className="bg-background rounded-2xl border border-secondary-300 dark:border-voxcina-blue/30 p-3 sm:p-4 shadow-soft flex flex-col flex-1 min-h-0 overflow-hidden h-[70vh] min-h-[460px] max-h-[640px] lg:h-auto lg:min-h-0 lg:max-h-none"
                variants={itemVariants}
              >
                <ChatHeader onNewRoom={handleStartNewRoom} />

                <ChatTranscript
                  messages={chatMessages}
                  loading={isLoadingSession}
                  typing={chatLoading}
                  recommendation={{
                    busyProductId: recommendedAdding,
                    onAddToCart: (product) => setSizeModalProduct(product),
                    onTryOn: (product) =>
                      runRecommendationAction(product, () => tryOnRecommendedProduct(product)),
                  }}
                  onCompare={(beforeImage, afterImage) => setComparePair({ beforeImage, afterImage })}
                />

                <ChatComposer
                  value={chatInput}
                  onChange={setChatInput}
                  onSubmit={handleChatSubmit}
                  disabled={chatLoading}
                  showOpeners={!!resultImage && !chatLoading && showChatOpeners && !!chatTargetItem}
                  onSelectOpener={handleSelectOpener}
                />
              </motion.div>
            </div>
          </motion.div>
        </>
      )}

      {/* Hidden file pickers */}
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

      {/* Photo guide modal */}
      <PhotoGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onChooseFile={() => galleryInputRef.current?.click()}
        onOpenCamera={() => cameraInputRef.current?.click()}
      />

      {/* Image crop modal */}
      <ImageCropModal
        isOpen={!!imageToCrop}
        imageSrc={imageToCrop || ""}
        onConfirm={(croppedFile, previewUrl) => {
          useTryOnStore.setState({ uploadedFile: croppedFile, uploadedPreview: previewUrl });
          setImageToCrop(null);
        }}
        onCancel={() => setImageToCrop(null)}
      />

      {/* Recommendation size picker modal */}
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

      {/* Before / After comparison slider modal */}
      <CompareModal pair={comparePair} onClose={() => setComparePair(null)} />
    </div>
  );
}
