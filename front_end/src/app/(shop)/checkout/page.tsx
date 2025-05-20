"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Truck, AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import CartSummary from "@/components/cart/CartSummary";
import { useCart } from "@/hooks/useCart";
import { useDashboardStore, Address } from "@/store/dashboard-store";
import { SHIPPING_METHODS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, summary, clearCart } = useCart();
  const { createOrder } = useDashboardStore();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("online");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(
    SHIPPING_METHODS[0].id
  );
  const [isProcessing, setIsProcessing] = useState(false);

  /* ────────────────────────────────────────────
     Redirect to /cart on the CLIENT only
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (cart.items.length === 0) {
      router.replace("/cart");
    }
  }, [cart.items.length, router]);

  /* While the redirect effect hasn't run yet, render nothing.
     This avoids executing any of the heavy checkout UI on the server. */
  if (cart.items.length === 0) return null;

  /* ────────────────────────────────────────────
     Place-order handler
  ───────────────────────────────────────────── */
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert("لطفا یک آدرس انتخاب کنید");
      return;
    }

    try {
      setIsProcessing(true);

      const orderId = createOrder(
        cart.items.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
        })),
        selectedAddress
      );

      clearCart();

      // simulate payment gateway round-trip
      await new Promise((resolve) => setTimeout(resolve, 2000));

      router.push(`/checkout/success?orderId=${orderId}`);
    } catch (error) {
      console.error("خطا در ثبت سفارش:", error);
      setIsProcessing(false);
      alert("خطا در ثبت سفارش. لطفا دوباره تلاش کنید.");
    }
  };

  /* ────────────────────────────────────────────
     Motion variants
  ───────────────────────────────────────────── */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  /* ────────────────────────────────────────────
     JSX
  ───────────────────────────────────────────── */
  return (
    <div className="container py-8 md:py-12">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">تکمیل سفارش</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ───────── Left column ───────── */}
        <motion.div className="lg:col-span-2 space-y-6" variants={itemVariants}>
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <CheckoutForm
              onSelectAddress={setSelectedAddress}
              selectedAddressId={selectedAddress?.id}
            />
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/10 shadow-sm rounded-2xl backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-6 text-voxcina-blue dark:text-voxcina-cream">
                  روش ارسال
                </h2>

                <div className="space-y-4">
                  {SHIPPING_METHODS.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                        selectedShippingMethod === method.id
                          ? "border-voxcina-blue dark:border-voxcina-cream/70 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 shadow-sm"
                          : "border-voxcina-cream/30 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/30 hover:shadow-sm"
                      }`}
                      onClick={() => setSelectedShippingMethod(method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="relative flex items-center">
                            <input
                              type="radio"
                              id={`shipping-${method.id}`}
                              name="shipping-method"
                              checked={selectedShippingMethod === method.id}
                              onChange={() =>
                                setSelectedShippingMethod(method.id)
                              }
                              className="w-5 h-5 opacity-0 absolute"
                            />
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ml-2 transition-all duration-200 ${
                                selectedShippingMethod === method.id
                                  ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue"
                                  : "border-voxcina-blue/30 dark:border-voxcina-cream/30"
                              }`}
                            >
                              {selectedShippingMethod === method.id && (
                                <Check className="w-3 h-3" />
                              )}
                            </div>
                            <label
                              htmlFor={`shipping-${method.id}`}
                              className="font-medium cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                            >
                              {method.title}
                            </label>
                          </div>
                        </div>
                        <span
                          className={`font-bold ${
                            selectedShippingMethod === method.id
                              ? "text-voxcina-blue dark:text-voxcina-cream"
                              : "text-voxcina-blue/70 dark:text-voxcina-cream/70"
                          }`}
                        >
                          {formatPrice(method.price)}
                        </span>
                      </div>
                      <div className="flex mt-3 mr-10 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 items-start">
                        <Truck className="h-4 w-4 text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5 ml-2 flex-shrink-0" />
                        <p>{method.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <PaymentMethods
              onSelectMethod={setSelectedPaymentMethod}
              selectedMethod={selectedPaymentMethod}
            />
          </motion.div>

          {!selectedAddress && (
            <motion.div
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start shadow-sm"
              variants={itemVariants}
              animate={{
                scale: [1, 1.02, 1],
                transition: { repeat: 2, duration: 1 },
              }}
            >
              <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 ml-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-400">
                  لطفا آدرس تحویل را انتخاب کنید
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  برای ادامه فرآیند خرید، لازم است یک آدرس تحویل انتخاب نمایید.
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            className="flex justify-end"
            variants={itemVariants}
            whileHover={{ y: -3 }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handlePlaceOrder}
              isLoading={isProcessing}
              disabled={!selectedAddress || isProcessing}
              className="w-full sm:w-auto rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300 px-8 py-3"
            >
              ثبت سفارش و پرداخت
            </Button>
          </motion.div>
        </motion.div>

        {/* ───────── Right column ───────── */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="sticky top-24">
            <CartSummary showCheckoutButton={false} />

            <div className="mt-6 bg-green-50/80 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-xl p-4 shadow-sm backdrop-blur-sm">
              <h3 className="font-semibold text-green-800 dark:text-green-400 flex items-center mb-2">
                <div className="w-5 h-5 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center ml-2">
                  <Check className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                </div>
                خرید امن و مطمئن
              </h3>
              <p className="text-sm text-green-700 dark:text-green-500">
                تمامی اطلاعات شخصی و تراکنش‌های مالی شما به صورت رمزنگاری شده و
                ایمن پردازش می‌شوند.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
