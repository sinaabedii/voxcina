"use client";

import { Truck } from "lucide-react";

import { SHIPPING_DISCOUNT_LABELS } from "@/lib/shipping-discount";

/**
 * Explains who pays the shipping when a code carries a shipping discount.
 *
 * The option names are read from SHIPPING_DISCOUNT_LABELS so this note can
 * never drift from the labels the picker and the admin form show; only the
 * sentence around them is written here.
 */
export default function ShippingResponsibilityNote() {
  return (
    <section className="mb-8 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream">
          <Truck className="h-5 w-5" />
        </span>
        <h2 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">
          مسئولیت هزینه ارسال
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <p className="rounded-xl bg-voxcina-cream/50 px-4 py-3 text-sm leading-relaxed text-voxcina-blue/80 dark:bg-voxcina-blue/20 dark:text-voxcina-cream/80">
          در حالت «{SHIPPING_DISCOUNT_LABELS.free}»، ۵۰٪ هزینه ارسال بر عهده فروشنده و مابقی بر
          عهده پلتفرم است.
        </p>
        <p className="rounded-xl bg-voxcina-cream/50 px-4 py-3 text-sm leading-relaxed text-voxcina-blue/80 dark:bg-voxcina-blue/20 dark:text-voxcina-cream/80">
          در دو حالت «{SHIPPING_DISCOUNT_LABELS.half}» و «{SHIPPING_DISCOUNT_LABELS.full}»، هزینه
          ارسال توسط پلتفرم و کاربر پرداخت می‌شود.
        </p>
      </div>
    </section>
  );
}
