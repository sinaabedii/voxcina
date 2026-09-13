"use client";

import { useEffect } from "react";
import { Store } from "lucide-react";

import { AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/ui";
import {
  SellerBreakdown,
  SellerOrdersTable,
  SellerSummaryCards,
  SellerVouchersTable,
} from "@/components/seller/SellerStatsPanel";
import VoucherSplitPicker from "@/components/seller/VoucherSplitPicker";
import { useSellerStore } from "@/store/seller-store";

/**
 * The seller panel: mint a code, then read what every code has earned.
 *
 * Everything here is scoped server-side to the signed-in seller, so there is no
 * id in the URL and nothing to pick — a seller can only ever see their own
 * figures.
 */
export default function SellerPage() {
  const { panel, isLoading, isCreating, error, fetchPanel, createVoucher } = useSellerStore();

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

  return (
    <>
      <AdminPageHeader
        title="پنل فروشنده"
        subtitle={`${panel.seller.name} — کدهای تخفیف و سهم شما از فروش`}
        icon={<Store className="h-6 w-6" />}
      />

      <SellerSummaryCards summary={panel.summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-1">
          <VoucherSplitPicker
            totalPercent={panel.budget.total_percent}
            minPercent={panel.budget.min_percent}
            maxPercent={panel.budget.max_percent}
            isSubmitting={isCreating}
            disabled={!panel.can_create}
            disabledReason={`به سقف ${panel.active_limit.toLocaleString("fa-IR")} کد فعال رسیده‌اید. تا منقضی شدن یکی از کدها امکان ساخت کد جدید نیست.`}
            onCreate={createVoucher}
          />
        </div>
        <div className="lg:col-span-2">
          <SellerBreakdown summary={panel.summary} />
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
          کدهای تخفیف شما
        </h2>
        <SellerVouchersTable vouchers={panel.vouchers} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
          سفارش‌های ثبت‌شده با کدهای شما
        </h2>
        <SellerOrdersTable orders={panel.recent_orders} />
      </section>
    </>
  );
}
