"use client";

import { CreditCard, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/types/order";
import { getPaymentGatewayText, getPaymentMethodText } from "@/lib/order-display";
import { CopyButton, getPaymentStatusMeta } from "./order-detail-utils";

interface OrderPaymentInfoCardProps {
  order: Order;
}

export function OrderPaymentInfoCard({ order }: OrderPaymentInfoCardProps) {
  const paymentMeta = getPaymentStatusMeta(order.payment_status);
  const isSnappPay = order.gateway_name === "snappay";

  const subtotal = order.total_amount - (order.shipping_cost || 0) + (order.discount_amount || 0);

  return (
    <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            اطلاعات مالی و پرداخت
          </h3>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${paymentMeta.className}`}>
          {paymentMeta.label}
        </span>
      </div>

      {/* Gateway & Method Details */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">روش پرداخت:</span>
          <span className="font-semibold text-voxcina-blue dark:text-voxcina-cream">
            {getPaymentMethodText(order)}
          </span>
        </div>

        {order.gateway_name && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">درگاه پرداخت:</span>
            <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
              {getPaymentGatewayText(order.gateway_name)}
            </span>
          </div>
        )}

        {/* SnappPay Branded Info */}
        {isSnappPay && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                سرویس اعتباری اسنپ‌پی
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                ۴ قسطه
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
              پرداخت توسط اعتبار کاربر در اسنپ‌پی تایید و تسویه شده است.
            </p>
          </div>
        )}

        {/* Transaction IDs and References */}
        {order.gateway_transaction_id && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-voxcina-cream/30 dark:border-white/5">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">شناسه تراکنش درگاه:</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
              <span className="truncate max-w-[150px]">{order.gateway_transaction_id}</span>
              <CopyButton text={order.gateway_transaction_id} label="شناسه تراکنش درگاه" />
            </div>
          </div>
        )}

        {order.merchant_transaction_id && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">شناسه سفارش فروشگاه:</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
              <span className="truncate max-w-[150px]">{order.merchant_transaction_id}</span>
              <CopyButton text={order.merchant_transaction_id} label="شناسه سفارش فروشگاه" />
            </div>
          </div>
        )}

        {order.snappay_payment_token && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">توکن پرداخت اسنپ‌پی:</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-voxcina-blue/80 dark:text-voxcina-cream/80" dir="ltr">
              <span className="truncate max-w-[140px]">{order.snappay_payment_token}</span>
              <CopyButton text={order.snappay_payment_token} label="توکن اسنپ‌پی" />
            </div>
          </div>
        )}

        {order.gateway_reference && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">کد مرجع درگاه:</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-voxcina-blue/80 dark:text-voxcina-cream/80" dir="ltr">
              <span>{order.gateway_reference}</span>
              <CopyButton text={order.gateway_reference} label="کد مرجع درگاه" />
            </div>
          </div>
        )}

        {/* Zibal Specific Tracking */}
        {order.zibal_track_id && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-voxcina-cream/30 dark:border-white/5">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">شناسه تراکنش زیبال:</span>
            <div className="flex items-center gap-1 font-mono font-semibold" dir="ltr">
              <span>{order.zibal_track_id}</span>
              <CopyButton text={order.zibal_track_id} label="شناسه زیبال" />
            </div>
          </div>
        )}

        {order.zibal_ref_number && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">شماره مرجع بانکی:</span>
            <div className="flex items-center gap-1 font-mono font-semibold" dir="ltr">
              <span>{order.zibal_ref_number}</span>
              <CopyButton text={order.zibal_ref_number} label="شماره مرجع" />
            </div>
          </div>
        )}

        {/* DigiPay Specific Tracking */}
        {order.digipay_tracking_code && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-voxcina-cream/30 dark:border-white/5">
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">کد پیگیری دیجی‌پی:</span>
            <div className="flex items-center gap-1 font-mono font-semibold" dir="ltr">
              <span>{order.digipay_tracking_code}</span>
              <CopyButton text={order.digipay_tracking_code} label="کد پیگیری دیجی‌پی" />
            </div>
          </div>
        )}
      </div>

      {/* Financial Breakdown Summary */}
      <div className="pt-3 border-t border-voxcina-cream/60 dark:border-white/10 space-y-2 text-xs">
        <div className="flex items-center justify-between text-voxcina-blue/70 dark:text-voxcina-cream/70">
          <span>جمع ارزش اقلام:</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {order.shipping_cost !== undefined && order.shipping_cost > 0 && (
          <div className="flex items-center justify-between text-voxcina-blue/70 dark:text-voxcina-cream/70">
            <span>هزینه بسته‌بندی و ارسال:</span>
            <span>{formatPrice(order.shipping_cost)}</span>
          </div>
        )}

        {order.discount_amount !== undefined && order.discount_amount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>تخفیف اعمال شده {order.discount_code && `(${order.discount_code})`}:</span>
            <span>-{formatPrice(order.discount_amount)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-voxcina-cream/60 dark:border-white/10 flex items-center justify-between text-sm font-black text-voxcina-blue dark:text-voxcina-cream">
          <span>مبلغ نهایی فاکتور:</span>
          <span className="text-base text-emerald-700 dark:text-emerald-400">
            {formatPrice(order.total_amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
