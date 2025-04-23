"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { motion } from "framer-motion";

export default function CartPage() {
  const {
    cart,
    summary,
    updateItemQuantity,
    removeItem,
    applyPromoCode,
    removePromoCode,
    promoCode,
  } = useCartStore();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      updateItemQuantity(itemId, quantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
  };

  if (cart.items.length === 0) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-gray-500 dark:text-gray-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">
          سبد خرید شما خالی است
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
          محصولی به سبد خرید خود اضافه نکرده‌اید. می‌توانید به فروشگاه بروید و
          محصولات مورد نظر خود را انتخاب کنید.
        </p>
        <Link href="/products">
          <Button
            variant="primary"
            size="lg"
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
          >
            مشاهده محصولات
            <ArrowLeft className="mr-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        سبد خرید
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                محصولات
              </h2>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
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
                      {item.product.images && item.product.images.length > 0 ? (
                        <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-24 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            بدون تصویر
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-grow sm:mr-4">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.product.name}
                      </h3>

                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.size && (
                          <span className="ml-4">سایز: {item.size}</span>
                        )}
                        {item.color && (
                          <span>
                            رنگ:{" "}
                            <span
                              className="inline-block w-4 h-4 rounded-full ml-1 border border-gray-200 dark:border-gray-600"
                              style={{
                                backgroundColor: item.color,
                                verticalAlign: "middle",
                              }}
                            />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {formatPrice(item.price)}
                        </div>

                        <div className="flex items-center">
                          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                            <button
                              className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-10 text-center py-1 font-medium text-gray-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            className="mr-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label="حذف از سبد خرید"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden sticky top-20">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                خلاصه سفارش
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    جمع سبد خرید
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(summary.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    مالیات
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(summary.tax)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    هزینه ارسال
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(summary.shipping)}
                  </span>
                </div>

                {summary.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>تخفیف</span>
                    <span>- {formatPrice(summary.discount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-900 dark:text-white">مجموع</span>
                    <span className="text-primary">
                      {formatPrice(summary.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  {promoCode && promoCode.isValid ? (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-100 dark:border-green-800">
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
                        <button
                          className="text-sm hover:underline text-green-700 dark:text-green-400"
                          onClick={() => removePromoCode()}
                        >
                          حذف
                        </button>
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
                          className="ml-2 rounded-lg border-gray-200 dark:border-gray-700 focus:border-primary"
                        />
                        <Button
                          variant="secondary"
                          className="rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                          onClick={handleApplyPromoCode}
                        >
                          اعمال
                        </Button>
                      </div>
                      {(promoError || promoCode?.errorMessage) && (
                        <p className="text-xs text-red-500 dark:text-red-400">
                          {promoError || promoCode?.errorMessage}
                        </p>
                      )}

                      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                        <p>کدهای تخفیف فعال: WELCOME10, SUMMER20, FLASH30</p>
                      </div>
                    </div>
                  )}
                </div>

                <Link href="/checkout" className="block mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
                  >
                    ادامه فرآیند خرید
                  </Button>
                </Link>

                <Link href="/products" className="block mt-3">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    className="rounded-xl border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    ادامه خرید
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
