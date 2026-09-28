"use client";

import { useEffect } from "react";
import { Store } from "lucide-react";

import { AdminBadge, AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/ui";
import {
  getReferralSellers,
  SellerBreakdown,
  SellerOrdersTable,
  SellerReferralEarnings,
  SellerReferralInviteBox,
  SellerReferralTeamTable,
  SellerSummaryCards,
  SellerVouchersTable,
} from "@/components/seller/SellerStatsPanel";
import VoucherSplitPicker from "@/components/seller/VoucherSplitPicker";
import ShippingResponsibilityNote from "@/components/seller/ShippingResponsibilityNote";
import { useSellerStore } from "@/store/seller-store";

/**
 * The seller panel: mint a code, then read what every code has earned.
 *
 * Everything here is scoped server-side to the signed-in seller, so there is no
 * id in the URL and nothing to pick — a seller can only ever see their own
 * figures.
 */
export default function SellerPage() {
  const { panel, isLoading, isCreating, error, fetchPanel, createVoucher, removeVoucher } = useSellerStore();

  useEffect(() => {
    fetchPanel();
  }, [fetchPanel]);

  if (isLoading && !panel) {
    return <AdminLoading message="در حال دریافت آمار فروش..." />;
  }

  if (error && !panel) {
    return <AdminError message={error} onRetry={fetchPanel} />;
  }

  if (!panel) {
    return null;
  }

  const teamSellers = getReferralSellers(panel.referral_earnings);
  const hasReferralData =
    (panel.summary.referral_commission ?? 0) > 0 ||
    (panel.summary.referral_orders_paid ?? 0) > 0 ||
    (panel.summary.referral_seller_count ?? 0) > 0 ||
    (panel.referral_earnings?.referral_commission ?? 0) > 0 ||
    (panel.referral_earnings?.referral_orders_paid ?? 0) > 0 ||
    (panel.referral_earnings?.referral_seller_count ?? 0) > 0 ||
    teamSellers.length > 0;
  const showReferralEarnings = Boolean(panel.referral?.can_refer) || hasReferralData;
  const isReferralBudget = panel.budget.total_percent <= 20;

  return (
    <>
      <AdminPageHeader
        title="پنل فروشنده"
        subtitle={`${panel.seller.name} — کدهای تخفیف و سهم شما از فروش`}
        icon={<Store className="h-6 w-6" />}
      />

      <SellerSummaryCards summary={panel.summary} />

      {panel.referral?.can_refer && <SellerReferralInviteBox referral={panel.referral} />}

      <ShippingResponsibilityNote />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-1">
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <AdminBadge tone="info">
              سقف تقسیم {panel.budget.total_percent.toLocaleString("fa-IR")}٪
            </AdminBadge>
            {isReferralBudget && (
              <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                عضو تیم معرفی — سقف شما {panel.budget.total_percent.toLocaleString("fa-IR")}٪ است
              </span>
            )}
          </div>
          <VoucherSplitPicker
            totalPercent={panel.budget.total_percent}
            minPercent={panel.budget.min_percent}
            maxPercent={panel.budget.max_percent}
            isSubmitting={isCreating}
            disabled={!panel.can_create}
            disabledReason={`به سقف ${panel.active_limit.toLocaleString("fa-IR")} کد فعال رسیده‌اید. تا منقضی شدن یکی از کدها امکان ساخت کد جدید نیست.`}
            onCreate={(discountPercent, sellerSharePercent, maxUses, validDays, shippingDiscount) =>
              createVoucher(discountPercent, sellerSharePercent, maxUses, validDays, shippingDiscount)
            }
          />
        </div>
        <div className="lg:col-span-2">
          <SellerBreakdown summary={panel.summary} />
        </div>
      </div>

      {showReferralEarnings && (
        <SellerReferralEarnings summary={panel.summary} earnings={panel.referral_earnings} />
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
          کدهای تخفیف شما
        </h2>
        <SellerVouchersTable
          vouchers={panel.vouchers}
          onRemove={removeVoucher}
          budgetTotal={panel.budget.total_percent}
        />
      </section>

      <SellerReferralTeamTable earnings={panel.referral_earnings} />

      <section>
        <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
          سفارش‌های ثبت‌شده با کدهای شما
        </h2>
        <SellerOrdersTable orders={panel.recent_orders} />
      </section>
    </>
  );
}
