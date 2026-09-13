"use client";

import {
  Wallet,
  ShoppingCart,
  Users,
  Ticket,
  TrendingDown,
  Package,
  RotateCcw,
  Receipt,
} from "lucide-react";

import {
  AdminBadge,
  AdminEmpty,
  AdminStatCard,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils";
import type {
  AttributedOrder,
  SellerPerformance,
  VoucherPerformance,
} from "@/types/seller";

/**
 * The statistics half of the seller panel, rendered identically for the seller
 * looking at their own numbers and for an admin looking at theirs.
 *
 * Both callers read the same API payload (buildSellerPanel on the Go side), so
 * keeping one component is what stops the two views from quietly disagreeing
 * about what a partner is owed.
 */

const VOUCHER_STATUS: Record<
  VoucherPerformance["status"],
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  active: { label: "فعال", tone: "success" },
  scheduled: { label: "زمان‌بندی‌شده", tone: "warning" },
  expired: { label: "منقضی", tone: "neutral" },
  depleted: { label: "تمام‌شده", tone: "danger" },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار",
  processing: "در حال پردازش",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغو‌شده",
};

function faDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR");
}

function faNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}

/** The headline cards: what was sold, and what it earned. */
export function SellerSummaryCards({ summary }: { summary: SellerPerformance }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <AdminStatCard
        icon={Wallet}
        label="سهم شما (قابل پرداخت)"
        value={formatPrice(summary.commission)}
        tone="green"
        hint="بر اساس سفارش‌های پرداخت‌شده"
      />
      <AdminStatCard
        icon={ShoppingCart}
        label="سفارش‌های پرداخت‌شده"
        value={faNumber(summary.orders_paid)}
        tone="blue"
        hint={`از ${faNumber(summary.orders_total)} سفارش ثبت‌شده`}
      />
      <AdminStatCard
        icon={TrendingDown}
        label="تخفیف داده‌شده به مشتری"
        value={formatPrice(summary.customer_discount)}
        tone="amber"
      />
      <AdminStatCard
        icon={Users}
        label="مشتریان یکتا"
        value={faNumber(summary.unique_customers)}
        tone="violet"
      />
    </div>
  );
}

/**
 * The second row of figures: the full funnel and the money trail from list
 * price down to the commissionable base. Separated from the headline cards so
 * the payable number is not buried among its inputs.
 */
