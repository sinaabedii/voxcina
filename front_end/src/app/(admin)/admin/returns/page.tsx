"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Package,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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

const STATUS_BADGE: Record<ReturnRequestStatus, { label: string; className: string }> = {
  pending: {
    label: "در انتظار بررسی",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  },
  approved: {
    label: "تایید شده",
    className: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  rejected: {
    label: "رد شده",
    className: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  },
  cancelled: {
    label: "لغو شده",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
  },
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

  const pendingCount = returnRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6" />
            درخواست‌های مرجوعی
            {statusFilter === "pending" && pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {toPersianNumber(pendingCount)}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            بررسی و تصمیم‌گیری درباره مرجوعی سفارش‌های تحویل‌شده (مهلت ۷ روزه)
          </p>
        </div>
        <Link href="/admin/orders">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            مدیریت سفارش‌ها
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
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
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {returnRequestsLoading && returnRequests.length === 0 ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : returnRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">درخواست مرجوعی با این فیلتر یافت نشد</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {returnRequests.map((request) => (
                <div key={request.id} className="p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[request.status].className}`}
                      >
                        {STATUS_BADGE[request.status].label}
                      </span>
                      <Link
                        href={`/admin/orders/${request.order_id}`}
                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        سفارش #{request.order_number}
                      </Link>
                      <span className="text-[11px] text-gray-400">
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
                          className="flex items-center gap-1 !px-3"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          تایید
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDecisionTarget({ request, action: "reject" });
                            setDecisionNote("");
                          }}
                          className="flex items-center gap-1 !px-3 !text-red-600 !border-red-200 hover:!bg-red-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          رد
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      {request.items.map((item, idx) => (
                        <p key={idx} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          {toPersianNumber(item.quantity)} × {item.product_name}
                          {(item.variant.size !== "N/A" || item.variant.colorName) && (
                            <span className="text-gray-400">
                              ({[item.variant.size !== "N/A" && item.variant.size, item.variant.colorName].filter(Boolean).join(" · ")})
                            </span>
                          )}
                          <span className="text-gray-400">— {formatPrice(item.price_at_purchase * item.quantity)}</span>
                        </p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {request.reason && (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          <span className="font-medium">دلیل مشتری:</span> {request.reason}
                        </p>
                      )}
                      {request.admin_name && (
                        <p className="text-[11px] text-gray-400">
                          بررسی توسط {request.admin_name}
                          {request.decided_at && ` — ${new Date(request.decided_at).toLocaleDateString("fa-IR")}`}
                        </p>
                      )}
                      {request.admin_note && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-500">
                          یادداشت: {request.admin_note}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
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
      </Card>

      {/* Pagination */}
      {returnRequestsPagination && returnRequestsPagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            قبلی
          </Button>
          <span className="text-xs text-gray-500">
            صفحه {toPersianNumber(returnRequestsPagination.currentPage)} از {toPersianNumber(returnRequestsPagination.totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= returnRequestsPagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            بعدی
          </Button>
        </div>
      )}

      {/* Decision confirmation modal */}
      <Modal
        isOpen={!!decisionTarget}
        onClose={() => setDecisionTarget(null)}
        title={decisionTarget?.action === "approve" ? "تایید درخواست مرجوعی" : "رد درخواست مرجوعی"}
        contentClassName="max-w-sm"
      >
        {decisionTarget && (
          <>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {decisionTarget.action === "approve"
                ? "با تایید، بازگشت وجه باید از طریق درگاه پرداخت یا کیف پول انجام شود. این اقدام به‌صورت خودکار انجام نمی‌شود."
                : "با رد درخواست، مشتری می‌تواند تا پایان مهلت ۷ روزه درخواست جدیدی ثبت کند."}
            </p>
            <div className="rounded-lg bg-secondary/30 p-2.5 text-xs mb-3 space-y-1">
              <p className="font-semibold">سفارش #{decisionTarget.request.order_number}</p>
              {decisionTarget.request.items.map((item, idx) => (
                <p key={idx} className="text-muted-foreground">
                  {toPersianNumber(item.quantity)} × {item.product_name}
                </p>
              ))}
            </div>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value.slice(0, 500))}
              placeholder="یادداشت برای مشتری (اختیاری)"
              rows={3}
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" fullWidth onClick={() => setDecisionTarget(null)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleDecision}
                disabled={deciding}
                className={
                  decisionTarget.action === "reject"
                    ? "!bg-red-600 hover:!bg-red-700"
                    : ""
                }
              >
                {deciding ? "در حال ثبت..." : decisionTarget.action === "approve" ? "تایید نهایی" : "رد نهایی"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
