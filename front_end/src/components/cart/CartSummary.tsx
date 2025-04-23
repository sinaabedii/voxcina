import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CartSummaryProps {
  showCheckoutButton?: boolean;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  showCheckoutButton = true,
}) => {
  const { summary, promoCode, applyPromoCode, removePromoCode } = useCart();
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
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden sticky top-20">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">خلاصه سفارش</h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">جمع سبد خرید</span>
            <span>{formatPrice(summary.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">مالیات</span>
            <span>{formatPrice(summary.tax)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">هزینه ارسال</span>
            <span>{formatPrice(summary.shipping)}</span>
          </div>

          {summary.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>تخفیف</span>
              <span>- {formatPrice(summary.discount)}</span>
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between font-bold">
              <span>مجموع</span>
              <span>{formatPrice(summary.total)}</span>
            </div>
          </div>

          <div className="mt-6">
            {promoCode && promoCode.isValid ? (
              <div className="bg-green-50 text-green-700 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium block">
                      کد تخفیف {promoCode.code} ({promoCode.discountPercentage}
                      ٪) اعمال شد
                    </span>
                    {promoCode.description && (
                      <span className="text-xs block mt-1">
                        {promoCode.description}
                      </span>
                    )}
                  </div>
                  <button
                    className="text-sm hover:underline"
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
                    className="ml-2"
                  />
                  <Button variant="secondary" onClick={handleApplyPromoCode}>
                    اعمال
                  </Button>
                </div>
                {(promoError || promoCode?.errorMessage) && (
                  <p className="text-xs text-destructive">
                    {promoError || promoCode?.errorMessage}
                  </p>
                )}

                <div className="text-xs text-muted-foreground pt-2">
                  <p>کدهای تخفیف فعال: WELCOME10, SUMMER20, FLASH30</p>
                </div>
              </div>
            )}
          </div>

          {showCheckoutButton && (
            <Link href="/checkout">
              <Button variant="primary" size="lg" fullWidth>
                ادامه فرآیند خرید
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
