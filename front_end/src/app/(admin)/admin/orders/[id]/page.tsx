"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Clock,
  Calendar,
  Copy,
  Check,
  Printer,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  TruckIcon,
  RefreshCw,
  Trash2,
  BookOpen,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice, toPersianNumber } from "@/lib/utils";
import { useOrderStore } from "@/store/order-store";
import { Order, OrderTimelineEntry, OrderNote } from "@/types/order";
import BackendImage from "@/components/BackendImage";
import { toast } from "react-toastify";
import { getPaymentGatewayText, getPaymentMethodText } from "@/lib/order-display";

// Status badge styles
const getStatusStyle = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
    case "shipped":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30";
    case "processing":
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
    case "pending":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/30";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border border-gray-200 dark:border-gray-800/30";
  }
};

// Payment status badge styles
const getPaymentStatusStyle = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    case "abandoned":
    case "expired":
    case "refunded":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400";
    case "cancelled":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

const getPaymentStatusText = (status: string) => {
  switch (status) {
    case "paid": return "پرداخت شده";
    case "pending": return "در انتظار پرداخت";
    case "failed": return "ناموفق";
    case "abandoned": return "پرداخت ناتمام";
    case "expired": return "منقضی شده";
    case "cancelled": return "لغو شده";
    case "refunded": return "بازگشت وجه";
    default: return status || "نامشخص";
  }
};

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [updateQuantities, setUpdateQuantities] = useState<Record<number, number>>({});
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [pendingSnappPayAction, setPendingSnappPayAction] = useState<"update" | "cancel" | null>(null);

  const { cancelSnappPay, updateSnappPay } = useOrderStore();
  
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch order details
  useEffect(() => {
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
        
         const data = await response.json();
         setOrder(data);
         setTrackingCode(data.tracking_code || "");
         setUpdateQuantities(Object.fromEntries((data.items || []).map((item: any, index: number) => [index, item.quantity])));
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("خطا در دریافت اطلاعات سفارش");
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  // Copy tracking code to clipboard
  const copyTrackingCode = () => {
    if (order?.tracking_code) {
      navigator.clipboard.writeText(order.tracking_code);
      setCopiedTracking(true);
      toast.success("کد رهگیری کپی شد");
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };

  // Print order
  const handlePrint = () => {
    window.print();
  };

  // Add note to order
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
        body: JSON.stringify({ content: newNote }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      const data = await response.json();
      setOrder(data.order);
      setNewNote("");
      toast.success("یادداشت با موفقیت اضافه شد");
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

    // Check if tracking code is required for shipped status
    if (selectedStatus === "shipped" && !trackingCode.trim()) {
      toast.error("کد رهگیری برای تغییر وضعیت به 'ارسال شده' الزامی است");
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
          tracking_code: trackingCode || undefined,
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

  const handleCancelSnappPay = async () => {
    if (!order) return;
    setIsUpdatingPayment(true);
    const updated = await cancelSnappPay(order.id);
    if (updated) setOrder(updated);
    setIsUpdatingPayment(false);
    setPendingSnappPayAction(null);
  };

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
      setUpdateQuantities(Object.fromEntries(updated.items.map((item, index) => [index, item.quantity])));
    }
    setIsUpdatingPayment(false);
    setPendingSnappPayAction(null);
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
        body: JSON.stringify({ trackingCode }),
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

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block relative w-12 h-12 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-cream/10 rounded-full animate-pulse"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-8">
        <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
              سفارش یافت نشد
            </h2>
            <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
              سفارش مورد نظر وجود ندارد یا حذف شده است.
            </p>
            <Button onClick={() => router.push("/admin/orders")}>
              بازگشت به لیست سفارش‌ها
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shippingAddress = order.shipping_address;

  return (
    <div className="py-8 print:py-0" ref={printRef}>
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-6 print:mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <button
            onClick={() => router.push("/admin/orders")}
            className="p-2 rounded-lg hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors print:hidden"
          >
            <ArrowRight className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
              سفارش {order.order_number}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
              <Calendar className="w-4 h-4" />
              <span>{order.jalali_created_at}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 print:hidden">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusStyle(order.status)}`}>
            {order.status_text}
          </span>
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl">
            <Printer className="w-4 h-4 ml-1" />
            چاپ
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <Package className="w-5 h-5" />
                اقلام سفارش ({toPersianNumber(order.items.length)} محصول)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-voxcina-cream/30 dark:divide-voxcina-blue/30">
                {order.items.map((item, index) => (
                  <div key={index} className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-voxcina-cream/30 dark:bg-voxcina-blue/30 flex-shrink-0">
                      <BackendImage
                        src={item.product?.image || item.product_image || "/images/placeholder.png"}
                        alt={item.product?.name || item.product_name || "محصول"}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-voxcina-blue dark:text-voxcina-cream truncate">
                        {item.product?.name || item.product_name || "نامشخص"}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        {item.variant?.size && (
                          <span>سایز: {item.variant.size}</span>
                        )}
                        {(item.variant?.color || item.variant?.colorName) && (
                          <span className="flex items-center gap-1">
                            رنگ:
                            {item.variant.color?.startsWith("#") && (
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: item.variant.color }}
                              />
                            )}
                            {item.variant.colorName || item.variant.color}
                          </span>
                        )}
                      </div>
                    </div>
                     <div className="text-left flex-shrink-0">
                       <div className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                          {order.gateway_name === "snappay" && order.payment_status === "paid" ? (
                            <>
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                value={updateQuantities[index] ?? item.quantity}
                                onChange={(event) => setUpdateQuantities((current) => ({ ...current, [index]: Number(event.target.value) }))}
                                className="w-16 rounded border border-voxcina-blue/20 bg-white px-1 py-0.5 text-center text-sm"
                                aria-label="تعداد جدید"
                              />
                              <button
                                type="button"
                                onClick={() => setUpdateQuantities((current) => ({ ...current, [index]: 0 }))}
                                className="mr-2 inline-flex items-center gap-1 rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                                title="حذف کامل ردیف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                حذف ردیف
                              </button>
                            </>
                          ) : toPersianNumber(item.quantity)} × {formatPrice(item.price_at_purchase)}
                       </div>
                      <div className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                        {formatPrice(item.quantity * item.price_at_purchase)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <User className="w-5 h-5" />
                اطلاعات مشتری
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">نام و نام خانوادگی</label>
                  <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                    {shippingAddress.first_name} {shippingAddress.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">شماره تماس</label>
                  <p className="font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                    {shippingAddress.phone_number}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <MapPin className="w-5 h-5" />
                آدرس ارسال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">استان</label>
                    <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                      {shippingAddress.province || shippingAddress.state || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">شهر</label>
                    <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                      {shippingAddress.city || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">کد پستی</label>
                    <p className="font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                      {shippingAddress.postal_code || "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">آدرس کامل</label>
                  <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                    {shippingAddress.address || shippingAddress.street || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Order Timeline */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden print:break-inside-avoid">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <Clock className="w-5 h-5" />
                تاریخچه سفارش
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {order.timeline && order.timeline.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute right-3 top-2 bottom-2 w-0.5 bg-voxcina-cream dark:bg-voxcina-blue/30" />
                  
                  <div className="space-y-4">
                    {order.timeline.map((entry, index) => (
                      <div key={index} className="relative flex gap-4 pr-8">
                        {/* Timeline dot */}
                        <div className={`absolute right-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          index === order.timeline!.length - 1
                            ? "bg-voxcina-blue dark:bg-voxcina-cream"
                            : "bg-voxcina-cream dark:bg-voxcina-blue/50"
                        }`}>
                          {entry.status === "delivered" && <CheckCircle className="w-4 h-4 text-white dark:text-voxcina-blue" />}
                          {entry.status === "shipped" && <TruckIcon className="w-4 h-4 text-white dark:text-voxcina-blue" />}
                          {entry.status === "processing" && <RefreshCw className="w-4 h-4 text-voxcina-blue dark:text-voxcina-cream" />}
                          {entry.status === "pending" && <Clock className="w-4 h-4 text-voxcina-blue dark:text-voxcina-cream" />}
                          {entry.status === "cancelled" && <XCircle className="w-4 h-4 text-white dark:text-voxcina-blue" />}
                        </div>
                        
                        <div className="flex-grow bg-voxcina-cream/20 dark:bg-voxcina-blue/20 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(entry.status)}`}>
                              {getStatusTextFromEntry(entry.status)}
                            </span>
                            <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {formatTimelineDate(entry.timestamp)}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 mt-1">
                              {entry.note}
                            </p>
                          )}
                          {entry.admin_name && (
                            <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-1">
                              توسط: {entry.admin_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-voxcina-blue/50 dark:text-voxcina-cream/50 py-4">
                  تاریخچه‌ای ثبت نشده است
                </p>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden print:hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <MessageSquare className="w-5 h-5" />
                یادداشت‌های داخلی
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Existing Notes */}
              {order.notes && order.notes.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {order.notes.map((note, index) => (
                    <div
                      key={note.id || index}
                      className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 rounded-lg p-3"
                    >
                      <p className="text-sm text-voxcina-blue dark:text-voxcina-cream">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                        <span>{note.admin_name}</span>
                        <span>{note.jalali_created_at || formatTimelineDate(note.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-voxcina-blue/50 dark:text-voxcina-cream/50 py-4 mb-4">
                  یادداشتی ثبت نشده است
                </p>
              )}

              {/* Add New Note */}
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="یادداشت جدید..."
                  className="flex-grow bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 rounded-lg p-2 text-sm text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 resize-none"
                  rows={2}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                  className="self-end rounded-lg"
                  size="sm"
                >
                  {isAddingNote ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Payment Info */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <CreditCard className="w-5 h-5" />
                اطلاعات پرداخت
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">وضعیت پرداخت</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusStyle(order.payment_status)}`}>
                  {getPaymentStatusText(order.payment_status)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">روش پرداخت</span>
                <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                  {getPaymentMethodText(order)}
                </span>
              </div>
              {order.zibal_track_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">شناسه زیبال</span>
                  <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                    {order.zibal_track_id}
                  </span>
                </div>
              )}
               {order.zibal_ref_number && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">شماره مرجع</span>
                  <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                    {order.zibal_ref_number}
                  </span>
                </div>
               )}
              {order.gateway_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">درگاه</span>
                   <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">{getPaymentGatewayText(order.gateway_name)}</span>
                </div>
              )}
               {(order.snappay_payment_token || order.gateway_transaction_id) && (
                 <div className="flex justify-between items-center gap-3">
                   <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">{order.snappay_payment_token ? "توکن پرداخت اسنپ‌پی" : "شناسه تراکنش"}</span>
                   <span className="text-xs font-mono text-voxcina-blue dark:text-voxcina-cream truncate" dir="ltr">{order.snappay_payment_token || order.gateway_transaction_id}</span>
                 </div>
               )}
              
              <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-3 mt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">جمع اقلام</span>
                  <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
                    {formatPrice(order.total_amount - (order.shipping_cost || 0) + (order.discount_amount || 0))}
                  </span>
                </div>
                {order.shipping_cost !== undefined && order.shipping_cost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">هزینه ارسال</span>
                    <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
                      {formatPrice(order.shipping_cost)}
                    </span>
                  </div>
                )}
                {order.discount_amount !== undefined && order.discount_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      تخفیف {order.discount_code && `(${order.discount_code})`}
                    </span>
                    <span className="text-sm text-green-600 dark:text-green-400">
                      -{formatPrice(order.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30">
                  <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">مبلغ کل</span>
                  <span className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
           </CardContent>
          </Card>

          {order.gateway_name === "snappay" && (
            <Card className="border border-sky-200 dark:border-sky-800/30 rounded-2xl overflow-hidden print:hidden">
              <CardHeader className="bg-sky-50 dark:bg-sky-900/10 border-b border-sky-200/50">
                <CardTitle className="flex items-center gap-2 text-sky-700 dark:text-sky-400 text-base">
                  <BookOpen className="w-5 h-5" />
                  راهنمای کوتاه اسنپ‌پی
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs leading-6 text-sky-900 dark:text-sky-200">
                <ol className="list-decimal pr-5 space-y-1">
                  <li>پس از پرداخت کاربر، اسنپ‌پی با وضعیت تراکنش و شناسه تراکنش به سایت بازمی‌گردد؛ پرداخت فقط بعد از Verify و سپس Settle نهایی است.</li>
                  <li>شناسه تراکنش نمایش‌داده‌شده در بخش پرداخت را برای پیگیری با پشتیبانی استفاده کنید.</li>
                  <li>بروزرسانی فقط بعد از Settle مجاز است؛ مبلغ جدید باید کمتر از مبلغ قبلی باشد و ردیف کاملاً حذف‌شده نباید در اقلام ارسال شود.</li>
                  <li>بروزرسانی و لغو کامل سفارش غیرقابل برگشت‌اند؛ قبل از ارسال، تایید نهایی ادمین الزامی است.</li>
                  <li>بین هر دو عملیات اسنپ‌پی حداقل ۳۰ ثانیه فاصله بگذارید.</li>
                </ol>
              </CardContent>
            </Card>
          )}

          {order.gateway_name === "snappay" && order.payment_status === "paid" && order.status !== "cancelled" && (
            <Card className="border border-amber-200 dark:border-amber-800/30 rounded-2xl overflow-hidden print:hidden">
              <CardHeader className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200/50">
                <CardTitle className="text-amber-700 dark:text-amber-400 text-base">عملیات اسنپ‌پی</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {pendingSnappPayAction ? (
                  <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/10">
                    <p className="text-sm leading-6 text-red-700 dark:text-red-300">
                      مرحله دوم تایید: این عملیات اسنپ‌پی غیرقابل برگشت است. {pendingSnappPayAction === "cancel" ? "کل سفارش لغو و وجه آن بازگردانده می‌شود." : "تعداد اقلام و مبلغ پرداختی تغییر می‌کند."}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 rounded-lg" onClick={() => setPendingSnappPayAction(null)} disabled={isUpdatingPayment}>
                        انصراف
                      </Button>
                      <Button size="sm" className="flex-1 rounded-lg bg-red-600 hover:bg-red-700" onClick={() => pendingSnappPayAction === "cancel" ? handleCancelSnappPay() : handleUpdateSnappPay()} disabled={isUpdatingPayment}>
                        {isUpdatingPayment && <RefreshCw className="w-4 h-4 animate-spin ml-1" />}
                        تایید نهایی
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs leading-5 text-amber-700 dark:text-amber-400">مرحله اول: عملیات را انتخاب کنید. پس از نمایش جزئیات، تایید نهایی جداگانه لازم است؛ تغییر یا لغو تراکنش اسنپ‌پی غیرقابل برگشت است.</p>
                    <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => setPendingSnappPayAction("update")} disabled={isUpdatingPayment}>
                      <RefreshCw className="w-4 h-4 ml-1" />
                      بروزرسانی اقلام و مبلغ
                    </Button>
                    <Button variant="outline" size="sm" className="w-full rounded-lg text-red-600 border-red-200 hover:bg-red-50" onClick={() => setPendingSnappPayAction("cancel")} disabled={isUpdatingPayment}>
                      <XCircle className="w-4 h-4 ml-1" />
                      لغو کامل سفارش و بازگشت وجه
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tracking Code */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden print:hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <Truck className="w-5 h-5" />
                کد رهگیری
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {order.tracking_code ? (
                <div className="flex items-center gap-2">
                  <div className="flex-grow bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-lg p-3 font-mono text-center text-voxcina-blue dark:text-voxcina-cream">
                    {order.tracking_code}
                  </div>
                  <button
                    onClick={copyTrackingCode}
                    className="p-2 rounded-lg hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                  >
                    {copiedTracking ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="کد رهگیری را وارد کنید..."
                    className="w-full bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 rounded-lg p-2 text-sm text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none"
                  />
                  <Button
                    onClick={handleTrackingUpdate}
                    disabled={isUpdatingStatus || !trackingCode.trim()}
                    className="w-full rounded-lg"
                    size="sm"
                  >
                    {isUpdatingStatus ? (
                      <RefreshCw className="w-4 h-4 animate-spin ml-1" />
                    ) : (
                      <Truck className="w-4 h-4 ml-1" />
                    )}
                    ثبت کد رهگیری
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update */}
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl overflow-hidden print:hidden">
            <CardHeader className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <CardTitle className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                <RefreshCw className="w-5 h-5" />
                تغییر وضعیت
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {!showStatusConfirm ? (
                <div className="grid grid-cols-2 gap-2">
                  {order.status === "pending" && order.payment_status === "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => {
                        setSelectedStatus("processing");
                        setShowStatusConfirm(true);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      تایید
                    </Button>
                  )}
                  {order.status === "processing" && order.payment_status === "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        setSelectedStatus("shipped");
                        setShowStatusConfirm(true);
                      }}
                    >
                      <TruckIcon className="w-4 h-4 ml-1" />
                      ارسال
                    </Button>
                  )}
                  {order.status === "shipped" && order.payment_status === "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        setSelectedStatus("delivered");
                        setShowStatusConfirm(true);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      تحویل
                    </Button>
                  )}
                   {order.status !== "cancelled" && order.status !== "delivered" && order.gateway_name !== "snappay" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setSelectedStatus("cancelled");
                        setShowStatusConfirm(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 ml-1" />
                       لغو کامل سفارش
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      آیا از تغییر وضعیت به «{getStatusTextFromEntry(selectedStatus)}» اطمینان دارید؟
                    </p>
                  </div>
                  
                  {selectedStatus === "shipped" && !order.tracking_code && (
                    <input
                      type="text"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="کد رهگیری (الزامی)"
                      className="w-full bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 rounded-lg p-2 text-sm text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none"
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={() => {
                        setShowStatusConfirm(false);
                        setSelectedStatus("");
                      }}
                    >
                      انصراف
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg"
                      onClick={handleStatusUpdate}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <RefreshCw className="w-4 h-4 animate-spin ml-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 ml-1" />
                      )}
                      تایید
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function to get status text from status value
function getStatusTextFromEntry(status: string): string {
  switch (status) {
    case "pending": return "در انتظار تایید";
    case "processing": return "در حال پردازش";
    case "shipped": return "ارسال شده";
    case "delivered": return "تحویل شده";
    case "cancelled": return "لغو شده";
    default: return status;
  }
}

// Helper function to format timeline date
function formatTimelineDate(timestamp: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}
