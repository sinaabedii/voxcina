"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { Check } from "lucide-react";

interface StickyMobileCheckoutBarProps {
  total: number;
  itemCount: number;
  isProcessing: boolean;
  disabled: boolean;
  onSubmit: () => void;
}

/**
 * Mobile-only (<md) sticky pay bar.
 * Shows the effective total + full-width CTA wired to handlePlaceOrder.
 * Respects the iOS safe area; page adds a spacer so content is never covered.
 */
export default function StickyMobileCheckoutBar({
  total,
  itemCount,
  isProcessing,
  disabled,
  onSubmit,
}: StickyMobileCheckoutBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-voxcina-cream/60 bg-white/95 shadow-[0_-8px_30px_rgba(26,60,105,0.12)] backdrop-blur-md md:hidden dark:border-voxcina-blue/30 dark:bg-voxcina-darkBlue/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="px-4 pb-3 pt-3">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
              مبلغ قابل پرداخت
              {itemCount > 0 && <span> • {itemCount} کالا</span>}
            </p>
            <p className="truncate text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
              {formatPrice(total)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-voxcina-blue/5 px-3 py-1.5 text-[11px] font-medium text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream">
            پرداخت امن
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onSubmit}
          isLoading={isProcessing}
          disabled={disabled || isProcessing}
          className="min-h-[48px] rounded-xl bg-voxcina-blue text-white shadow-md hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:text-voxcina-blue dark:hover:bg-voxcina-cream"
        >
          <Check className="ml-2 h-5 w-5" />
          ثبت سفارش و پرداخت
        </Button>
      </div>
    </div>
  );
}
