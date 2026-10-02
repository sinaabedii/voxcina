"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { useOrderStore } from "@/store/order-store";
import { Order } from "@/types/order";
import { toast } from "react-toastify";
import {
  OrderHeroHeader,
  OrderReturnBanner,
  OrderItemsTable,
  OrderCustomerInfoCard,
  OrderPaymentInfoCard,
  OrderSnappPaySection,
  OrderTimelineAndNotes,
} from "@/components/admin/orders/detail";

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [updateQuantities, setUpdateQuantities] = useState<Record<number, number>>({});
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const { cancelSnappPay, updateSnappPay, returnRequests, fetchAdminReturnRequests } = useOrderStore();

  const orderReturnRequest = useMemo(
    () => returnRequests.find((request) => request.order_id === orderId) || null,
    [returnRequests, orderId]
  );

  const printRef = useRef<HTMLDivElement>(null);

  // Fetch this order's return request(s), if any.
  useEffect(() => {
    if (orderId) {
      fetchAdminReturnRequests({ order_id: orderId });
    }
  }, [orderId, fetchAdminReturnRequests]);

  // Fetch order details
  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order");
      }

      const data: Order = await response.json();
      setOrder(data);
      setTrackingCode(data.tracking_code || "");
      setUpdateQuantities(
        Object.fromEntries((data.items || []).map((item, index) => [index, item.quantity]))
      );
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("خطا در دریافت اطلاعات سفارش");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Print order invoice
  const handlePrint = () => {
    window.print();
  };

  // Add internal note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("متن یادداشت نمی‌تواند خالی باشد");
      return;
    }

    setIsAddingNote(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      const data = await response.json();
      setOrder(data.order);
      setNewNote("");
      toast.success("یادداشت داخلی با موفقیت ثبت شد");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("خطا در افزودن یادداشت");
    } finally {
      setIsAddingNote(false);
    }
  };

  // Update order status
  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;

    if (selectedStatus === "shipped" && !trackingCode.trim()) {
      toast.error("کد رهگیری برای تغییر وضعیت به «ارسال شده» الزامی است");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: selectedStatus,
          tracking_code: trackingCode.trim() || undefined,
          ...(selectedStatus === "cancelled" ? { confirm: true, cancelEntireOrder: true } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      setShowStatusConfirm(false);
      setSelectedStatus("");
      toast.success("وضعیت سفارش با موفقیت به‌روزرسانی شد");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error instanceof Error ? error.message : "خطا در به‌روزرسانی وضعیت");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Cancel SnappPay order
  const handleCancelSnappPay = async () => {
    if (!order) return;
    setIsUpdatingPayment(true);
    const updated = await cancelSnappPay(order.id);
    if (updated) {
      setOrder(updated);
      toast.success("سفارش اسنپ‌پی با موفقیت لغو و اعتبار کاربر مسترد شد");
    }
    setIsUpdatingPayment(false);
  };

  // SnappPay in-place items calculation & validation
  const snappPayUpdate = useMemo(() => {
    let remainingItems = 0;
    let reducedRows = 0;
    let newItemsTotal = 0;
    let originalItemsTotal = 0;

    (order?.items ?? []).forEach((item, index) => {
      const qty = Math.max(0, Math.floor(updateQuantities[index] ?? item.quantity));
      if (qty > 0) remainingItems += 1;
      if (qty < item.quantity) reducedRows += 1;
      newItemsTotal += qty * item.price_at_purchase;
      originalItemsTotal += item.quantity * item.price_at_purchase;
    });

    const difference = originalItemsTotal - newItemsTotal;

    return {
      allowed: remainingItems > 0 && reducedRows > 0,
      remainingItems,
      reducedRows,
      newItemsTotal,
      originalItemsTotal,
      difference,
    };
  }, [order, updateQuantities]);

  // Update SnappPay items
  const handleUpdateSnappPay = async () => {
    if (!order || order.gateway_name !== "snappay") return;
    const items = order.items
      .map((item, index) => ({
        product_id: item.product?.id || item.product_id || "",
        size: item.variant?.size || "",
        color: item.variant?.color || "",
        color_name: item.variant?.colorName || "",
        quantity: Math.max(0, Math.floor(updateQuantities[index] ?? item.quantity)),
      }))
      .filter((item) => item.quantity > 0 && item.product_id);

    setIsUpdatingPayment(true);
    const updated = await updateSnappPay(order.id, items);
    if (updated) {
      setOrder(updated);
      setUpdateQuantities(
        Object.fromEntries(updated.items.map((item, index) => [index, item.quantity]))
      );
      toast.success("اقلام و مبالغ سفارش در اسنپ‌پی با موفقیت بروزرسانی شد");
    }
    setIsUpdatingPayment(false);
  };

  // Update tracking code
  const handleTrackingUpdate = async () => {
    if (!trackingCode.trim()) {
      toast.error("کد رهگیری نمی‌تواند خالی باشد");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trackingCode: trackingCode.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tracking code");
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      toast.success("کد رهگیری با موفقیت ثبت شد");
    } catch (error) {
      console.error("Error updating tracking:", error);
      toast.error("خطا در ثبت کد رهگیری");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Quantity change handler for SnappPay items
  const handleQuantityChange = (index: number, newQty: number) => {
    if (!order) return;
    const max = order.items[index]?.quantity ?? 1;
    const clamped = Math.max(0, Math.min(max, newQty));
    setUpdateQuantities((curr) => ({ ...curr, [index]: clamped }));
  };

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center min-h-[450px]">
        <div className="text-center space-y-4">
          <div className="inline-block relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-voxcina-cream/40 dark:border-voxcina-cream/10 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70">
            در حال بارگذاری اطلاعات سفارش...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto p-8 rounded-3xl border border-voxcina-cream dark:border-white/10 bg-white dark:bg-voxcina-blue/20 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
            سفارش یافت نشد
          </h2>
          <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed">
            سفارش مورد نظر وجود ندارد یا ممکن است حذف شده باشد.
          </p>
          <Button
            onClick={() => router.push("/admin/orders")}
            className="rounded-xl w-full"
            variant="primary"
          >
            بازگشت به لیست سفارش‌ها
          </Button>
        </div>
      </div>
    );
  }

  const isSnappPayPaid =
    order.gateway_name === "snappay" &&
    order.payment_status === "paid" &&
    order.status !== "cancelled";

  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0" ref={printRef}>
      {/* Printable Invoice Header (Visible only on print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-wider">وکسینا | VOXCINA</h1>
            <p className="text-xs text-slate-600 mt-1">فروشگاه آنلاین مد و پوشاک بوتیک</p>
          </div>
          <div className="text-left font-mono">
            <div className="text-lg font-bold text-slate-900">فاکتور سفارش: {order.order_number}</div>
            <div className="text-xs text-slate-600">تاریخ: {order.jalali_created_at}</div>
          </div>
        </div>
      </div>

      {/* Header and Hero Summary Card */}
      <OrderHeroHeader order={order} onRefresh={fetchOrder} onPrint={handlePrint} />

      {/* Main Grid: 2-Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 Spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Return Request Alert */}
          <OrderReturnBanner orderReturnRequest={orderReturnRequest} />

          {/* Order Items Table */}
          <OrderItemsTable
            items={order.items}
            isSnappPayPaid={isSnappPayPaid}
            updateQuantities={updateQuantities}
            onQuantityChange={handleQuantityChange}
          />

          {/* Customer & Shipping Information */}
          <OrderCustomerInfoCard order={order} />
        </div>

        {/* Sidebar Column (1 Span) */}
        <div className="space-y-6">
          {/* Financial Breakdown & Gateway Info */}
          <OrderPaymentInfoCard order={order} />

          {/* SnappPay Management Panel (if SnappPay) */}
          <OrderSnappPaySection
            order={order}
            snappPayUpdate={snappPayUpdate}
            isUpdatingPayment={isUpdatingPayment}
            onUpdateSnappPay={handleUpdateSnappPay}
            onCancelSnappPay={handleCancelSnappPay}
          />

          {/* Status Transitions, Tracking Code, Timeline, and Notes */}
          <OrderTimelineAndNotes
            order={order}
            trackingCode={trackingCode}
            setTrackingCode={setTrackingCode}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            showStatusConfirm={showStatusConfirm}
            setShowStatusConfirm={setShowStatusConfirm}
            isUpdatingStatus={isUpdatingStatus}
            onStatusUpdate={handleStatusUpdate}
            onTrackingUpdate={handleTrackingUpdate}
            newNote={newNote}
            setNewNote={setNewNote}
            isAddingNote={isAddingNote}
            onAddNote={handleAddNote}
          />
        </div>
      </div>
    </div>
  );
}
