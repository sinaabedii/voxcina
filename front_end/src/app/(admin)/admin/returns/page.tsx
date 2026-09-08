"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CardContent } from "@/components/ui/Card";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Package,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  AdminPageHeader,
  AdminTableCard,
  AdminBadge,
  AdminBadgeTone,
  AdminLoading,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminTextarea,
} from "@/components/admin/ui";
import { useOrderStore } from "@/store/order-store";
import { formatPrice, toPersianNumber } from "@/lib/utils";
import { ReturnRequest, ReturnRequestStatus } from "@/types/order";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "همه" },
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تایید شده" },
  { value: "rejected", label: "رد شده" },
  { value: "cancelled", label: "لغو شده" },
];

const STATUS_BADGE: Record<ReturnRequestStatus, { label: string; tone: AdminBadgeTone }> = {
  pending: { label: "در انتظار بررسی", tone: "warning" },
  approved: { label: "تایید شده", tone: "success" },
  rejected: { label: "رد شده", tone: "danger" },
  cancelled: { label: "لغو شده", tone: "neutral" },
};

export default function AdminReturnRequestsPage() {
  const { returnRequests, returnRequestsPagination, returnRequestsLoading, fetchAdminReturnRequests, decideReturnRequest } =
    useOrderStore();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [decisionTarget, setDecisionTarget] = useState<{ request: ReturnRequest; action: "approve" | "reject" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    fetchAdminReturnRequests({ status: statusFilter || undefined, page });
  }, [statusFilter, page, fetchAdminReturnRequests]);

  const handleDecision = async () => {
    if (!decisionTarget) return;
    setDeciding(true);
    const result = await decideReturnRequest(decisionTarget.request.id, decisionTarget.action, decisionNote.trim() || undefined);
    setDeciding(false);
    if (result) {
      setDecisionTarget(null);
      setDecisionNote("");
      // Re-fetch so counts and filters reflect the new distribution.
      fetchAdminReturnRequests({ status: statusFilter || undefined, page });
    }
  };

  // When the pending filter is active the server's total count is authoritative
  // (it spans all pages); otherwise only the loaded page is known.
  const pendingCount =
    statusFilter === "pending"
      ? returnRequestsPagination?.totalCount ?? returnRequests.filter((r) => r.status === "pending").length
      : returnRequests.filter((r) => r.status === "pending").length;

  return (
    <div>
      <AdminPageHeader
        title="درخواست‌های مرجوعی"
        subtitle="بررسی و تصمیم‌گیری درباره مرجوعی سفارش‌های تحویل‌شده (مهلت ۷ روزه)"
        icon={<RotateCcw className="w-6 h-6" />}
        actions={
          <Link href="/admin/orders">
            <Button variant="outline" size="sm" className="rounded-xl">
              <ArrowRight className="w-4 h-4 ml-1" />
              مدیریت سفارش‌ها
            </Button>
          </Link>
        }
      />
      {statusFilter === "pending" && pendingCount > 0 && (
        <div className="mb-4">
          <AdminBadge tone="warning">
            {toPersianNumber(pendingCount)} درخواست در انتظار بررسی
          </AdminBadge>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                : "bg-voxcina-cream/50 text-voxcina-blue/70 hover:bg-voxcina-cream dark:bg-voxcina-blue/20 dark:text-voxcina-cream/70 dark:hover:bg-voxcina-blue/30"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* List */}
      <AdminTableCard>
        <CardContent className="p-0">
          {returnRequestsLoading && returnRequests.length === 0 ? (
            <div className="p-4">
              <AdminLoading message="در حال بارگذاری درخواست‌ها..." />
            </div>
          ) : returnRequests.length === 0 ? (
            <div className="p-4">
              <AdminEmpty
                icon={CheckCircle}
                title="درخواست مرجوعی با این فیلتر یافت نشد"
              />
            </div>
          ) : (
            <div className="divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/10">
              {returnRequests.map((request) => (
                <div key={request.id} className="p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AdminBadge tone={STATUS_BADGE[request.status].tone}>
                        {STATUS_BADGE[request.status].label}
                      </AdminBadge>
                      <Link
                        href={`/admin/orders/${request.order_id}`}
                        className="text-sm font-semibold text-voxcina-blue dark:text-voxcina-cream hover:underline"
                      >
                        سفارش #{request.order_number}
                      </Link>
                      <span className="text-[11px] text-voxcina-blue/40 dark:text-voxcina-cream/40">
                        {new Date(request.created_at).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                    {request.status === "pending" && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setDecisionTarget({ request, action: "approve" });
                            setDecisionNote("");
                          }}
                          className="rounded-xl"
                        >
                          <CheckCircle className="w-3.5 h-3.5 ml-1" />
                          تایید
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDecisionTarget({ request, action: "reject" });
                            setDecisionNote("");
                          }}
                          className="rounded-xl !text-red-600 !border-red-200 hover:!bg-red-50 dark:!text-red-400 dark:!border-red-800/40 dark:hover:!bg-red-900/20"
                        >
                          <XCircle className="w-3.5 h-3.5 ml-1" />
                          رد
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      {request.items.map((item, idx) => (
                        <p key={idx} className="flex items-center gap-1.5 text-voxcina-blue/80 dark:text-voxcina-cream/80">
                          <Package className="w-3.5 h-3.5 text-voxcina-blue/40 dark:text-voxcina-cream/40 flex-shrink-0" />
                          {toPersianNumber(item.quantity)} × {item.product_name}
                          {(item.variant.size !== "N/A" || item.variant.colorName) && (
                            <span className="text-voxcina-blue/40 dark:text-voxcina-cream/40">
                              ({[item.variant.size !== "N/A" && item.variant.size, item.variant.colorName].filter(Boolean).join(" · ")})
                            </span>
                          )}
                          <span className="text-voxcina-blue/40 dark:text-voxcina-cream/40">— {formatPrice(item.price_at_purchase * item.quantity)}</span>
                        </p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {request.reason && (
                        <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
                          <span className="font-medium">دلیل مشتری:</span> {request.reason}
                        </p>
                      )}
                      {request.admin_name && (
                        <p className="text-[11px] text-voxcina-blue/40 dark:text-voxcina-cream/40">
                          بررسی توسط {request.admin_name}
                          {request.decided_at && ` — ${new Date(request.decided_at).toLocaleDateString("fa-IR")}`}
                        </p>
                      )}
                      {request.admin_note && (
                        <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                          یادداشت: {request.admin_note}
                        </p>
                      )}
                      <p className="text-[11px] text-voxcina-blue/40 dark:text-voxcina-cream/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        تحویل: {new Date(request.delivered_at).toLocaleDateString("fa-IR")}
                        {" — پایان مهلت: "}
                        {new Date(request.window_ends_at).toLocaleDateString("fa-IR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </AdminTableCard>

      {/* Pagination */}
      {returnRequestsPagination && (
        <AdminPagination
          page={page}
          totalPages={returnRequestsPagination.totalPages}
          onChange={setPage}
        />
      )}

      {/* Decision confirmation modal */}
      <AdminModal
        isOpen={!!decisionTarget}
        onClose={() => setDecisionTarget(null)}
        title={decisionTarget?.action === "approve" ? "تایید درخواست مرجوعی" : "رد درخواست مرجوعی"}
        size="sm"
      >
        {decisionTarget && (
          <>
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-3 leading-relaxed">
              {decisionTarget.action === "approve"
                ? "با تایید، بازگشت وجه باید از طریق درگاه پرداخت یا کیف پول انجام شود. این اقدام به‌صورت خودکار انجام نمی‌شود."
                : "با رد درخواست، مشتری می‌تواند تا پایان مهلت ۷ روزه درخواست جدیدی ثبت کند."}
            </p>
            <div className="rounded-xl bg-voxcina-cream/40 dark:bg-voxcina-blue/20 p-2.5 text-xs mb-3 space-y-1">
              <p className="font-semibold text-voxcina-blue dark:text-voxcina-cream">سفارش #{decisionTarget.request.order_number}</p>
              {decisionTarget.request.items.map((item, idx) => (
                <p key={idx} className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  {toPersianNumber(item.quantity)} × {item.product_name}
                </p>
              ))}
            </div>
            <AdminTextarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value.slice(0, 500))}
              placeholder="یادداشت برای مشتری (اختیاری)"
              rows={3}
            />
            <AdminModalActions onCancel={() => setDecisionTarget(null)}>
              <Button
                variant={decisionTarget.action === "reject" ? "danger" : "primary"}
                size="sm"
                onClick={handleDecision}
                disabled={deciding}
                isLoading={deciding}
                className="rounded-xl"
              >
                {decisionTarget.action === "approve" ? "تایید نهایی" : "رد نهایی"}
              </Button>
            </AdminModalActions>
          </>
        )}
      </AdminModal>
    </div>
  );
}
