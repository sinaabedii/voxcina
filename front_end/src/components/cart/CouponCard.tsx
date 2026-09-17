"use client";

import { Check, Tag } from "lucide-react";
import CountdownTimer from "@/components/ui/CountdownTimer";
import { cn, formatPrice } from "@/lib/utils";
import { MessageCoupon } from "@/types/checkout-chat";

interface CouponCardProps {
  coupon: MessageCoupon;
  /** This is the session's live offer. Only the live one can be applied. */
  isCurrent: boolean;
  expired: boolean;
  applied: boolean;
  applying: boolean;
  /** Price the savings line is figured from — the cart subtotal. */
  basePrice?: number | null;
  onApply: () => void;
  onExpire: () => void;
}

/**
 * A coupon the checkout negotiation agent granted. A coupon a later offer replaced stays on
 * screen as a spent card rather than an apply button that would quietly hand
 * over the newer code.
 */
export default function CouponCard({
  coupon,
  isCurrent,
  expired,
  applied,
  applying,
  basePrice,
  onApply,
  onExpire,
}: CouponCardProps) {
  const isSpent = !isCurrent || expired;

  return (
    <div
      className={cn(
        "rounded-lg p-2.5 mt-2.5 transition-colors",
        isSpent
          ? "bg-background border border-gray-300 dark:border-gray-700"
          : "bg-background border border-emerald-400/40 dark:border-emerald-500/40"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Tag className={cn(
          "h-3.5 w-3.5 flex-shrink-0",
          isSpent ? "text-gray-400" : "text-emerald-600 dark:text-emerald-400"
        )} />
        <span className={cn(
          "text-xs font-bold",
          isSpent ? "text-gray-500 dark:text-gray-400" : "text-emerald-700 dark:text-emerald-300"
        )}>
          {!isCurrent
            ? "کد تخفیف با پیشنهاد تازه جایگزین شد"
            : expired
            ? "کد تخفیف منقضی شد"
            : `${coupon.value}٪ تخفیف`}
        </span>
        {!isSpent && coupon.valid_until && (
          <div className="mr-auto flex items-center bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04] rounded-md px-1.5 py-0.5">
            <CountdownTimer validUntil={coupon.valid_until} onExpire={onExpire} className="text-[10px]" />
          </div>
        )}
      </div>

      {!isSpent && (
        <>
          <div className="border-t border-dashed border-emerald-300/40 dark:border-emerald-700/40 my-1.5" />
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[10px] select-all tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-md px-1.5 py-0.5">
              {coupon.code}
            </span>
            {!!basePrice && coupon.value > 0 && (
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 whitespace-nowrap">
                صرفه‌جویی {formatPrice(basePrice * coupon.value / 100)}ت
              </span>
            )}
            <div className="mr-auto">
              {applied ? (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="h-3 w-3" />
                  اعمال شد
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onApply}
                  disabled={applying}
                  className="h-7 min-w-[4.25rem] flex-shrink-0 whitespace-nowrap rounded-md bg-emerald-600 px-2.5 text-[11px] leading-none text-white shadow-inset-button hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 disabled:opacity-60"
                >
                  {applying ? "..." : "اعمال کد"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
