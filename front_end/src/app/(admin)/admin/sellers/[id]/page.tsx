"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Store } from "lucide-react";

import { AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/ui";
import {
  SellerBreakdown,
  SellerOrdersTable,
  SellerSummaryCards,
  SellerVouchersTable,
} from "@/components/seller/SellerStatsPanel";
import { useAdminSellerStore } from "@/store/admin-seller-store";

/**
 * One seller's full record: their codes, what each earned, and the orders
 * behind the totals.
 *
 * Rendered with the same components as the seller's own panel, from the same
 * API payload — so an admin and a partner can never be looking at two
 * different versions of the same number. The only thing missing here is the
 * code creator: a split is the seller's decision to make.
 */
export default function AdminSellerDetailPage() {
  const params = useParams();
  const sellerId = typeof params?.id === "string" ? params.id : "";
  const { detail, isLoadingDetail, error, fetchSeller, clearDetail } = useAdminSellerStore();

  useEffect(() => {
    if (sellerId) fetchSeller(sellerId);
    return () => clearDetail();
  }, [sellerId, fetchSeller, clearDetail]);

  if (isLoadingDetail && !detail) {
    return <AdminLoading message="در حال دریافت اطلاعات فروشنده..." />;
  }

  if (error && !detail) {
    return <AdminError message={error} onRetry={() => fetchSeller(sellerId)} />;
  }

  if (!detail) {
    return null;
  }

  const contact = [detail.seller.phone, detail.seller.email].filter(Boolean).join(" — ");

  return (
    <>
      <Link
        href="/admin/sellers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-voxcina-blue/70 transition-colors hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream"
      >
        <ChevronRight className="h-4 w-4" />
        بازگشت به فهرست فروشندگان
      </Link>

      <AdminPageHeader
        title={detail.seller.name}
        subtitle={contact || "همکار فروش"}
        icon={<Store className="h-6 w-6" />}
      />

      <SellerSummaryCards summary={detail.summary} />
      <SellerBreakdown summary={detail.summary} />

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
          کدهای تخفیف این فروشنده
        </h2>
        <SellerVouchersTable vouchers={detail.vouchers} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
          سفارش‌های ثبت‌شده با کدهای این فروشنده
        </h2>
        <SellerOrdersTable orders={detail.recent_orders} />
      </section>
    </>
  );
}