export function SellerBreakdown({ summary }: { summary: SellerPerformance }) {
  const rows: { label: string; value: string; hint?: string }[] = [
    { label: "ارزش کالا (پیش از تخفیف)", value: formatPrice(summary.gross_subtotal) },
    { label: "تخفیف مشتری", value: `− ${formatPrice(summary.customer_discount)}` },
    { label: "خالص کالا", value: formatPrice(summary.net_merchandise) },
    {
      label: "مرجوعی تأییدشده",
      value: `− ${formatPrice(summary.returned_value)}`,
      hint: "ارزش کالاهای بازگشتی",
    },
    {
      label: "مبنای محاسبه سهم",
      value: formatPrice(summary.commission_base),
      hint: "خالص کالا پس از کسر مرجوعی",
    },
    { label: "سهم فروشنده", value: formatPrice(summary.commission) },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <div className="rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-5">
        <h3 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream mb-4">
          جزئیات محاسبه
        </h3>
        <dl className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-3 py-2 ${
                index === rows.length - 1
                  ? "border-t border-voxcina-cream dark:border-voxcina-blue/20 pt-3 font-bold"
                  : ""
              }`}
            >
              <dt className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                {row.label}
                {row.hint && (
                  <span className="block text-xs opacity-60">{row.hint}</span>
                )}
              </dt>
              <dd className="text-sm text-voxcina-blue dark:text-voxcina-cream whitespace-nowrap">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-4 content-start">
        <AdminStatCard icon={Ticket} label="کدهای فعال" value={`${faNumber(summary.active_voucher_count)} از ${faNumber(summary.voucher_count)}`} />
        <AdminStatCard icon={Package} label="تعداد کالای فروخته‌شده" value={faNumber(summary.items_sold)} />
        <AdminStatCard icon={Receipt} label="میانگین ارزش سفارش" value={formatPrice(summary.avg_order_value)} />
        <AdminStatCard icon={RotateCcw} label="سفارش‌های دارای مرجوعی" value={faNumber(summary.orders_returned)} tone={summary.orders_returned > 0 ? "amber" : "default"} />
        <AdminStatCard icon={ShoppingCart} label="در انتظار پرداخت" value={faNumber(summary.orders_pending)} />
        <AdminStatCard icon={ShoppingCart} label="لغو‌شده" value={faNumber(summary.orders_cancelled)} tone={summary.orders_cancelled > 0 ? "red" : "default"} />
      </div>
    </div>
  );
}

/** Per-code table: the split, the funnel, and what each code earned. */
export function SellerVouchersTable({ vouchers }: { vouchers: VoucherPerformance[] }) {
  if (vouchers.length === 0) {
    return (
      <AdminEmpty
        icon={Ticket}
        title="هنوز کدی ساخته نشده"
        description="با انتخاب سهم تخفیف و سهم خود، اولین کد را بسازید."
      />
    );
  }

  return (
    <AdminTable
      head={
        <>
          <AdminTh>کد</AdminTh>
          <AdminTh>تقسیم ۳۶٪</AdminTh>
          <AdminTh>وضعیت</AdminTh>
          <AdminTh>سفارش پرداخت‌شده</AdminTh>
          <AdminTh>مشتری یکتا</AdminTh>
          <AdminTh>تخفیف مشتری</AdminTh>
          <AdminTh>مبنای سهم</AdminTh>
          <AdminTh>سهم فروشنده</AdminTh>
          <AdminTh>آخرین استفاده</AdminTh>
        </>
      }
    >
      {vouchers.map((voucher) => {
        const status = VOUCHER_STATUS[voucher.status] ?? {
          label: voucher.status,
          tone: "neutral" as const,
        };
        return (
          <tr key={voucher.code}>
            <AdminTd className="font-mono font-bold whitespace-nowrap">{voucher.code}</AdminTd>
            <AdminTd className="whitespace-nowrap">
              <span className="text-amber-700 dark:text-amber-400">
                {faNumber(voucher.discount_percent)}٪ مشتری
              </span>
              <span className="opacity-40 mx-1">/</span>
              <span className="text-green-700 dark:text-green-400">
                {faNumber(voucher.seller_share_percent)}٪ شما
              </span>
            </AdminTd>
            <AdminTd>
              <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
            </AdminTd>
            <AdminTd>
              {faNumber(voucher.orders_paid)}
              {voucher.orders_total !== voucher.orders_paid && (
                <span className="opacity-50 text-xs"> / {faNumber(voucher.orders_total)}</span>
              )}
            </AdminTd>
            <AdminTd>{faNumber(voucher.unique_customers)}</AdminTd>
            <AdminTd className="whitespace-nowrap">{formatPrice(voucher.customer_discount)}</AdminTd>
            <AdminTd className="whitespace-nowrap">{formatPrice(voucher.commission_base)}</AdminTd>
            <AdminTd className="whitespace-nowrap font-bold text-green-700 dark:text-green-400">
              {formatPrice(voucher.commission)}
            </AdminTd>
            <AdminTd className="whitespace-nowrap">{faDate(voucher.last_used_at)}</AdminTd>
          </tr>
        );
      })}
    </AdminTable>
  );
}

/**
 * The orders behind the totals.
 *
 * Orders that did NOT count are still listed, dimmed and labelled, because
 * "why is my commission lower than my order count suggests" is the first
 * question these numbers raise.
 */
export function SellerOrdersTable({ orders }: { orders: AttributedOrder[] }) {
  if (orders.length === 0) {
    return (
      <AdminEmpty
        icon={ShoppingCart}
        title="هنوز سفارشی ثبت نشده"
        description="به محض اینکه مشتری با کد شما خرید کند، اینجا نمایش داده می‌شود."
      />
    );
  }

  return (
    <AdminTable
      head={
        <>
          <AdminTh>سفارش</AdminTh>
          <AdminTh>کد</AdminTh>
          <AdminTh>مشتری</AdminTh>
          <AdminTh>تاریخ</AdminTh>
          <AdminTh>وضعیت</AdminTh>
          <AdminTh>ارزش کالا</AdminTh>
          <AdminTh>تخفیف</AdminTh>
          <AdminTh>سهم شما</AdminTh>
        </>
      }
    >
      {orders.map((order) => (
        <tr key={order.order_id} className={order.countable ? "" : "opacity-55"}>
          <AdminTd className="font-mono whitespace-nowrap">{order.order_number}</AdminTd>
          <AdminTd className="font-mono whitespace-nowrap">{order.code}</AdminTd>
          <AdminTd className="whitespace-nowrap">{order.customer_name || "—"}</AdminTd>
          <AdminTd className="whitespace-nowrap">{faDate(order.created_at)}</AdminTd>
          <AdminTd className="whitespace-nowrap">
            <AdminBadge tone={order.countable ? "success" : "neutral"}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </AdminBadge>
            {!order.countable && (
              <span className="block text-xs opacity-60 mt-1">
                {order.payment_status === "paid" ? "لغو‌شده" : "پرداخت نشده"}
              </span>
            )}
          </AdminTd>
          <AdminTd className="whitespace-nowrap">{formatPrice(order.subtotal)}</AdminTd>
          <AdminTd className="whitespace-nowrap">{formatPrice(order.discount)}</AdminTd>
          <AdminTd className="whitespace-nowrap font-medium text-green-700 dark:text-green-400">
            {order.countable ? formatPrice(order.commission) : "—"}
          </AdminTd>
        </tr>
      ))}
    </AdminTable>
  );
}
