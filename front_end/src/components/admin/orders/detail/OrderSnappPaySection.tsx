"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck,
  RefreshCw,
  XCircle,
  AlertTriangle,
  BookOpen,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice, toPersianNumber } from "@/lib/utils";
import { Order } from "@/types/order";
import { CopyButton } from "./order-detail-utils";

interface SnappPayUpdateInfo {
  allowed: boolean;
  remainingItems: number;
  reducedRows: number;
  newItemsTotal: number;
  originalItemsTotal: number;
  difference: number;
}

interface OrderSnappPaySectionProps {
  order: Order;
  snappPayUpdate: SnappPayUpdateInfo;
  isUpdatingPayment: boolean;
  onUpdateSnappPay: () => Promise<void>;
  onCancelSnappPay: () => Promise<void>;
}

export function OrderSnappPaySection({
  order,
  snappPayUpdate,
  isUpdatingPayment,
  onUpdateSnappPay,
  onCancelSnappPay,
}: OrderSnappPaySectionProps) {
  const [pendingAction, setPendingAction] = useState<"update" | "cancel" | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (order.gateway_name !== "snappay") return null;

  const isPaid = order.payment_status === "paid" && order.status !== "cancelled";

  return (
    <div className="space-y-6 print:hidden">
      {/* SnappPay Operations Card */}
      {isPaid && (
        <div className="rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-300/40 dark:border-amber-700/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                عملیات مدیریت اسنپ‌پی
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
              پرداخت اقساطی اسنپ‌پی / ۴ قسط
            </span>
          </div>

          {/* Settlement Status Banner */}
          <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-amber-200/50 dark:border-amber-800/30">
            <span className="text-amber-900/70 dark:text-amber-300/70 font-medium">وضعیت تسویه درگاه:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {order.payment_status === "paid" ? "تسویه شده و قطعی (Settled)" : "در انتظار تسویه"}
            </span>
          </div>

          {/* 1-Click Copyable Tokens */}
          <div className="space-y-2 text-xs pt-1 border-t border-amber-200/40 dark:border-amber-800/20">
            {order.gateway_transaction_id && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-900/70 dark:text-amber-300/70">شناسه تراکنش اسنپ‌پی:</span>
                <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                  <span className="truncate max-w-[150px]">{order.gateway_transaction_id}</span>
                  <CopyButton text={order.gateway_transaction_id} label="شناسه تراکنش اسنپ‌پی" />
                </div>
              </div>
            )}

            {order.merchant_transaction_id && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-900/70 dark:text-amber-300/70">شناسه تراکنش فروشگاه:</span>
                <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                  <span className="truncate max-w-[150px]">{order.merchant_transaction_id}</span>
                  <CopyButton text={order.merchant_transaction_id} label="شناسه تراکنش فروشگاه" />
                </div>
              </div>
            )}

            {order.snappay_payment_token && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-900/70 dark:text-amber-300/70">توکن پرداخت اسنپ‌پی:</span>
                <div className="flex items-center gap-1 font-mono text-[11px] text-voxcina-blue/80 dark:text-voxcina-cream/80" dir="ltr">
                  <span className="truncate max-w-[140px]">{order.snappay_payment_token}</span>
                  <CopyButton text={order.snappay_payment_token} label="توکن اسنپ‌پی" />
                </div>
              </div>
            )}

            {order.gateway_reference && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-900/70 dark:text-amber-300/70">کد مرجع درگاه:</span>
                <div className="flex items-center gap-1 font-mono text-[11px] text-voxcina-blue/80 dark:text-voxcina-cream/80" dir="ltr">
                  <span>{order.gateway_reference}</span>
                  <CopyButton text={order.gateway_reference} label="کد مرجع درگاه" />
                </div>
              </div>
            )}
          </div>

          {/* 2-Stage Confirmation View */}
          {pendingAction ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50/90 dark:border-rose-800/60 dark:bg-rose-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">مرحله دوم تایید: اقدام قطعی اسنپ‌پی</h4>
                  <p className="text-[11px] leading-relaxed mt-1">
                    {pendingAction === "cancel"
                      ? `آیا از لغو کامل سفارش و بازگرداندن کل مبلغ (${formatPrice(order.total_amount)}) به حساب اسنپ‌پی خریدار اطمینان دارید؟ این عملیات قطعی و غیرقابل بازگشت است.`
                      : `آیا از اعمال کاهش تعداد اقلام اطمینان دارید؟ مبلغ کل از ${formatPrice(snappPayUpdate.originalItemsTotal)} به ${formatPrice(snappPayUpdate.newItemsTotal)} کاهش یافته و مبلغ ${formatPrice(snappPayUpdate.difference)} بلافاصله به خریدار بازمی‌گردد.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingAction(null)}
                  disabled={isUpdatingPayment}
                  className="flex-1 rounded-xl text-xs"
                >
                  انصراف
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (pendingAction === "cancel") {
                      await onCancelSnappPay();
                    } else {
                      await onUpdateSnappPay();
                    }
                    setPendingAction(null);
                  }}
                  disabled={
                    isUpdatingPayment ||
                    (pendingAction === "update" && !snappPayUpdate.allowed)
                  }
                  className="flex-1 rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isUpdatingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1.5" />
                      در حال ارسال...
                    </>
                  ) : (
                    "تایید نهایی و ارسال به اسنپ‌پی"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1 border-t border-amber-200/50 dark:border-amber-800/30">
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                مرحله اول: اقدام مورد نظر را انتخاب نمایید. پیش از اجرا، جزئیات و تایید نهایی درخواست می‌شود:
              </p>

              {/* Live difference indicator */}
              {snappPayUpdate.reducedRows > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>کاهش در {toPersianNumber(snappPayUpdate.reducedRows)} ردیف کالا:</span>
                    <span>-{formatPrice(snappPayUpdate.difference)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                    <span>مبلغ جدید اقلام:</span>
                    <span className="font-mono">{formatPrice(snappPayUpdate.newItemsTotal)}</span>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingAction("update")}
                disabled={isUpdatingPayment || !snappPayUpdate.allowed}
                className="w-full rounded-xl text-xs font-bold border-amber-300 dark:border-amber-700 hover:bg-amber-500/10 justify-center py-2.5"
              >
                <RefreshCw className="w-3.5 h-3.5 ml-1.5 text-amber-600" />
                بروزرسانی اقلام و مبلغ سفارش
              </Button>

              {!snappPayUpdate.allowed && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300/80 bg-white/40 dark:bg-black/20 p-2.5 rounded-xl border border-amber-300/40">
                  {snappPayUpdate.remainingItems === 0
                    ? "حداقل یک قلم باید در سفارش باقی بماند؛ برای حذف کامل تمام اقلام از دکمه لغو سفارش استفاده فرمایید."
                    : "برای فعال‌سازی بروزرسانی، ابتدا تعداد حداقل یک کالا را در جدول اقلام کاهش دهید."}
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingAction("cancel")}
                disabled={isUpdatingPayment}
                className="w-full rounded-xl text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 justify-center py-2.5"
              >
                <XCircle className="w-3.5 h-3.5 ml-1.5 text-rose-600" />
                لغو کامل سفارش در اسنپ‌پی
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 5-Point Operational Guide Card */}
      <div className="rounded-3xl border border-sky-200 dark:border-sky-800/40 bg-sky-50/50 dark:bg-sky-950/20 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setIsGuideOpen((v) => !v)}
          className="w-full p-4 flex items-center justify-between text-right text-sky-900 dark:text-sky-300 font-bold text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            راهنمای قوانین عملیاتی اسنپ‌پی
          </span>
          {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isGuideOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-4 pt-1 border-t border-sky-200/50 dark:border-sky-800/20 text-[11px] leading-6 text-sky-900/90 dark:text-sky-200/90 space-y-2"
            >
              <ol className="list-decimal pr-4 space-y-1.5">
                <li>
                  <strong>تکمیل فرآیند:</strong> پس از پرداخت خریدار، اسنپ‌پی شناسه تراکنش را برمی‌گرداند؛ پرداخت تنها پس از Verify و سپس Settle قطعی است.
                </li>
                <li>
                  <strong>پیگیری با پشتیبانی:</strong> شناسه تراکنش درگاه یا کد سفارش را برای هماهنگی با پشتیبانی اسنپ‌پی استفاده فرمایید.
                </li>
                <li>
                  <strong>شرایط بروزرسانی:</strong> بروزرسانی سفارش فقط پس از Settle مجاز است؛ مبلغ جدید حتماً باید کمتر از مبلغ فعلی باشد.
                </li>
                <li>
                  <strong>برگشت‌ناپذیری:</strong> کلیه عملیات لغو یا کاهش سفارش در اسنپ‌پی قطعی هستند و نیاز به تایید نهایی ادمین دارند.
                </li>
                <li>
                  <strong>فاصله‌گذاری درخواست‌ها:</strong> بین هر دو فراخوانی به درگاه اسنپ‌پی، حداقل ۳۰ ثانیه فاصله در نظر بگیرید.
                </li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
