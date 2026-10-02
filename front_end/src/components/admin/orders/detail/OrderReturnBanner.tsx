"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { ReturnRequest } from "@/types/order";
import { formatPrice, toPersianNumber } from "@/lib/utils";

interface OrderReturnBannerProps {
  orderReturnRequest: ReturnRequest | null;
}

export function OrderReturnBanner({ orderReturnRequest }: OrderReturnBannerProps) {
  if (!orderReturnRequest) return null;

  return (
    <div className="rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
              درخواست مرجوعی برای این سفارش ثبت شده است
            </h3>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              شناسه مرجوعی: #{orderReturnRequest.id.slice(-6)}
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
            orderReturnRequest.status === "pending"
              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              : orderReturnRequest.status === "approved"
              ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300"
          }`}
        >
          {orderReturnRequest.status === "pending"
            ? "در انتظار بررسی ادمین"
            : orderReturnRequest.status === "approved"
            ? "تایید شده"
            : orderReturnRequest.status === "rejected"
            ? "رد شده"
            : "لغو شده"}
        </span>
      </div>

      {/* Items list */}
      <div className="bg-white/60 dark:bg-black/20 rounded-2xl p-3 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1.5">
        <div className="font-semibold text-amber-900 dark:text-amber-300">
          اقلام مورد درخواست:
        </div>
        {orderReturnRequest.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-voxcina-blue dark:text-voxcina-cream">
            <span>
              {toPersianNumber(item.quantity)} × {item.product_name}
              {(item.variant.size !== "N/A" || item.variant.colorName) && (
                <span className="text-voxcina-blue/50 dark:text-voxcina-cream/50">
                  {" "}
                  ({[item.variant.size !== "N/A" && item.variant.size, item.variant.colorName].filter(Boolean).join(" · ")})
                </span>
              )}
            </span>
            <span className="font-mono">{formatPrice(item.price_at_purchase * item.quantity)}</span>
          </div>
        ))}
        {orderReturnRequest.reason && (
          <div className="pt-1.5 border-t border-amber-200/40 dark:border-amber-800/20 text-voxcina-blue/70 dark:text-voxcina-cream/70">
            <span className="font-semibold text-amber-800 dark:text-amber-400">دلیل مشتری: </span>
            {orderReturnRequest.reason}
          </div>
        )}
      </div>

      {orderReturnRequest.status === "pending" && (
        <div className="pt-1">
          <Link
            href="/admin/returns"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
          >
            <span>بررسی و تصمیم‌گیری در پنل درخواست‌های مرجوعی</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      )}
    </div>
  );
}
