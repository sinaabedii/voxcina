"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useCartStore, getCartWarnings } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { activityTracker } from "@/lib/activity-tracker";
import { CartItem } from '@/types/cart';

/**
 * Helper function to get the appropriate image for a cart item
 * Prioritizes: selected color variant image > main images > first color variant image
 * @param item - The cart item to get the image for
 * @returns The image URL or null if no image is available
 */
const getCartItemImage = (item: CartItem): string | null => {
  // First, try to get image from the selected color variant
  if (item.color && item.product.colorVariants) {
    const colorVariant = item.product.colorVariants.find(cv => cv.color === item.color);
    if (colorVariant?.images?.[0]) return colorVariant.images[0];
  }
  // Fallback to main images
  if (item.product.mainImages?.[0]) return item.product.mainImages[0];
  // Last resort: first color variant's first image
  if (item.product.colorVariants?.[0]?.images?.[0]) return item.product.colorVariants[0].images[0];
  return null;
};

export default function CartPage() {
  const {
    cart,
    summary,
    updateItemQuantity,
    removeItem,
    applyPromoCode,
    removePromoCode,
    promoCode,
    dismissCartWarnings,
    isLoading,
    error,
  } = useCartStore();
  
  // State for dismissing error messages
  const [errorDismissed, setErrorDismissed] = useState(false);
  
  // Optimistic UI state for quantity changes (Requirement 6.3)
  // Maps item key (productId-size-color) to pending quantity
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  
  // Reset error dismissed state when error changes
  useEffect(() => {
    if (error) {
      setErrorDismissed(false);
    }
  }, [error]);
  
  // Clear pending quantities when loading completes (success or failure)
  useEffect(() => {
    if (!isLoading) {
      setPendingQuantities({});
    }
  }, [isLoading]);
  
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const warnings = getCartWarnings();

  // Note: Cart sync is handled by the auth subscription in cart-store.ts
  // Removing redundant syncCartWithBackend call to prevent duplicate sync operations
  // and potential cart doubling (Requirements 3.1, 3.2, 7.1, 7.2)

  useEffect(() => {
    if (warnings.length) {
      const timer = setTimeout(() => {
        dismissCartWarnings();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [warnings, dismissCartWarnings]);

  // Helper to get item key for optimistic updates
  const getItemKey = (item: CartItem) => `${item.productId}-${item.size || ''}-${item.color || ''}`;
  
  // Get displayed quantity (pending or actual)
  const getDisplayQuantity = (item: CartItem): number => {
    const key = getItemKey(item);
    return pendingQuantities[key] !== undefined ? pendingQuantities[key] : item.quantity;
  };

  const handleQuantityChange = (item: CartItem, quantity: number) => {
    if (quantity < 1) return;
    
    // Optimistic update: immediately show the new quantity (Requirement 6.3)
    const key = getItemKey(item);
    setPendingQuantities(prev => ({ ...prev, [key]: quantity }));
    
    // Then update the backend - if it fails, the pending state will be cleared
    // and the actual quantity from the store will be shown
    updateItemQuantity(item.productId, quantity, item.size, item.color);
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.productId, item.size, item.color);
  };

  const handleApplyPromoCode = () => {
    if (!promoInput.trim()) {
      setPromoError("لطفا کد تخفیف را وارد کنید");
      return;
    }
    
    // Clear local error state before applying
    setPromoError("");
    
    // Let the store handle validation - it has the validPromoCodes array
    // and will set promoCode.errorMessage if the code is invalid
    applyPromoCode(promoInput);
    
    // Note: The store's applyPromoCode function handles all validation:
    // - Invalid codes
    // - Expired codes  
    // - Minimum purchase requirements
    // The UI displays promoCode.errorMessage from the store
  };

  const cartItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  if (cart.items.length === 0) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center">
        <motion.div
          className="w-20 h-20 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/30 flex items-center justify-center mb-6 shadow-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
        >
          <ShoppingBag className="h-10 w-10 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
        </motion.div>
        <motion.h1
          className="text-2xl md:text-3xl font-bold mb-4 text-center text-voxcina-blue dark:text-voxcina-cream"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          سبد خرید شما خالی است
        </motion.h1>
        <motion.p
          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-8 text-center max-w-md"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          محصولی به سبد خرید خود اضافه نکرده‌اید. می‌توانید به فروشگاه بروید و
          محصولات مورد نظر خود را انتخاب کنید.
        </motion.p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5 }}
        >
          <Link href="/products">
            <Button
              variant="primary"
              size="lg"
              className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              مشاهده محصولات
              <ArrowLeft className="mr-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="container py-8 md:py-12 relative">
      {/* Loading overlay - displays during cart operations (Requirement 6.1) */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-voxcina-blue/30 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
            <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">در حال پردازش...</span>
          </div>
        </div>
      )}
      
      {/* Error banner - displays error messages from cart operations (Requirement 6.2) */}
      {error && !errorDismissed && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-red-500 dark:text-red-400">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              className="ml-4 text-sm text-red-700 dark:text-red-200 hover:underline"
              onClick={() => setErrorDismissed(true)}
            >
              بستن
            </button>
          </div>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
            <div>
              {warnings.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
            <button
              className="ml-4 text-sm text-yellow-700 dark:text-yellow-200 hover:underline"
              onClick={dismissCartWarnings}
            >
              بستن
            </button>
          </div>
        </div>
      )}
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">سبد خرید</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          className="lg:col-span-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-voxcina-blue dark:text-voxcina-cream">
                محصولات
              </h2>

              <AnimatePresence>
                <div className="divide-y divide-voxcina-cream/30 dark:divide-voxcina-blue/20">
                  {cart.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="py-6 flex flex-col sm:flex-row"
                      variants={cartItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={index}
                      layout
                    >
                      <div className="w-full sm:w-24 h-24 mb-4 sm:mb-0">
                        {getCartItemImage(item) ? (
                          <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-voxcina-cream/30 dark:bg-voxcina-blue/20 border border-voxcina-cream/50 dark:border-voxcina-blue/40 shadow-sm">
                            <Image
                              src={getCartItemImage(item)!}
                              alt={item.product.name || 'Product image'}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-24 w-24 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-xl flex items-center justify-center border border-voxcina-cream/50 dark:border-voxcina-blue/40">
                            <span className="text-voxcina-blue/50 dark:text-voxcina-cream/50 text-xs">
                              بدون تصویر
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-grow sm:mr-4">
                        <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                          {item.product.name}
                        </h3>

                        <div className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1 flex flex-wrap gap-2">
                          {item.size && (
                            <span className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20 px-2 py-0.5 rounded-md">
                              سایز: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20 px-2 py-0.5 rounded-md flex items-center">
                              رنگ:
                              <span
                                className="inline-block w-3 h-3 rounded-full mr-1 ml-1 border border-voxcina-cream dark:border-voxcina-blue/40"
                                style={{ backgroundColor: item.color }}
                              />
                              {/* Display color name - prefer from cart item, fallback to colorVariants */}
                              {(item.colorName || item.product.colorVariants?.find(cv => cv.color === item.color)?.colorName) && (
                                <span className="mr-1">
                                  {item.colorName || item.product.colorVariants?.find(cv => cv.color === item.color)?.colorName}
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="font-bold text-voxcina-blue dark:text-voxcina-cream">
                            {formatPrice(item.price)}
                          </div>

                          <div className="flex items-center">
                            <div className={`flex items-center border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-lg overflow-hidden bg-white dark:bg-voxcina-blue/20 shadow-inner-soft ${isLoading ? 'opacity-50' : ''}`}>
                              <motion.button
                                className="w-8 h-8 flex items-center justify-center text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() =>
                                  handleQuantityChange(
                                    item,
                                    getDisplayQuantity(item) - 1
                                  )
                                }
                                disabled={isLoading}
                                whileHover={!isLoading ? { scale: 1.1 } : {}}
                                whileTap={!isLoading ? { scale: 0.9 } : {}}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </motion.button>
                              <span className={`w-10 text-center py-1 font-medium text-voxcina-blue dark:text-voxcina-cream ${pendingQuantities[getItemKey(item)] !== undefined ? 'animate-pulse' : ''}`}>
                                {getDisplayQuantity(item)}
                              </span>
                              <motion.button
                                className="w-8 h-8 flex items-center justify-center text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() =>
                                  handleQuantityChange(
                                    item,
                                    getDisplayQuantity(item) + 1
                                  )
                                }
                                disabled={isLoading}
                                whileHover={!isLoading ? { scale: 1.1 } : {}}
                                whileTap={!isLoading ? { scale: 0.9 } : {}}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </motion.button>
                            </div>

                            <motion.button
                              className="mr-3 w-8 h-8 rounded-full flex items-center justify-center text-voxcina-blue/50 dark:text-voxcina-cream/50 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => handleRemoveItem(item)}
                              aria-label="حذف از سبد خرید"
                              disabled={isLoading}
                              whileHover={!isLoading ? { scale: 1.1 } : {}}
                              whileTap={!isLoading ? { scale: 0.9 } : {}}
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="lg:col-span-1"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm overflow-hidden backdrop-blur-sm sticky top-20">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-voxcina-blue dark:text-voxcina-cream">
                خلاصه سفارش
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    جمع سبد خرید
                  </span>
                  <span className="text-voxcina-blue dark:text-voxcina-cream">
                    {formatPrice(summary.subtotal)}
                  </span>
                </div>



                {summary.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>تخفیف</span>
                    <span>- {formatPrice(summary.discount)}</span>
                  </div>
                )}

                <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-4 mt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-voxcina-blue dark:text-voxcina-cream">
                      مجموع
                    </span>
                    <span className="text-voxcina-blue dark:text-voxcina-cream">
                      {formatPrice(summary.subtotal - summary.discount)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  {promoCode && promoCode.isValid ? (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-100 dark:border-green-800/30 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium block">
                            کد تخفیف {promoCode.code} (
                            {promoCode.discountPercentage}٪) اعمال شد
                          </span>
                          {promoCode.description && (
                            <span className="text-xs block mt-1 text-green-600 dark:text-green-400">
                              {promoCode.description}
                            </span>
                          )}
                        </div>
                        <motion.button
                          className="text-sm hover:underline text-green-700 dark:text-green-400"
                          onClick={() => removePromoCode()}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          حذف
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex">
                        <Input
                          type="text"
                          placeholder="کد تخفیف"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          error={promoError || (promoCode?.errorMessage ?? "")}
                          className="ml-2 rounded-xl border-voxcina-cream/50 dark:border-voxcina-blue/30 focus:border-voxcina-blue dark:focus:border-voxcina-cream/70 bg-white dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-voxcina-cream"
                        />
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="secondary"
                            className="rounded-xl bg-voxcina-cream/50 dark:bg-voxcina-blue/30 hover:bg-voxcina-cream dark:hover:bg-voxcina-blue/40 text-voxcina-blue dark:text-voxcina-cream border border-voxcina-cream/70 dark:border-voxcina-blue/40"
                            onClick={handleApplyPromoCode}
                          >
                            اعمال
                          </Button>
                        </motion.div>
                      </div>
                      {(promoError || promoCode?.errorMessage) && (
                        <p className="text-xs text-red-500 dark:text-red-400">
                          {promoError || promoCode?.errorMessage}
                        </p>
                      )}


                    </div>
                  )}
                </div>

                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  <Link href="/checkout" className="block" onClick={() => {
                    activityTracker.trackCheckoutStarted({
                      source: 'cart_page',
                      cartItemCount: cart.items.length,
                      cartTotal: summary.subtotal - summary.discount,
                      hasPromoCode: !!promoCode?.isValid,
                    });
                  }}>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      ادامه فرآیند خرید
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3"
                >
                  <Link href="/products" className="block">
                    <Button
                      variant="outline"
                      size="lg"
                      fullWidth
                      className="rounded-xl border-voxcina-cream/50 dark:border-voxcina-blue/30 text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-all duration-300"
                    >
                      ادامه خرید
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
