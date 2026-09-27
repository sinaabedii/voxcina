"use client";

import React from "react";
import { Percent, Receipt, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  applyShippingDiscount,
  SHIPPING_DISCOUNT_LABELS,
  type ShippingDiscount,
} from "@/lib/shipping-discount";
import { cn } from "@/lib/utils";

interface OrderTotalsRowsProps {
  subtotal: number;
  discount: number;
  /** BASE (pre-discount) shipping — never the effective value. */
  shippingBase: number;
  shippingPercent: number;
  /** Raw shipping_discount value for the label lookup. */
  shippingDiscountValue?: string | null;
  showShipping?: boolean;
  variant?: "full" | "compact";
  className?: string;
}

/**
 * SINGLE source of truth for checkout totals rows.
 * Rendered by the mobile hero, the mobile full-totals block,
 * and the CartSummary mobile/desktop path.
 *
 * Formula mirrors page.tsx checkoutTotal and CartSummary effectiveTotal:
 *   effectiveShipping = applyShippingDiscount(base, percent)
 *   total = max(0, subtotal + effectiveShipping - discount)
 */
export default function OrderTotalsRows({
  subtotal,
  discount,
  shippingBase,
  shippingPercent,
  shippingDiscountValue,
  showShipping = true,
  variant = "full",
  className,
}: OrderTotalsRowsProps) {
  const effectiveShipping = applyShippingDiscount(shippingBase, shippingPercent);
  const subtotalAfterDiscount = subtotal - discount;
  const effectiveTotal = Math.max(
    0,
    showShipping ? subtotalAfterDiscount + effectiveShipping : subtotalAfterDiscount
  );

  const discountLabel =
    shippingDiscountValue &&
    (shippingDiscountValue as ShippingDiscount) in SHIPPING_DISCOUNT_LABELS
      ? SHIPPING_DISCOUNT_LABELS[shippingDiscountValue as ShippingDiscount]
      : null;

  const compact = variant === "compact";

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center text-muted-foreground">
          {!compact && <ShoppingBag className="ml-1 h-4 w-4" />}
          جمع سبد خرید
        </span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>

      {showShipping && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">هزینه ارسال</span>
          <div className="text-left">
            <span>{effectiveShipping === 0 ? "رایگان" : formatPrice(effectiveShipping)}</span>
            {shippingPercent > 0 && shippingBase > 0 && discountLabel && (
              <span className="block text-xs text-muted-foreground">{discountLabel}</span>
            )}
          </div>
        </div>
      )}

      {discount > 0 && (
        <div className="flex items-center justify-between text-success">
          <span className="flex items-center">
            {!compact && <Percent className="ml-1 h-4 w-4" />}
            تخفیف
          </span>
          <span>- {formatPrice(discount)}</span>
        </div>
      )}

      {showShipping && !compact && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">جمع پس از تخفیف</span>
          <span>{formatPrice(subtotalAfterDiscount)}</span>
        </div>
      )}

      <div className={cn("border-t border-border/10", compact ? "pt-2 mt-2" : "pt-4 mt-4")}>
        <div className="flex justify-between font-bold text-primary">
          <span className="flex items-center">
            {!compact && <Receipt className="ml-1 h-4 w-4 opacity-70" />}
            مجموع
          </span>
          <span>{formatPrice(effectiveTotal)}</span>
        </div>
      </div>
    </div>
  );
}
