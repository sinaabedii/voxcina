"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Printer,
  RefreshCw,
  Calendar,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  Truck,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/types/order";
import { getPaymentGatewayText } from "@/lib/order-display";
import { CopyButton, getStatusMeta, getPaymentStatusMeta } from "./order-detail-utils";

interface OrderHeroHeaderProps {
  order: Order;
  onRefresh: () => void;
  onPrint: () => void;
}

export function OrderHeroHeader({ order, onRefresh, onPrint }: OrderHeroHeaderProps) {
  const statusMeta = getStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.payment_status);
  const isSnappPay = order.gateway_name === "snappay";

  return (
    <div className="space-y-4">
      {/* Top Bar Navigation & Actions */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-xl bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/70 dark:border-white/10 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/40 transition-colors shadow-2xs"
            title="بازگشت به سفارش‌ها"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 font-medium">
                مدیریت سفارش‌ها /
              </span>
              <span className="text-xs text-voxcina-blue/80 dark:text-voxcina-cream/80 font-semibold font-mono">
                {order.order_number}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-voxcina-blue dark:text-voxcina-cream mt-0.5 flex items-center gap-2">
              <span>سفارش {order.order_number}</span>
              <CopyButton text={order.order_number} label="شماره سفارش" />
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/70 dark:border-white/10 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue hover:bg-voxcina-cream/40 transition-all shadow-2xs cursor-pointer"
            title="تازه سازی اطلاعات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="rounded-xl border-voxcina-cream/70 dark:border-white/10 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/40 shadow-2xs font-semibold text-xs py-2 px-3.5"
          >
            <Printer className="w-4 h-4 ml-1.5" />
            چاپ فاکتور
          </Button>
        </div>
      </div>

      {/* Hero Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-gradient-to-br from-white via-white/95 to-voxcina-cream/30 dark:from-voxcina-blue/30 dark:via-voxcina-blue/20 dark:to-transparent p-5 md:p-6 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Status badges and timestamps */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Order Status Badge */}
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs ${statusMeta.className}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                <span>{order.status_text || statusMeta.label}</span>
              </span>

              {/* Payment Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs ${paymentMeta.className}`}
              >
                <paymentMeta.icon className="w-3.5 h-3.5" />
                <span>{paymentMeta.label}</span>
              </span>

              {/* Gateway Branding Badge */}
              {isSnappPay ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs shadow-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>اسنپ‌پی (پرداخت اقساطی ۴ قسط)</span>
                </span>
              ) : order.gateway_name ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-voxcina-cream/70 dark:bg-voxcina-blue/60 text-voxcina-blue dark:text-voxcina-cream border border-voxcina-cream dark:border-white/10">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>درگاه: {getPaymentGatewayText(order.gateway_name)}</span>
                </span>
              ) : null}

              {/* Tracking Code Quick Link Badge if already shipped */}
              {order.tracking_code && (
                <a
                  href={`https://tracking.post.ir/?id=${order.tracking_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 hover:bg-sky-100 transition-colors"
                  title="پیگیری مرسوله پستی"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{order.tracking_code}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                <span>ثبت سفارش: {order.jalali_created_at}</span>
              </span>
              {order.jalali_paid_at && (
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>پرداخت شده: {order.jalali_paid_at}</span>
                </span>
              )}
            </div>
          </div>

          {/* Formatted Total Amount */}
          <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-voxcina-cream/60 dark:border-white/10">
            <div className="text-right lg:text-left">
              <span className="block text-[11px] font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60">
                مبلغ نهایی سفارش
              </span>
              <div className="text-2xl font-black text-voxcina-blue dark:text-voxcina-cream tracking-tight mt-0.5">
                {formatPrice(order.total_amount)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
