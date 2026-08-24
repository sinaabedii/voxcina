"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
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
import { Order, ReturnRequestStatus } from "@/types/order";

// Server reason codes -> Persian copy shown when a request can't be made.
const INELIGIBILITY_COPY: Record<string, string> = {
  not_delivered: "فقط سفارش‌های تحویل‌شده امکان ثبت درخواست مرجوعی دارند",
  not_paid: "سفارش‌های پرداخت‌نشده امکان مرجوعی ندارند",
  window_expired: "مهلت ۷ روزه مرجوعی این سفارش به پایان رسیده است",
  already_approved: "درخواست مرجوعی این سفارش تایید شده است",
  already_pending: "شما یک درخواست مرجوعی در انتظار بررسی برای این سفارش دارید",
};

const STATUS_BADGE: Record<ReturnRequestStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: "در انتظار بررسی",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "تایید شده",
    className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "رد شده",
    className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "لغو شده توسط شما",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

interface ReturnRequestSectionProps {
  order: Order;
}

export default function ReturnRequestSection({ order }: ReturnRequestSectionProps) {
  const {
    currentReturnStatus,
    returnRequestLoading,
    fetchReturnRequestStatus,
    clearReturnStatus,
    createReturnRequest,
    cancelReturnRequest,
  } = useOrderStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Item selection key disambiguates same-product-different-variant lines.
  const itemKey = (productId: string, variantId?: string) => `${productId}|${variantId || ""}`;

  useEffect(() => {
    // Drop the previous order's data immediately so a slow response for the
    // old order can never render against the new one.
    clearReturnStatus();
    fetchReturnRequestStatus(order.id);
  }, [order.id, fetchReturnRequestStatus, clearReturnStatus]);

  const eligibility = currentReturnStatus?.eligibility;
  const request = currentReturnStatus?.request;

  const remainingDays = useMemo(() => {
    if (!eligibility?.window_ends_at) return null;
    const ms = new Date(eligibility.window_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [eligibility?.window_ends_at]);

  if (returnRequestLoading && !currentReturnStatus) {
    return null;
  }

  const openModal = () => {
    const defaults: Record<string, number> = {};
    for (const item of order.items) {
      defaults[itemKey(item.product.id, item.variant?.variantId)] = 1;
    }
    setSelectedQuantities(defaults);
    setReason("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const items = order.items
      .map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.variantId || undefined,
        quantity: selectedQuantities[itemKey(item.product.id, item.variant?.variantId)] || 0,
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) return;

    setSubmitting(true);
    const created = await createReturnRequest(order.id, { items, reason: reason.trim() });
    setSubmitting(false);
    if (created) setModalOpen(false);
  };

  const handleCancelRequest = async () => {
    await cancelReturnRequest(order.id);
    setConfirmCancel(false);
  };

  const totalSelected = Object.values(selectedQuantities).reduce((acc, q) => acc + q, 0);

  // Nothing to show for orders that never reach the delivered state.
  if (order.status !== "delivered" && !request) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xs md:text-sm font-semibold mb-1.5 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-1.5">
        <RotateCcw className="w-3.5 h-3.5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
        درخواست مرجوعی
      </h3>

      {/* Existing request card */}
      {request ? (
        <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-lg px-3 py-2 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 ${STATUS_BADGE[request.status].className}`}
            >
              {STATUS_BADGE[request.status].icon}
              {STATUS_BADGE[request.status].label}
            </span>
            {request.status === "pending" && !confirmCancel && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="text-[11px] text-red-500 hover:text-red-600 underline underline-offset-2"
              >
                لغو درخواست
              </button>
            )}
            {request.status === "pending" && confirmCancel && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50">لغو شود؟</span>
                <Button variant="outline" size="sm" onClick={handleCancelRequest} className="!px-2 !py-0.5 !text-[10px]">
                  بله
                </Button>
                <Button variant="primary" size="sm" onClick={() => setConfirmCancel(false)} className="!px-2 !py-0.5 !text-[10px]">
                  خیر
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1 text-voxcina-blue/70 dark:text-voxcina-cream/70">
            {request.items.map((item, idx) => (
              <p key={idx}>
                {item.quantity} × {item.product_name}
                {(item.variant.size !== "N/A" || item.variant.colorName || item.variant.color !== "N/A") && (
                  <span> ({[item.variant.size !== "N/A" && item.variant.size, item.variant.colorName || (item.variant.color !== "N/A" && item.variant.color)].filter(Boolean).join(" · ")})</span>
                )}
              </p>
            ))}
          </div>
          {request.reason && (
            <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
              دلیل: {request.reason}
            </p>
          )}
          {request.admin_note && request.status !== "pending" && (
            <p className="text-[11px] rounded-md bg-background px-2 py-1 border border-voxcina-cream/50 dark:border-voxcina-blue/20">
              پاسخ پشتیبانی: {request.admin_note}
            </p>
          )}
          <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40">
            ثبت شده در {new Date(request.created_at).toLocaleDateString("fa-IR")}
          </p>
        </div>
      ) : eligibility?.can_request ? (
        <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
            تا {remainingDays !== null ? toPersianNumber(remainingDays) : "۷"} روز دیگر می‌توانید این سفارش را مرجوع کنید.
          </p>
          <Button variant="outline" size="sm" onClick={openModal} className="flex-shrink-0 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            ثبت درخواست مرجوعی
          </Button>
        </div>
      ) : eligibility?.reason === "window_expired" ? (
        <div className="bg-gray-100 dark:bg-zinc-800/60 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {INELIGIBILITY_COPY.window_expired}
        </div>
      ) : null}

      {/* Creation modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ثبت درخواست مرجوعی"
        contentClassName="max-w-md"
      >
        {eligibility?.window_ends_at && (
          <p className="text-[11px] text-muted-foreground mb-3">
            مهلت مرجوعی تا {new Date(eligibility.window_ends_at).toLocaleDateString("fa-IR")} است.
          </p>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto pl-1 scrollbar-thin">
          {order.items.map((item) => {
            const key = itemKey(item.product.id, item.variant?.variantId);
            const qty = selectedQuantities[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                <div className="w-12 h-12 bg-secondary/30 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.product.image ? (
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-semibold truncate">{item.product.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {[item.variant?.size !== "N/A" && item.variant?.size, item.variant?.colorName || (item.variant?.color !== "N/A" && item.variant?.color)].filter(Boolean).join(" · ")}
                    {" — "}
                    خریداری‌شده: {toPersianNumber(item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    aria-label="کاهش تعداد"
                    disabled={qty === 0}
                    onClick={() => setSelectedQuantities((prev) => ({ ...prev, [key]: Math.max(0, qty - 1) }))}
                    className="w-6 h-6 rounded-md border border-border text-sm disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-xs font-medium">{toPersianNumber(qty)}</span>
                  <button
                    type="button"
                    aria-label="افزایش تعداد"
                    disabled={qty >= item.quantity}
                    onClick={() => setSelectedQuantities((prev) => ({ ...prev, [key]: Math.min(item.quantity, qty + 1) }))}
                    className="w-6 h-6 rounded-md border border-border text-sm disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 1000))}
          placeholder="دلیل مرجوعی (اختیاری)"
          rows={3}
          className="mt-3 w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />

        {totalSelected > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            جمع مبلغ مرجوعی تقریبی:{" "}
            {formatPrice(
              order.items.reduce(
                (acc, item) =>
                  acc +
                  (selectedQuantities[itemKey(item.product.id, item.variant?.variantId)] || 0) *
                    item.price_at_purchase,
                0,
              ),
            )}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" fullWidth onClick={() => setModalOpen(false)}>
            انصراف
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit} disabled={totalSelected === 0 || submitting}>
            {submitting ? "در حال ثبت..." : "ثبت درخواست"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
