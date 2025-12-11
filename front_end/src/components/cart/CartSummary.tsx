import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Receipt, Tag, ShoppingBag, CreditCard, Percent, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CartSummaryProps {
  showCheckoutButton?: boolean;
  shippingCost?: number; // Optional override for shipping cost (used in checkout with dynamic shipping)
}

const CartSummary: React.FC<CartSummaryProps> = ({
  showCheckoutButton = true,
  shippingCost,
}) => {
  const { summary, promoCode, applyPromoCode, removePromoCode } = useCart();
  
  // Use provided shipping cost or fall back to cart summary shipping
  const effectiveShipping = shippingCost !== undefined ? shippingCost : summary.shipping;
  // Recalculate total if shipping cost is overridden
  const effectiveTotal = shippingCost !== undefined 
    ? summary.subtotal - summary.discount + summary.tax + shippingCost
    : summary.total;
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");

  const handleApplyPromoCode = () => {
    if (!promoInput.trim()) {
      setPromoError("لطفا کد تخفیف را وارد کنید");
      return;
    }

    applyPromoCode(promoInput);
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
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center">
              <ShoppingBag className="ml-1 h-4 w-4" />
              جمع سبد خرید
            </span>
            <span className="font-medium">{formatPrice(summary.subtotal)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">مالیات</span>
            <span>{formatPrice(summary.tax)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">هزینه ارسال</span>
            <span>{effectiveShipping === 0 ? "رایگان" : formatPrice(effectiveShipping)}</span>
          </div>

          <AnimatePresence>
            {summary.discount > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between text-success items-center"
              >
                <span className="flex items-center">
                  <Percent className="ml-1 h-4 w-4" />
                  تخفیف
                </span>
                <span>- {formatPrice(summary.discount)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-t border-border/10 pt-4 mt-4">
            <div className="flex justify-between font-bold text-primary">
              <span>مجموع</span>
              <span>{formatPrice(effectiveTotal)}</span>
            </div>
          </div>

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
                        کد تخفیف {promoCode.code} ({promoCode.discountPercentage}
                        ٪) اعمال شد
                      </span>
                      {promoCode.description && (
                        <span className="text-xs block mt-1 mr-5">
                          {promoCode.description}
                        </span>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-sm hover:text-success/80 transition-colors duration-200 p-1 rounded-full hover:bg-success/5"
                      onClick={() => removePromoCode()}
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
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
                      error={promoError || (promoCode?.errorMessage ?? "")}
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
                  <AnimatePresence>
                    {(promoError || promoCode?.errorMessage) && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-destructive mr-1 animate-fadeIn pt-1"
                      >
                        {promoError || promoCode?.errorMessage}
                      </motion.p>
                    )}
                  </AnimatePresence>


                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
            {summary.items?.length || 0} محصول در سبد خرید
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CartSummary;