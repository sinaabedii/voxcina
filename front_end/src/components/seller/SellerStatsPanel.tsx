"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  ShoppingCart,
  Users,
  Ticket,
  TrendingDown,
  Package,
  RotateCcw,
  Receipt,
  Trash2,
  Copy,
  Check,
  Link2,
  Gift,
} from "lucide-react";

import {
  AdminBadge,
  AdminEmpty,
  AdminStatCard,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/ui";
import ConfirmRemoveModal from "@/components/ui/ConfirmRemoveModal";
import { formatPrice } from "@/lib/utils";
import {
  SHIPPING_DISCOUNT_LABELS,
  type ShippingDiscount,
} from "@/lib/shipping-discount";
import type {
  AttributedOrder,
  ReferralEarnings,
  SellerPerformance,
  SellerReferralInfo,
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

function getExpiryCountdown(validTo?: string, status?: string): {
  text: string;
  className: string;
} | null {
  if (!validTo) return null;
  const d = new Date(validTo);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (status === "expired" || diffDays < 0) {
    return {
      text: "منقضی شده",
      className: "text-red-500 dark:text-red-400 font-medium",
    };
  }
  if (diffDays === 0) {
    return {
      text: "امروز منقضی می‌شود",
      className: "text-amber-600 dark:text-amber-400 font-medium",
    };
  }
  if (diffDays <= 7) {
    return {
      text: `${faNumber(diffDays)} روز باقی‌مانده`,
      className: "text-amber-600 dark:text-amber-400 font-medium",
    };
  }
  return {
    text: `${faNumber(diffDays)} روز دیگر`,
    className: "text-voxcina-blue/50 dark:text-voxcina-cream/50",
  };
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "کد تخفیف کپی شد" : "کپی کد تخفیف"}
      title={copied ? "کپی شد!" : "برای کپی کلیک کنید"}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-voxcina-cream/60 hover:bg-voxcina-cream dark:bg-voxcina-blue/30 dark:hover:bg-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream text-xs font-mono font-bold transition-all border border-voxcina-cream dark:border-voxcina-blue/40 group active:scale-95"
    >
      <span>{code}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
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

/**
 * The recruiter's team list, tolerating both JSON keys: the deployed backend
 * ships `referral_sellers` (services.ReferralEarnings); `sellers` is a
 * forward-compat alias that is never written.
 */
export function getReferralSellers(earnings?: ReferralEarnings | null): SellerPerformance[] {
  if (!earnings) return [];
  if (Array.isArray(earnings.referral_sellers)) return earnings.referral_sellers;
  if (Array.isArray(earnings.sellers)) return earnings.sellers ?? [];
  return [];
}

/**
 * The recruiter invite box. Rendered only when the seller may recruit and a
 * code was issued — the page also gates on `can_refer`, this guards the code.
 *
 * The backend returns a path-only signup URL (no host config exists
 * server-side), so the absolute link is built client-side against the
 * storefront origin.
 */
export function SellerReferralInviteBox({
  referral,
}: {
  referral?: SellerReferralInfo | null;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!referral?.can_refer || !referral?.code) return null;

  const inviteLink = referral.signup_path ? `${origin}${referral.signup_path}` : "";

  const handleCopy = async () => {
    const text: string = inviteLink || referral.signup_path || referral.code || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-5 md:p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream">
          <Link2 className="h-5 w-5" />
        </span>
        <h2 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">
          لینک دعوت فروشنده
        </h2>
        <span dir="ltr">
          <AdminBadge tone="info" className="font-mono">
            {referral.code}
          </AdminBadge>
        </span>
      </div>

      <p className="text-sm leading-relaxed text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
        این لینک را برای فروشندگان جدید بفرستید؛ ثبت‌نام از طریق آن، آن‌ها را به تیم شما اضافه می‌کند و
        سهم شما از فروش تیم در همین پنل حساب می‌شود.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div
          dir="ltr"
          className="flex-1 min-w-0 truncate rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 px-3 py-2.5 text-xs font-mono text-voxcina-blue dark:text-voxcina-cream text-left"
        >
          {inviteLink || referral.signup_path || referral.code}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-voxcina-blue px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 dark:bg-voxcina-cream dark:text-voxcina-blue"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "کپی شد!" : "کپی لینک"}
        </button>
      </div>
    </section>
  );
}

/**
 * The referral money card: what the team earned the parent, and the parent's
 * total claim (own commission + referral commission) with a side-by-side
 * breakdown so the two never look mixed.
 *
 * Pure display — the page decides whether to mount it (can_refer or any team
 * history), so zeros render honestly instead of hiding the breakdown.
 */
export function SellerReferralEarnings({
  summary,
  earnings,
}: {
  summary: SellerPerformance;
  earnings?: ReferralEarnings | null;
}) {
  const referralCommission = summary.referral_commission ?? earnings?.referral_commission ?? 0;
  const referralOrders = summary.referral_orders_paid ?? earnings?.referral_orders_paid ?? 0;
  const sellerCount = summary.referral_seller_count ?? earnings?.referral_seller_count ?? 0;
  const ownCommission = summary.commission ?? 0;
  const totalClaim = ownCommission + referralCommission;

  return (
    <section className="mb-8 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-5 md:p-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream">
          <Gift className="h-5 w-5" />
        </span>
        <h2 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">
          درآمد معرفی فروشندگان
        </h2>
      </div>
      <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-5">
        سهم شما از فروش پرداخت‌شده تیم معرفی‌شده، جدا از فروش خودتان حساب می‌شود.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 p-4 text-center">
          <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-1">
            تعداد فروشندگان معرفی‌شده
          </p>
          <p className="text-2xl font-black text-voxcina-blue dark:text-voxcina-cream">
            {faNumber(sellerCount)}
          </p>
          <p className="mt-1 text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">نفر</p>
        </div>
        <div className="rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 p-4 text-center">
          <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-1">
            سفارش‌های پرداخت‌شده تیم
          </p>
          <p className="text-2xl font-black text-voxcina-blue dark:text-voxcina-cream">
            {faNumber(referralOrders)}
          </p>
          <p className="mt-1 text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">سفارش</p>
        </div>
        <div className="rounded-xl border border-green-200/80 dark:border-green-800/40 bg-gradient-to-br from-green-50/90 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/10 p-4 text-center">
          <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
            درآمد حاصل از معرفی
          </p>
          <p className="text-2xl font-black text-green-700 dark:text-green-400">
            {formatPrice(referralCommission)}
          </p>
          <p className="mt-1 text-[11px] text-green-700/70 dark:text-green-400/70">
            سهم تیم، جدا از فروش خودتان
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-green-200/80 dark:border-green-800/40 bg-green-50/60 dark:bg-green-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-green-800 dark:text-green-300">
            جمع کل دریافتی شما
          </p>
          <p className="mt-1 text-2xl font-black text-green-700 dark:text-green-400">
            {formatPrice(totalClaim)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-voxcina-blue/30 border border-voxcina-cream dark:border-voxcina-blue/30 px-2.5 py-1.5 font-medium text-voxcina-blue dark:text-voxcina-cream">
            فروش خودتان: {formatPrice(ownCommission)}
          </span>
          <span className="font-bold text-green-700 dark:text-green-400">+</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-voxcina-blue/30 border border-green-200/80 dark:border-green-800/40 px-2.5 py-1.5 font-medium text-green-800 dark:text-green-300">
            سهم تیم: {formatPrice(referralCommission)}
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Per-recruit mini-table from the referral earnings payload. Optional by
 * construction: renders nothing when the team list is empty.
 */
export function SellerReferralTeamTable({
  earnings,
}: {
  earnings?: ReferralEarnings | null;
}) {
  const sellers = getReferralSellers(earnings);
  if (sellers.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
        عملکرد فروشندگان معرفی‌شده
      </h2>
      <AdminTable
        head={
          <>
            <AdminTh>فروشنده</AdminTh>
            <AdminTh>وضعیت</AdminTh>
            <AdminTh>سفارش پرداخت‌شده</AdminTh>
            <AdminTh>مشتری یکتا</AdminTh>
            <AdminTh>مبنای فروش تیم</AdminTh>
            <AdminTh>سهم فروشنده</AdminTh>
            <AdminTh>عضویت</AdminTh>
          </>
        }
      >
        {sellers.map((seller) => (
          <tr key={`${seller.seller_id}-${seller.name}`}>
            <AdminTd className="whitespace-nowrap font-medium">
              {seller.name || "—"}
              {seller.voucher_count > 0 && (
                <span className="block text-[11px] font-normal opacity-60">
                  {faNumber(seller.voucher_count)} کد تخفیف
                </span>
              )}
            </AdminTd>
            <AdminTd>
              <AdminBadge tone={seller.is_active ? "success" : "neutral"}>
                {seller.is_active ? "فعال" : "غیرفعال"}
              </AdminBadge>
            </AdminTd>
            <AdminTd className="whitespace-nowrap">{faNumber(seller.orders_paid)}</AdminTd>
            <AdminTd className="whitespace-nowrap">{faNumber(seller.unique_customers)}</AdminTd>
            <AdminTd className="whitespace-nowrap">{formatPrice(seller.commission_base)}</AdminTd>
            <AdminTd className="whitespace-nowrap">{formatPrice(seller.commission)}</AdminTd>
            <AdminTd className="whitespace-nowrap">{faDate(seller.joined_at)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
    </section>
  );
}

/** Per-code table: the split, the funnel, and what each code earned. */
export function SellerVouchersTable({
  vouchers,
  onRemove,
  budgetTotal,
}: {
  vouchers: VoucherPerformance[];
  /** Expires a code via DELETE /api/seller/vouchers/{id}. Optional so the admin view of this table stays read-only. */
  onRemove?: (id: string) => Promise<boolean>;
  /** The seller's split budget (36 standard, 20 referral-joined). Labels render from it; defaults to 36. */
  budgetTotal?: number;
}) {
  const [removeTarget, setRemoveTarget] = useState<VoucherPerformance | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const splitLabel = `تقسیم ${faNumber(budgetTotal ?? 36)}٪`;

  const totalCount = vouchers.length;
  const activeCount = useMemo(
    () => vouchers.filter((v) => v.status === "active").length,
    [vouchers]
  );

  const displayedVouchers = useMemo(() => {
    if (showAll) return vouchers;
    return vouchers.filter((v) => v.status === "active");
  }, [vouchers, showAll]);

  const handleConfirmRemove = async () => {
    if (!removeTarget || !onRemove) return;
    setIsRemoving(true);
    const ok = await onRemove(removeTarget.id ?? removeTarget.code);
    setIsRemoving(false);
    // The store toasts the failure reason; keep the dialog open so the seller
    // can retry, close it once the code is actually gone.
    if (ok) setRemoveTarget(null);
  };

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
    <>
      {/* Vouchers Filter & Status Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/80 dark:bg-voxcina-blue/15 shadow-2xs mb-4">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs sm:text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="w-4 h-4 rounded text-voxcina-blue focus:ring-voxcina-blue/30 border-voxcina-cream dark:border-voxcina-blue/40 bg-white dark:bg-voxcina-blue/40 cursor-pointer"
          />
          <span>نمایش همه کدهای تخفیف (شامل منقضی، تمام‌شده و غیرفعال)</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <AdminBadge tone={activeCount > 0 ? "success" : "neutral"}>
            {faNumber(activeCount)} فعال از {faNumber(totalCount)} کد
          </AdminBadge>
          {totalCount - activeCount > 0 && !showAll && (
            <span className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
              ({faNumber(totalCount - activeCount)} کد غیرفعال/منقضی پنهان است)
            </span>
          )}
        </div>
      </div>

      {displayedVouchers.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-2xl border border-dashed border-voxcina-cream dark:border-voxcina-blue/30 bg-voxcina-cream/15 dark:bg-voxcina-blue/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-voxcina-cream/50 dark:bg-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 flex items-center justify-center mx-auto shadow-2xs">
            <Ticket className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
              کد تخفیف فعالی وجود ندارد
            </h4>
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed">
              کد تخفیف فعالی وجود ندارد. برای مشاهده کدهای گذشته (منقضی یا تمام‌شده)، تیک بالا را فعال کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <span>مشاهده کدهای گذشته ({faNumber(totalCount)} کد)</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="block lg:hidden space-y-4">
            {displayedVouchers.map((voucher) => {
          const status = VOUCHER_STATUS[voucher.status] ?? {
            label: voucher.status,
            tone: "neutral" as const,
          };

          const used = voucher.used_count ?? voucher.orders_paid ?? 0;
          const max = voucher.max_uses;
          const hasLimit = typeof max === "number" && max > 0;
          const percent = hasLimit ? Math.min(100, Math.round((used / max) * 100)) : null;
          const isDepleted = hasLimit && used >= max;
          const countdown = getExpiryCountdown(voucher.valid_to, voucher.status);

          return (
            <div
              key={voucher.code}
              className="rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 p-4 sm:p-5 shadow-sm space-y-4"
            >
              {/* Header: Code, Badges, and Action */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <CopyCodeButton code={voucher.code} />
                  {voucher.shipping_discount && voucher.shipping_discount !== "full" && (
                    <AdminBadge tone={voucher.shipping_discount === "free" ? "success" : "info"}>
                      {SHIPPING_DISCOUNT_LABELS[voucher.shipping_discount as ShippingDiscount] ||
                        SHIPPING_DISCOUNT_LABELS.full}
                    </AdminBadge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                  {onRemove && voucher.status === "active" && (
                    <button
                      type="button"
                      aria-label="حذف کد تخفیف"
                      title="حذف کد تخفیف"
                      disabled={isRemoving}
                      className="p-1.5 rounded-lg text-red-500/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400/70 dark:hover:text-red-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      onClick={() => setRemoveTarget(voucher)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2 Key Metrics: Earnings and Usage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Earnings */}
                <div className="rounded-xl border border-green-200/80 dark:border-green-800/40 bg-gradient-to-br from-green-50/90 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/10 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-green-800 dark:text-green-300">
                      درآمد شما (سهم از فروش)
                    </span>
                    <span className="text-[10px] font-bold text-green-700/80 dark:text-green-400/80 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-md">
                      {faNumber(voucher.seller_share_percent)}٪ سهم
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-green-700 dark:text-green-400">
                      {formatPrice(voucher.commission)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-green-700/70 dark:text-green-400/70">
                    از مبنای {formatPrice(voucher.commission_base)}
                  </div>
                </div>

                {/* 2. Usage */}
                <div className="rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-voxcina-blue/80 dark:text-voxcina-cream/80">
                      تعداد استفاده
                    </span>
                    {hasLimit && (
                      <span className="text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        سقف {faNumber(max)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-voxcina-blue dark:text-voxcina-cream">
                      {faNumber(used)}
                    </span>
                    {hasLimit ? (
                      <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        از {faNumber(max)} بار
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        بار (نامحدود)
                      </span>
                    )}
                  </div>
                  {hasLimit ? (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-voxcina-cream dark:bg-voxcina-blue/40 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDepleted
                              ? "bg-red-500"
                              : (percent ?? 0) >= 80
                              ? "bg-amber-500"
                              : "bg-voxcina-blue dark:bg-voxcina-cream"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        <span>{isDepleted ? "تکمیل ظرفیت" : `${faNumber(percent ?? 0)}٪ مصرف شده`}</span>
                        <span>{faNumber(Math.max(0, max - used))} باقی‌مانده</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                      بدون سقف استفاده
                    </div>
                  )}
                </div>
              </div>

              {/* Secondary Details */}
              <div className="border-t border-voxcina-cream/70 dark:border-voxcina-blue/20 pt-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-voxcina-blue/60 dark:text-voxcina-cream/60">{splitLabel}</dt>
                    <dd className="font-medium mt-0.5 whitespace-nowrap">
                      <span className="text-amber-700 dark:text-amber-400">
                        {faNumber(voucher.discount_percent)}٪ مشتری
                      </span>
                      <span className="opacity-40 mx-1">/</span>
                      <span className="text-green-700 dark:text-green-400">
                        {faNumber(voucher.seller_share_percent)}٪ شما
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-voxcina-blue/60 dark:text-voxcina-cream/60">سفارش‌های پرداخت‌شده</dt>
                    <dd className="font-medium text-voxcina-blue dark:text-voxcina-cream mt-0.5">
                      {faNumber(voucher.orders_paid)}
                      {voucher.orders_total !== voucher.orders_paid && (
                        <span className="opacity-60 text-[11px]"> (از {faNumber(voucher.orders_total)})</span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-voxcina-blue/60 dark:text-voxcina-cream/60">تخفیف مشتری</dt>
                    <dd className="font-medium text-voxcina-blue dark:text-voxcina-cream mt-0.5">
                      {formatPrice(voucher.customer_discount)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-voxcina-blue/60 dark:text-voxcina-cream/60">مشتریان یکتا</dt>
                    <dd className="font-medium text-voxcina-blue dark:text-voxcina-cream mt-0.5">
                      {faNumber(voucher.unique_customers)} نفر
                    </dd>
                  </div>

                  <div>
                    <dt className="text-voxcina-blue/60 dark:text-voxcina-cream/60">تاریخ انقضا</dt>
                    <dd className="font-medium text-voxcina-blue dark:text-voxcina-cream mt-0.5 space-y-0.5">
                      <div>{faDate(voucher.valid_to)}</div>
                      {countdown && (
                        <span className={`block text-[10px] ${countdown.className}`}>
                          {countdown.text}
                        </span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-voxcina-blue/60 dark:text-voxcina-cream/60">آخرین استفاده</dt>
                    <dd className="font-medium text-voxcina-blue dark:text-voxcina-cream mt-0.5">
                      {faDate(voucher.last_used_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <AdminTable
          head={
            <>
              <AdminTh>کد</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh className="text-green-700 dark:text-green-400 font-bold">درآمد شما</AdminTh>
              <AdminTh>تعداد استفاده</AdminTh>
              <AdminTh>{splitLabel}</AdminTh>
              <AdminTh>ارسال</AdminTh>
              <AdminTh>تاریخ انقضا</AdminTh>
              <AdminTh>سفارش‌های پرداخت‌شده</AdminTh>
              <AdminTh>تخفیف مشتری</AdminTh>
              <AdminTh>مبنای سهم</AdminTh>
              <AdminTh>مشتری یکتا</AdminTh>
              <AdminTh>آخرین استفاده</AdminTh>
              {onRemove && <AdminTh className="text-center">عملیات</AdminTh>}
            </>
          }
        >
          {displayedVouchers.map((voucher) => {
            const status = VOUCHER_STATUS[voucher.status] ?? {
              label: voucher.status,
              tone: "neutral" as const,
            };

            const used = voucher.used_count ?? voucher.orders_paid ?? 0;
            const max = voucher.max_uses;
            const hasLimit = typeof max === "number" && max > 0;
            const percent = hasLimit ? Math.min(100, Math.round((used / max) * 100)) : null;
            const isDepleted = hasLimit && used >= max;
            const countdown = getExpiryCountdown(voucher.valid_to, voucher.status);

            return (
              <tr key={voucher.code}>
                <AdminTd className="whitespace-nowrap">
                  <CopyCodeButton code={voucher.code} />
                </AdminTd>
                <AdminTd>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </AdminTd>
                <AdminTd className="whitespace-nowrap font-bold text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20">
                  {formatPrice(voucher.commission)}
                </AdminTd>
                <AdminTd className="whitespace-nowrap min-w-[7.5rem]">
                  {hasLimit ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                          {faNumber(used)} از {faNumber(max)}
                        </span>
                        <span className="text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
                          {faNumber(percent ?? 0)}٪
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDepleted
                              ? "bg-red-500"
                              : (percent ?? 0) >= 80
                              ? "bg-amber-500"
                              : "bg-voxcina-blue dark:bg-voxcina-cream"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      {faNumber(used)} (نامحدود)
                    </span>
                  )}
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  <span className="text-amber-700 dark:text-amber-400">
                    {faNumber(voucher.discount_percent)}٪ مشتری
                  </span>
                  <span className="opacity-40 mx-1">/</span>
                  <span className="text-green-700 dark:text-green-400 font-semibold">
                    {faNumber(voucher.seller_share_percent)}٪ شما
                  </span>
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  {voucher.shipping_discount && voucher.shipping_discount !== "full" ? (
                    <AdminBadge tone={voucher.shipping_discount === "free" ? "success" : "info"}>
                      {SHIPPING_DISCOUNT_LABELS[voucher.shipping_discount as ShippingDiscount] ||
                        SHIPPING_DISCOUNT_LABELS.full}
                    </AdminBadge>
                  ) : (
                    <span className="text-xs text-voxcina-blue/40 dark:text-voxcina-cream/40">—</span>
                  )}
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">{faDate(voucher.valid_to)}</span>
                    {countdown && (
                      <span className={`block text-[11px] ${countdown.className}`}>
                        {countdown.text}
                      </span>
                    )}
                  </div>
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  {faNumber(voucher.orders_paid)}
                  {voucher.orders_total !== voucher.orders_paid && (
                    <span className="opacity-50 text-xs"> / {faNumber(voucher.orders_total)}</span>
                  )}
                </AdminTd>
                <AdminTd className="whitespace-nowrap">{formatPrice(voucher.customer_discount)}</AdminTd>
                <AdminTd className="whitespace-nowrap">{formatPrice(voucher.commission_base)}</AdminTd>
                <AdminTd className="whitespace-nowrap">{faNumber(voucher.unique_customers)}</AdminTd>
                <AdminTd className="whitespace-nowrap">{faDate(voucher.last_used_at)}</AdminTd>
                {onRemove && (
                  <AdminTd className="text-center">
                    {voucher.status === "active" ? (
                      <button
                        type="button"
                        aria-label="حذف کد تخفیف"
                        title="حذف کد تخفیف"
                        disabled={isRemoving}
                        className="p-1.5 rounded-lg text-red-500/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400/70 dark:hover:text-red-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        onClick={() => setRemoveTarget(voucher)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-voxcina-blue/40 dark:text-voxcina-cream/40">—</span>
                    )}
                  </AdminTd>
                )}
              </tr>
            );
          })}
        </AdminTable>
      </div>
    </>
  )}

      <ConfirmRemoveModal
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
        productName={removeTarget?.code ?? ""}
        willInvalidate={false}
        title="حذف کد تخفیف"
        description={
          <>
            کد تخفیف{" "}
            <span className="font-mono font-semibold text-voxcina-blue dark:text-voxcina-cream">
              {removeTarget?.code}
            </span>{" "}
            بلافاصله غیرفعال می‌شود و دیگر قابل استفاده نیست. آیا مطمئن هستید؟
          </>
        }
      />
    </>
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
