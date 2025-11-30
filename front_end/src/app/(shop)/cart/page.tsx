"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft } from "lucide-react";
import { useCartStore, getCartWarnings } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { CartItem } from '@/types/cart';

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
  } = useCartStore();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const warnings = getCartWarnings();

  useEffect(() => {
    if (warnings.length) {
      const timer = setTimeout(() => {
        dismissCartWarnings();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [warnings, dismissCartWarnings]);

  const handleQuantityChange = (item: CartItem, quantity: number) => {
    if (quantity < 1) return;
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

    applyPromoCode(promoInput);

    if (promoInput === "WELCOME10" || promoInput === "SUMMER20") {
      setPromoError("");
    } else {
      setPromoError("کد تخفیف نامعتبر است");
    }
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
    <div className="container py-8 md:py-12">
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
                        {item.product.images &&
                        item.product.images.length > 0 ? (
                          <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-voxcina-cream/30 dark:bg-voxcina-blue/20 border border-voxcina-cream/50 dark:border-voxcina-blue/40 shadow-sm">
                            <Image
                              src={item.product.images[0]}
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

                        <div className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
                          {item.size && (
                            <span className="ml-4">سایز: {item.size}</span>
                          )}
                          {item.color && (
                            <span>
                              رنگ:{" "}
                              <span
                                className="inline-block w-4 h-4 rounded-full ml-1 border border-voxcina-cream dark:border-voxcina-blue/40"
                                style={{
                                  backgroundColor: item.color,
                                  verticalAlign: "middle",
                                }}
                              />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="font-bold text-voxcina-blue dark:text-voxcina-cream">
                            {formatPrice(item.price)}
                          </div>

                          <div className="flex items-center">
                            <div className="flex items-center border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-lg overflow-hidden bg-white dark:bg-voxcina-blue/20 shadow-inner-soft">
                              <motion.button
                                className="w-8 h-8 flex items-center justify-center text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                                onClick={() =>
                                  handleQuantityChange(
                                    item,
                                    item.quantity - 1
                                  )
                                }
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </motion.button>
                              <span className="w-10 text-center py-1 font-medium text-voxcina-blue dark:text-voxcina-cream">
                                {item.quantity}
                              </span>
                              <motion.button
                                className="w-8 h-8 flex items-center justify-center text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                                onClick={() =>
                                  handleQuantityChange(
                                    item,
                                    item.quantity + 1
                                  )
                                }
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </motion.button>
                            </div>

                            <motion.button
                              className="mr-3 w-8 h-8 rounded-full flex items-center justify-center text-voxcina-blue/50 dark:text-voxcina-cream/50 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              onClick={() => handleRemoveItem(item)}
                              aria-label="حذف از سبد خرید"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
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

                <div className="flex justify-between">
                  <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    مالیات
                  </span>
                  <span className="text-voxcina-blue dark:text-voxcina-cream">
                    {formatPrice(summary.tax)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    هزینه ارسال
                  </span>
                  <span className="text-voxcina-blue dark:text-voxcina-cream">
                    {formatPrice(summary.shipping)}
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
                      {formatPrice(summary.total)}
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

                      <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 pt-2">
                        <p>کدهای تخفیف فعال: WELCOME10, SUMMER20, FLASH30</p>
                      </div>
                    </div>
                  )}
                </div>

                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  <Link href="/checkout" className="block">
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
