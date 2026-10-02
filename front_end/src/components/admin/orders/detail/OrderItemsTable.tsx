"use client";

import { Package, Minus, Plus, Trash2, Info } from "lucide-react";
import BackendImage from "@/components/BackendImage";
import { formatPrice, toPersianNumber } from "@/lib/utils";
import { OrderItem } from "@/types/order";

interface OrderItemsTableProps {
  items: OrderItem[];
  isSnappPayPaid?: boolean;
  updateQuantities?: Record<number, number>;
  onQuantityChange?: (index: number, newQty: number) => void;
}

export function OrderItemsTable({
  items,
  isSnappPayPaid = false,
  updateQuantities = {},
  onQuantityChange,
}: OrderItemsTableProps) {
  return (
    <>
      {/* Interactive Admin Items Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 overflow-hidden shadow-xs print:hidden">
        <div className="p-4 md:p-5 border-b border-voxcina-cream/60 dark:border-white/10 flex items-center justify-between bg-voxcina-cream/20 dark:bg-voxcina-blue/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
              <Package className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-voxcina-blue dark:text-voxcina-cream">
              اقلام سفارش ({toPersianNumber(items.length)} ردیف کالا)
            </h3>
          </div>

          {isSnappPayPaid && (
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              ویرایش اقلام اسنپ‌پی فعال
            </span>
          )}
        </div>

        {/* SnappPay items edit guidance banner */}
        {isSnappPayPaid && (
          <div className="px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              برای تسویه یا اصلاح اقلام در اسنپ‌پی، می‌توانید تعداد هر ردیف را کاهش داده یا آن را کاملاً حذف کنید. پس از اعمال تغییرات، دکمه «بروزرسانی اقلام و مبلغ» در سایدبار را بزنید.
            </span>
          </div>
        )}

        <div className="divide-y divide-voxcina-cream/40 dark:divide-white/5">
          {items.map((item: OrderItem, index: number) => {
            const currentQty = updateQuantities[index] ?? item.quantity;
            const isModified = isSnappPayPaid && currentQty !== item.quantity;
            const isDeleted = isSnappPayPaid && currentQty === 0;

            return (
              <div
                key={index}
                className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                  isDeleted
                    ? "bg-rose-500/5 opacity-75"
                    : isModified
                    ? "bg-amber-500/5"
                    : "hover:bg-voxcina-cream/10"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-voxcina-cream/30 dark:bg-voxcina-blue/30 shrink-0 border border-voxcina-cream/80 dark:border-white/10 shadow-2xs">
                  <BackendImage
                    src={item.product?.image || item.product_image || "/images/placeholder.png"}
                    alt={item.product?.name || item.product_name || "محصول"}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                  {isDeleted && (
                    <div className="absolute inset-0 bg-rose-900/60 flex items-center justify-center text-white text-[10px] font-bold">
                      حذف شده
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-grow min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream truncate">
                      {item.product?.name || item.product_name || "نامشخص"}
                    </h4>
                  </div>

                  {item.product?.brand && (
                    <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      برند: <span className="font-medium">{item.product.brand}</span>
                    </p>
                  )}

                  {/* Variant Details */}
                  <div className="flex items-center gap-2 text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 flex-wrap pt-0.5">
                    {item.variant?.size && (
                      <span className="px-2 py-0.5 rounded-lg bg-voxcina-cream/50 dark:bg-voxcina-blue/40 font-mono text-[11px] font-semibold text-voxcina-blue dark:text-voxcina-cream">
                        سایز: {item.variant.size}
                      </span>
                    )}
                    {(item.variant?.color || item.variant?.colorName) && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-voxcina-cream/50 dark:bg-voxcina-blue/40 text-[11px]">
                        {item.variant.color?.startsWith("#") && (
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: item.variant.color }}
                          />
                        )}
                        <span>{item.variant.colorName || item.variant.color}</span>
                      </span>
                    )}
                    {item.variant?.sku && (
                      <span className="text-[10px] font-mono text-voxcina-blue/50 dark:text-voxcina-cream/50">
                        کد: {item.variant.sku}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity & Price Column */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-voxcina-cream/40 dark:border-white/5">
                  <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    {toPersianNumber(item.quantity)} × {formatPrice(item.price_at_purchase)}
                  </div>

                  <div className="font-bold text-sm md:text-base text-voxcina-blue dark:text-voxcina-cream">
                    {formatPrice(item.quantity * item.price_at_purchase)}
                  </div>

                  {/* SnappPay in-place adjustments */}
                  {isSnappPayPaid && onQuantityChange && (
                    <div className="mt-1 flex items-center gap-2 pt-1">
                      <div className="flex items-center border border-voxcina-cream dark:border-white/20 rounded-xl overflow-hidden bg-white dark:bg-voxcina-blue/50">
                        <button
                          type="button"
                          onClick={() => onQuantityChange(index, Math.max(0, currentQty - 1))}
                          disabled={currentQty <= 0}
                          className="p-1 hover:bg-voxcina-cream/40 disabled:opacity-40"
                          title="کاهش یک عدد"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={currentQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            onQuantityChange(index, isNaN(val) ? 0 : Math.max(0, Math.min(item.quantity, val)));
                          }}
                          className="w-10 text-center text-xs font-bold font-mono bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => onQuantityChange(index, Math.min(item.quantity, currentQty + 1))}
                          disabled={currentQty >= item.quantity}
                          className="p-1 hover:bg-voxcina-cream/40 disabled:opacity-40"
                          title="افزایش یک عدد"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onQuantityChange(index, 0)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="حذف کامل این ردیف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable Invoice Items Table (Shown only on Print) */}
      <div className="hidden print:block border border-slate-300 rounded-xl overflow-hidden mt-4">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="p-2.5">ردیف</th>
              <th className="p-2.5">شرح کالا / خدمات</th>
              <th className="p-2.5">مشخصات (سایز/رنگ)</th>
              <th className="p-2.5">تعداد</th>
              <th className="p-2.5">قیمت واحد</th>
              <th className="p-2.5">مبلغ کل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-2.5">{toPersianNumber(idx + 1)}</td>
                <td className="p-2.5 font-bold">
                  {item.product?.name || item.product_name}
                  {item.product?.brand && <span className="font-normal text-slate-600 mr-1">({item.product.brand})</span>}
                </td>
                <td className="p-2.5">
                  {[item.variant?.size, item.variant?.colorName || item.variant?.color].filter(Boolean).join(" - ") || "—"}
                </td>
                <td className="p-2.5 font-mono">{toPersianNumber(item.quantity)}</td>
                <td className="p-2.5 font-mono">{formatPrice(item.price_at_purchase)}</td>
                <td className="p-2.5 font-bold font-mono">{formatPrice(item.quantity * item.price_at_purchase)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
