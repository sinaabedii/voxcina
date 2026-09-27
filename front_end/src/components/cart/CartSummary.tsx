import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useCartStore } from "@/store/cart-store";
import {
  shippingDiscountPercent,
} from "@/lib/shipping-discount";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import OrderTotalsRows from "@/components/checkout/OrderTotalsRows";
import { Receipt, Tag, ShoppingBag, CreditCard, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

interface CartSummaryProps {
  showCheckoutButton?: boolean;
  shippingCost?: number; // Optional override for shipping cost (used in checkout with dynamic shipping)
  showShipping?: boolean; // Whether to show shipping (hide on cart page, show on checkout)
  readOnly?: boolean; // Hide promo input and remove button (used in checkout)
}

const CartSummary: React.FC<CartSummaryProps> = ({
  showCheckoutButton = true,
  shippingCost,
  showShipping = true,
  readOnly = false,
}) => {
  const { cart, summary, promoCode, applyPromoCode, removePromoCode } = useCart();
  
  // `shippingCost` / `summary.shipping` are the BASE (pre-discount) shipping
  // cost; the active promo code's shipping discount is applied inside
  // OrderTotalsRows (single source of truth for totals rows).
  const shippingBase = shippingCost !== undefined ? shippingCost : summary.shipping;
  const shippingPercent = shippingDiscountPercent(promoCode?.shippingDiscount);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");

  const handleApplyPromoCode = async () => {
    if (!promoInput.trim()) {
      toast.warning("لطفا کد تخفیف را وارد کنید");
      return;
    }

    await applyPromoCode(promoInput);
    // Check if there's an error after applying
    const currentPromo = useCartStore.getState().promoCode;
    if (currentPromo && !currentPromo.isValid && currentPromo.errorMessage) {
      toast.error(currentPromo.errorMessage);
    }
    setPromoError("");
  };

  return (
    <motion.div 
      className="voxcina-card overflow-hidden sticky top-20 animate-fadeIn"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6 text-primary flex items-center">
          <Receipt className="ml-2 h-5 w-5" />
          خلاصه سفارش
        </h2>

        <div className="space-y-4">
          <OrderTotalsRows
            subtotal={summary.subtotal}
            discount={summary.discount}
            shippingBase={shippingBase}
            shippingPercent={shippingPercent}
            shippingDiscountValue={promoCode?.shippingDiscount}
            showShipping={showShipping}
            variant="full"
          />

          <div className="mt-6 bg-secondary/30 p-4 rounded-xl border border-border/5">
            <AnimatePresence mode="wait">
              {promoCode && promoCode.isValid ? (
                <motion.div 
                  key="promo-applied"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-success/10 text-success p-3 rounded-lg border border-success/20"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium items-center flex">
                        <CheckCircle className="ml-1.5 h-4 w-4" />
                        کد تخفیف {promoCode.code} اعمال شد
                      </span>
                      {promoCode.description && (
                        <span className="text-xs block mt-1 mr-5">
                          {promoCode.description}
                        </span>
                      )}
                    </div>
                    {!readOnly && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-sm hover:text-success/80 transition-colors duration-200 p-1 rounded-full hover:bg-success/5"
                        onClick={() => removePromoCode()}
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ) : !readOnly ? (
                <motion.div
                  key="promo-input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex">
                    <Input
                      type="text"
                      placeholder="کد تخفیف"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="ml-2"
                      leftElement={<Tag className="h-4 w-4" />}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleApplyPromoCode}
                      className="shadow-soft hover:shadow-medium"
                    >
                      اعمال
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {readOnly && (
            <div className="mt-3 text-center">
              <Link
                href="/cart"
                className="text-xs text-voxcina-blue/70 underline underline-offset-4 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream"
              >
                تغییر کد تخفیف در سبد خرید
              </Link>
            </div>
          )}

          {showCheckoutButton && (
            <Link href="/checkout" className="block mt-6">
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth
                className="shadow-medium hover:shadow-strong transition-all duration-300 flex items-center justify-center"
              >
                <CreditCard className="ml-2 h-5 w-5" />
                ادامه فرآیند خرید
              </Button>
            </Link>
          )}
          
          <div className="mt-2 flex items-center justify-center text-xs text-muted-foreground">
            <ShoppingBag className="ml-1 h-3 w-3" />
            {cart.items.length} محصول در سبد خرید
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CartSummary;
