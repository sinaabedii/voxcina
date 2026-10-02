"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Printer,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Truck,
  RotateCcw,
} from "lucide-react";
import { Order } from "@/types/order";
import { formatPrice, toPersianNumber } from "@/lib/utils";
import { getPaymentMethodText } from "@/lib/order-display";

/**
 * Deterministic vector barcode representing order number.
 */
function OrderBarcode({ value }: { value: string }) {
  const bars = useMemo(() => {
    const pattern: number[] = [2, 1, 1, 2]; // start guard
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      pattern.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
    }
    pattern.push(2, 1, 1, 2); // stop guard
    return pattern;
  }, [value]);

  let x = 0;
  return (
    <div className="flex flex-col items-center">
      <svg className="h-6 w-28" viewBox="0 0 120 20" preserveAspectRatio="none">
        {bars.map((width, idx) => {
          const currentX = x;
          x += width + (idx % 2 === 0 ? 1 : 1.2);
          if (idx % 2 === 0) {
            return (
              <rect
                key={idx}
                x={currentX}
                y="0"
                width={width}
                height="20"
                fill="#0F172A"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="text-[8px] font-mono tracking-widest text-slate-700 mt-0.5" dir="ltr">
        *{value}*
      </span>
    </div>
  );
}

export default function OrderReceiptA5Page() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("سفارش یافت نشد یا دسترسی نامعتبر است");
        }

        const data: Order = await response.json();
        setOrder(data);

        // Auto-print support if requested in query parameter
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get("autoprint") === "true") {
            setTimeout(() => {
              window.print();
            }, 450);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات سفارش");
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-voxcina-blue/30 border-t-voxcina-blue rounded-full animate-spin mx-auto" />
          <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
            در حال بارگذاری و تنظیم فرمت رسید A5...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-sm w-full p-6 rounded-2xl bg-white dark:bg-voxcina-blue/20 border border-slate-200 dark:border-white/10 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            {error || "سفارش مورد نظر یافت نشد"}
          </p>
          <Link
            href={`/admin/orders/${orderId}`}
            className="inline-flex items-center gap-1.5 text-xs text-voxcina-blue dark:text-voxcina-cream font-semibold hover:underline"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>بازگشت به سفارش</span>
          </Link>
        </div>
      </div>
    );
  }

  const shippingAddress = order.shipping_address || {};
  const recipientName =
    `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() ||
    "مشتری گرامی";
  const subtotal =
    order.total_amount - (order.shipping_cost || 0) + (order.discount_amount || 0);

  return (
    <>
      {/* Exact A5 Print Stylesheet */}
      <style jsx global>{`
        @page {
          size: A5 portrait;
          margin: 6mm;
        }
        @media print {
          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 148mm !important;
            height: 210mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .a5-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 136mm !important;
            max-width: 136mm !important;
          }
        }
      `}</style>

      {/* Screen Container */}
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-6 px-3 flex flex-col items-center print:bg-white print:p-0 print:m-0 print:min-h-0">
        {/* Floating Top Action Toolbar (Hidden on print) */}
        <div className="w-full max-w-[148mm] mb-4 print:hidden flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
          <Link
            href={`/admin/orders/${order.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-voxcina-blue transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به سفارش</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              کاغذ A5 (۱۴۸ × ۲۱۰ میلی‌متر)
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-voxcina-blue text-white hover:bg-voxcina-darkBlue transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 ml-0.5" />
              <span>چاپ رسید A5</span>
            </button>
          </div>
        </div>

        {/* Physical A5 Sheet Preview (148mm x 210mm) */}
        <div
          dir="rtl"
          className="a5-sheet w-[148mm] min-h-[210mm] max-h-[210mm] overflow-hidden bg-white text-slate-900 shadow-xl border border-slate-300 p-[6mm] flex flex-col justify-between text-[11px] leading-tight select-none font-sans"
        >
          {/* Top Section */}
          <div className="space-y-2">
            {/* Header: Brand Letterhead & Order Metadata */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 shrink-0">
                  <Image
                    src="/images/Logo/BlueXTransparent.png"
                    alt="VOXCINA"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-950 tracking-wide">
                    وکسینا | VOXCINA
                  </div>
                  <div className="text-[9px] text-slate-600">فروشگاه آنلاین مد و پوشاک فاخر</div>
                  <div className="text-[8px] font-mono text-slate-500">voxcina.com</div>
                </div>
              </div>

              {/* Title Badge */}
              <div className="text-center pt-0.5">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold">
                  رسید تحویل و فاکتور فروش
                </span>
                <span className="block text-[8px] text-slate-500 font-mono mt-0.5">
                  A5 PACKING SLIP
                </span>
              </div>

              {/* Order Metadata & Barcode */}
              <div className="text-left space-y-0.5">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[9px] text-slate-600">سفارش:</span>
                  <span className="font-mono font-bold text-xs text-slate-950" dir="ltr">
                    {order.order_number}
                  </span>
                </div>
                <div className="text-[9px] text-slate-600">
                  تاریخ: <span className="font-mono">{order.jalali_created_at}</span>
                </div>
                <OrderBarcode value={order.order_number} />
              </div>
            </div>

            {/* Address & Sender / Recipient Block */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {/* Sender Info */}
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/60 space-y-1">
                <div className="font-bold text-slate-900 text-[10px] border-b border-slate-200 pb-0.5 flex items-center justify-between">
                  <span>فرستنده: وکسینا (VOXCINA)</span>
                  <span className="text-[8px] text-slate-500">مبدا تهران</span>
                </div>
                <div className="text-slate-700 leading-relaxed text-[9px]">
                  تهران، زعفرانیه، خیابان آصف، مجتمع وکسینا
                </div>
                <div className="flex items-center justify-between text-[8px] text-slate-600 pt-0.5">
                  <span>پشتیبانی: ۰۲۱-۲۲۰۰۳۳۰۰</span>
                  <span>کد پستی: ۱۹۸۷۹۵۴۳۲۱</span>
                </div>
              </div>

              {/* Recipient Info */}
              <div className="rounded-lg border border-slate-300 p-2 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-950 text-[10px] border-b border-slate-300 pb-0.5 flex items-center justify-between">
                  <span>گیرنده: {recipientName}</span>
                  <span className="font-mono font-bold text-slate-900 text-[9px]" dir="ltr">
                    {shippingAddress.phone_number || "-"}
                  </span>
                </div>
                <div className="text-slate-900 leading-relaxed text-[9px] font-medium">
                  {shippingAddress.province || shippingAddress.state || "-"}،{" "}
                  {shippingAddress.city || "-"}،{" "}
                  {shippingAddress.address || shippingAddress.street || "نشانی ثبت نشده"}
                </div>
                <div className="flex items-center justify-between text-[9px] pt-0.5">
                  <span className="font-mono font-bold text-slate-900" dir="ltr">
                    کد پستی: {shippingAddress.postal_code || "-"}
                  </span>
                  {order.tracking_code && (
                    <span className="font-mono text-[8px] text-slate-600">
                      کد رهگیری: {order.tracking_code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Items Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-right text-[10px]">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <tr>
                    <th className="p-1.5 text-center w-6">#</th>
                    <th className="p-1.5">شرح کالا</th>
                    <th className="p-1.5">مشخصات (سایز / رنگ)</th>
                    <th className="p-1.5 text-center w-10">تعداد</th>
                    <th className="p-1.5 text-left w-20">قیمت واحد</th>
                    <th className="p-1.5 text-left w-20">مبلغ کل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-1.5 text-center font-mono text-[9px] text-slate-600">
                        {toPersianNumber(idx + 1)}
                      </td>
                      <td className="p-1.5 font-bold text-slate-950">
                        {item.product?.name || item.product_name}
                        {item.product?.brand && (
                          <span className="font-normal text-slate-600 text-[9px] mr-1">
                            ({item.product.brand})
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-[9px] text-slate-700">
                        {[
                          item.variant?.size && `سایز: ${item.variant.size}`,
                          (item.variant?.colorName || item.variant?.color) &&
                            `رنگ: ${item.variant.colorName || item.variant.color}`,
                          item.variant?.sku && `کد: ${item.variant.sku}`,
                        ]
                          .filter(Boolean)
                          .join(" | ") || "—"}
                      </td>
                      <td className="p-1.5 text-center font-bold font-mono text-slate-900">
                        {toPersianNumber(item.quantity)}
                      </td>
                      <td className="p-1.5 text-left font-mono text-slate-700" dir="ltr">
                        {formatPrice(item.price_at_purchase)}
                      </td>
                      <td className="p-1.5 text-left font-bold font-mono text-slate-950" dir="ltr">
                        {formatPrice(item.quantity * item.price_at_purchase)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section: Totals, Payment status, and Guarantee */}
          <div className="space-y-2 pt-2 border-t border-slate-300">
            {/* Totals & Payment Row */}
            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Payment Summary */}
              <div className="space-y-1 text-[9px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span>وضعیت پرداخت:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {order.payment_status === "paid" ? "پرداخت شده (موفق)" : order.payment_status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>روش پرداخت:</span>
                  <span className="font-medium">{getPaymentMethodText(order)}</span>
                </div>
                {order.gateway_name === "snappay" && (
                  <div className="flex items-center justify-between text-emerald-800 font-semibold">
                    <span>پرداخت اقساطی اسنپ‌پی:</span>
                    <span>۴ قسط ماهانه بدون سود</span>
                  </div>
                )}
                {order.gateway_transaction_id && (
                  <div className="flex items-center justify-between font-mono text-[8px] text-slate-500" dir="ltr">
                    <span>TX ID: {order.gateway_transaction_id}</span>
                  </div>
                )}
              </div>

              {/* Totals Calculation */}
              <div className="space-y-1 text-[9px] border-r border-slate-300 pr-3">
                <div className="flex items-center justify-between text-slate-700">
                  <span>جمع ارزش کالاها:</span>
                  <span className="font-mono">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>هزینه بسته‌بندی و ارسال:</span>
                  <span>{order.shipping_cost ? formatPrice(order.shipping_cost) : "رایگان"}</span>
                </div>
                {order.discount_amount !== undefined && order.discount_amount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span>تخفیف:</span>
                    <span className="font-mono">-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-300 text-xs font-black text-slate-950">
                  <span>مبلغ کل پرداخت‌شده:</span>
                  <span className="font-mono text-xs">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Footer Guarantee & Customer Care */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[8px] text-slate-600 leading-normal flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">
                  از حسن انتخاب و اعتماد شما به وکسینا صمیمانه سپاسگزاریم.
                </p>
                <p>
                  کلیه کالاهای وکسینا شامل ضمانت ۷ روزه سلامت و اصالت فیزیکی می‌باشند. جهت تعویض سایز یا پیگیری سفارش با پشتیبانی در تماس باشید.
                </p>
              </div>
              <div className="text-left font-mono text-[8px] text-slate-500 shrink-0 mr-2">
                <div>voxcina.com</div>
                <div>support@voxcina.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
