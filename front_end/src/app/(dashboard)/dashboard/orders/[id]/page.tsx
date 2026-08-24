"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Package,
  Clock,
  Calendar,
  CreditCard,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Truck,
  Tag,
  Box,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useRouter, useParams } from "next/navigation";
import { useOrderStore } from "@/store/order-store";
import { Order } from "@/types/order";
import { formatPrice, formatDate } from "@/lib/utils";

const getStatusStyle = (status: Order["status"] | Order["payment_status"] | string) => {
  switch (status) {
    case "delivered":
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "shipped":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "processing":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
    case "cancelled":
    case "refunded":
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

const getStatusIcon = (status: Order["status"] | Order["payment_status"] | string) => {
  switch (status) {
    case "delivered":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "paid":
      return <CreditCard className="w-3.5 h-3.5" />;
    case "shipped":
      return <Truck className="w-3.5 h-3.5" />;
    case "processing":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "pending":
      return <Clock className="w-3.5 h-3.5" />;
    case "cancelled":
    case "refunded":
    case "failed":
      return <AlertCircle className="w-3.5 h-3.5" />;
    default:
      return <Box className="w-3.5 h-3.5" />;
  }
};

const OrderDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const { currentOrder, isLoading, error, fetchOrderById } = useOrderStore();

  useEffect(() => {
    if (orderId) {
      if (!currentOrder || currentOrder.id !== orderId) {
        fetchOrderById(orderId);
      }
    }
  }, [orderId, fetchOrderById, currentOrder]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
      </div>
    );
  }

  if (error && !currentOrder) {
    return (
      <div className="container py-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">خطا در دریافت اطلاعات سفارش</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={() => router.push("/dashboard/orders")} variant="outline" size="sm">
          بازگشت به لیست سفارشها
        </Button>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="container py-10 text-center">
        <Package className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">سفارش یافت نشد</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          ممکن است این سفارش وجود نداشته باشد یا شما دسترسی لازم را ندارید.
        </p>
        <Button onClick={() => router.push("/dashboard/orders")} variant="outline" size="sm">
          بازگشت به لیست سفارشها
        </Button>
      </div>
    );
  }

  if (currentOrder.id !== orderId && !isLoading) {
    fetchOrderById(orderId);
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
      </div>
    );
  }

  const order = currentOrder;
  const { items, shipping_address, total_amount } = order;
  const itemsSubtotal = items.reduce((acc, item) => acc + item.price_at_purchase * item.quantity, 0);

  return (
    <div className="container mx-auto max-w-4xl py-4 md:py-6 px-3 md:px-4">
      {/* Back button */}
      <div className="mb-3">
        <Button onClick={() => router.push("/dashboard/orders")} variant="outline" size="sm" className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4" />
          بازگشت به لیست سفارشها
        </Button>
      </div>

      {/* Order header */}
      <Card className="shadow-md overflow-hidden rounded-xl border border-voxcina-cream dark:border-voxcina-blue/20">
        <CardHeader className="bg-voxcina-cream/30 dark:bg-voxcina-blue/10 border-b border-voxcina-cream/50 dark:border-voxcina-blue/20 px-4 py-3 md:px-5 md:py-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
            <div>
              <CardTitle className="text-base md:text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                سفارش #{order.order_number}
              </CardTitle>
              <p className="text-[11px] md:text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {order.jalali_created_at || formatDate(order.created_at)}
              </p>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1 ${getStatusStyle(order.status)}`}>
              {getStatusIcon(order.status)}
              {order.status_text}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-3 md:px-5 md:py-4 space-y-3">
          {/* Order info */}
          <section>
            <h3 className="text-xs md:text-sm font-semibold mb-1.5 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              اطلاعات سفارش
            </h3>
            <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-lg px-3 py-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  بروزرسانی
                </span>
                <span className="text-voxcina-blue dark:text-voxcina-cream font-medium">
                  {order.jalali_updated_at || formatDate(order.updated_at)}
                </span>
              </div>
              {order.snappay_payment_token && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" />
                    توکن پرداخت اسنپپی
                  </span>
                  <span className="font-mono text-[11px] bg-voxcina-cream/50 dark:bg-voxcina-blue/10 px-1.5 py-0.5 rounded text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                    {order.snappay_payment_token}
                  </span>
                </div>
              )}
              {order.zibal_track_id && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" />
                    کد پیگیری زیبال
                  </span>
                  <span className="font-mono text-[11px] bg-voxcina-cream/50 dark:bg-voxcina-blue/10 px-1.5 py-0.5 rounded text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                    {order.zibal_track_id}
                  </span>
                </div>
              )}
              {order.digipay_tracking_code && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" />
                    کد پیگیری دیجی‌پی
                  </span>
                  <span className="font-mono text-[11px] bg-voxcina-cream/50 dark:bg-voxcina-blue/10 px-1.5 py-0.5 rounded text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                    {order.digipay_tracking_code}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3" />
                  پرداخت
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 ${getStatusStyle(order.payment_status)}`}>
                  {getStatusIcon(order.payment_status)}
                  {order.payment_status === "paid"
                    ? "پرداخت شده"
                    : order.payment_status === "pending"
                    ? "در انتظار پرداخت"
                    : "خطا در پرداخت"}
                </span>
              </div>
              {order.tracking_code && (
                <div className="flex items-center justify-between">
                  <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                    <Truck className="w-3 h-3" />
                    کد رهگیری
                  </span>
                  <span className="font-mono text-[11px] bg-voxcina-cream/50 dark:bg-voxcina-blue/10 px-1.5 py-0.5 rounded text-voxcina-blue dark:text-voxcina-cream">
                    {order.tracking_code}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Address */}
          {shipping_address && (
            <section>
              <h3 className="text-xs md:text-sm font-semibold mb-1.5 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                آدرس تحویل
              </h3>
              <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-lg px-3 py-2 text-xs text-voxcina-blue dark:text-voxcina-cream">
                <p>
                  {shipping_address.state && <span className="font-medium">{shipping_address.state}</span>}
                  {shipping_address.state && shipping_address.city && "، "}
                  {shipping_address.city && <span className="font-medium">{shipping_address.city}</span>}
                </p>
                {(shipping_address.street || shipping_address.address) && (
                  <p className="mt-0.5 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    {shipping_address.street || shipping_address.address}
                  </p>
                )}
                {shipping_address.postal_code && (
                  <p className="text-voxcina-blue/50 dark:text-voxcina-cream/50">کد پستی: {shipping_address.postal_code}</p>
                )}
              </div>
            </section>
          )}

          {/* Items */}
          <section>
            <h3 className="text-xs md:text-sm font-semibold mb-1.5 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              محصولات ({items.length})
            </h3>

            {/* Desktop: list layout */}
            <div className="hidden md:block space-y-2">
              {items.map((item, index) => (
                <div key={item.product.id + index} className="flex gap-3 p-2.5 border border-voxcina-cream/50 dark:border-voxcina-blue/20 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="w-14 h-14 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product.image || item.product_image ? (
                      <img
                        src={item.product.image || item.product_image}
                        alt={item.product.name || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={22} className="text-voxcina-blue/30 dark:text-voxcina-cream/30" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-sm font-semibold text-voxcina-blue dark:text-voxcina-cream truncate">
                      {item.product.name || item.product_name || `محصول شناسه: ${item.product.id}`}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                      {item.product.brand && <span>{item.product.brand}</span>}
                      {(item.variant.size !== "N/A" || item.variant.color !== "N/A" || item.variant.colorName) && (
                        <span>
                          {item.variant.size !== "N/A" && item.variant.size}
                          {item.variant.size !== "N/A" && (item.variant.color !== "N/A" || item.variant.colorName) && " · "}
                          {(item.variant.color !== "N/A" || item.variant.colorName) && (item.variant.colorName || item.variant.color)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5">
                      {item.quantity} × {formatPrice(item.price_at_purchase)}
                    </p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                      {formatPrice(item.price_at_purchase * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: compact cards */}
            <div className="md:hidden space-y-2">
              {items.map((item, index) => (
                <div key={item.product.id + index} className="flex gap-2.5 p-2 border border-voxcina-cream/50 dark:border-voxcina-blue/20 rounded-lg">
                  <div className="w-12 h-12 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product.image || item.product_image ? (
                      <img
                        src={item.product.image || item.product_image}
                        alt={item.product.name || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={18} className="text-voxcina-blue/30 dark:text-voxcina-cream/30" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-[13px] font-semibold text-voxcina-blue dark:text-voxcina-cream truncate">
                      {item.product.name || item.product_name || `محصول شناسه: ${item.product.id}`}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5">
                      {item.product.brand && <span>{item.product.brand}</span>}
                      {(item.variant.size !== "N/A" || item.variant.color !== "N/A" || item.variant.colorName) && (
                        <span>
                          {item.variant.size !== "N/A" && item.variant.size}
                          {item.variant.size !== "N/A" && (item.variant.color !== "N/A" || item.variant.colorName) && " · "}
                          {(item.variant.color !== "N/A" || item.variant.colorName) && (item.variant.colorName || item.variant.color)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                        {item.quantity} × {formatPrice(item.price_at_purchase)}
                      </span>
                      <span className="text-[13px] font-bold text-voxcina-blue dark:text-voxcina-cream">
                        {formatPrice(item.price_at_purchase * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Financial summary */}
          <section>
            <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-lg px-3 py-2 text-xs">
              <div className="flex justify-between text-voxcina-blue/70 dark:text-voxcina-cream/70">
                <span>جمع محصولات</span>
                <span>{formatPrice(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base font-bold text-voxcina-blue dark:text-voxcina-cream pt-1.5 mt-1.5 border-t border-voxcina-cream/50 dark:border-voxcina-blue/20">
                <span>مبلغ نهایی</span>
                <span>{formatPrice(total_amount)}</span>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <p className="text-[10px] md:text-[11px] text-voxcina-blue/40 dark:text-voxcina-cream/40 text-center mt-3">
        از خرید شما سپاسگزاریم! شماره سفارش خود ({order.order_number}) را برای پیگیری نگه دارید.
      </p>
    </div>
  );
};

export default OrderDetailPage;
