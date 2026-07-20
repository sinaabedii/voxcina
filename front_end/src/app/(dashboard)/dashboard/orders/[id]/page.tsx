"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  ArrowRight,
  Calendar,
  CreditCard,
  MapPin,
  ChevronLeft,
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
    case "processing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
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
    case "processing":
      return <Truck className="w-3.5 h-3.5" />;
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
    <div className="container mx-auto max-w-4xl py-6 md:py-10 px-4">
      {/* Back button */}
      <div className="mb-4">
        <Button onClick={() => router.push("/dashboard/orders")} variant="outline" size="sm" className="flex items-center">
          <ChevronLeft className="w-4 h-4 ml-1" />
          بازگشت به لیست سفارشها
        </Button>
      </div>

      {/* Order header */}
      <Card className="shadow-lg overflow-hidden rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20">
        <CardHeader className="bg-voxcina-cream/30 dark:bg-voxcina-blue/10 border-b border-voxcina-cream/50 dark:border-voxcina-blue/20 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg md:text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                سفارش #{order.order_number}
              </CardTitle>
              <p className="text-xs md:text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {order.jalali_created_at || formatDate(order.created_at)}
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusStyle(order.status)}`}>
              {getStatusIcon(order.status)}
              {order.status_text}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Order info */}
          <section>
            <h3 className="text-sm md:text-lg font-semibold mb-3 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
              <Tag className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              اطلاعات سفارش
            </h3>
            <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-xl p-3 md:p-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  بروزرسانی
                </span>
                <span className="text-voxcina-blue dark:text-voxcina-cream font-medium">
                  {order.jalali_updated_at || formatDate(order.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  پرداخت
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1 ${getStatusStyle(order.payment_status)}`}>
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
                    <Truck className="w-3.5 h-3.5" />
                    کد رهگیری
                  </span>
                  <span className="font-mono text-xs bg-voxcina-cream/50 dark:bg-voxcina-blue/10 px-2 py-0.5 rounded text-voxcina-blue dark:text-voxcina-cream">
                    {order.tracking_code}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Address */}
          <section>
            <h3 className="text-sm md:text-lg font-semibold mb-3 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
              <MapPin className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              آدرس تحویل
            </h3>
            {shipping_address ? (
              <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-xl p-3 md:p-4 text-sm text-voxcina-blue dark:text-voxcina-cream space-y-1">
                {shipping_address.state && (
                  <p><span className="font-medium">استان:</span> {shipping_address.state}</p>
                )}
                {shipping_address.city && (
                  <p><span className="font-medium">شهر:</span> {shipping_address.city}</p>
                )}
                {(shipping_address.street || shipping_address.address) && (
                  <p><span className="font-medium">آدرس:</span> {shipping_address.street || shipping_address.address}</p>
                )}
                {shipping_address.postal_code && (
                  <p><span className="font-medium">کد پستی:</span> {shipping_address.postal_code}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50">اطلاعات آدرس موجود نیست.</p>
            )}
          </section>

          {/* Items */}
          <section>
            <h3 className="text-sm md:text-lg font-semibold mb-3 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
              <Package className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              محصولات ({items.length})
            </h3>

            {/* Desktop: list layout */}
            <div className="hidden md:block space-y-3">
              {items.map((item, index) => (
                <div key={item.product.id + index} className="flex gap-4 p-4 border border-voxcina-cream/50 dark:border-voxcina-blue/20 rounded-xl hover:shadow-md transition-shadow">
                  <div className="w-20 h-20 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product.image || item.product_image ? (
                      <img
                        src={item.product.image || item.product_image}
                        alt={item.product.name || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={28} className="text-voxcina-blue/30 dark:text-voxcina-cream/30" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-semibold text-voxcina-blue dark:text-voxcina-cream truncate">
                      {item.product.name || item.product_name || `محصول شناسه: ${item.product.id}`}
                    </h4>
                    {(item.variant.size !== "N/A" || item.variant.color !== "N/A" || item.variant.colorName) && (
                      <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5">
                        {item.variant.size !== "N/A" && `سایز: ${item.variant.size}`}
                        {item.variant.size !== "N/A" && (item.variant.color !== "N/A" || item.variant.colorName) && ", "}
                        {(item.variant.color !== "N/A" || item.variant.colorName) && `رنگ: ${item.variant.colorName || item.variant.color}`}
                      </p>
                    )}
                    <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5">
                      تعداد: {item.quantity} × {formatPrice(item.price_at_purchase)}
                    </p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="font-bold text-voxcina-blue dark:text-voxcina-cream">
                      {formatPrice(item.price_at_purchase * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: compact cards */}
            <div className="md:hidden space-y-2.5">
              {items.map((item, index) => (
                <div key={item.product.id + index} className="flex gap-3 p-3 border border-voxcina-cream/50 dark:border-voxcina-blue/20 rounded-xl">
                  <div className="w-16 h-16 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
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
                    {(item.variant.size !== "N/A" || item.variant.color !== "N/A" || item.variant.colorName) && (
                      <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5">
                        {item.variant.size !== "N/A" && `سایز: ${item.variant.size}`}
                        {item.variant.size !== "N/A" && (item.variant.color !== "N/A" || item.variant.colorName) && " · "}
                        {(item.variant.color !== "N/A" || item.variant.colorName) && `${item.variant.colorName || item.variant.color}`}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                        {item.quantity} × {formatPrice(item.price_at_purchase)}
                      </span>
                      <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
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
            <h3 className="text-sm md:text-lg font-semibold mb-3 text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              خلاصه مالی
            </h3>
            <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 rounded-xl p-3 md:p-4 space-y-2 text-sm">
              <div className="flex justify-between text-voxcina-blue/70 dark:text-voxcina-cream/70">
                <span>جمع محصولات</span>
                <span>{formatPrice(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-base md:text-lg font-bold text-voxcina-blue dark:text-voxcina-cream pt-2 border-t border-voxcina-cream/50 dark:border-voxcina-blue/20">
                <span>مبلغ نهایی</span>
                <span>{formatPrice(total_amount)}</span>
              </div>
            </div>
          </section>
        </CardContent>

        <CardFooter className="bg-voxcina-cream/20 dark:bg-voxcina-blue/5 p-4 md:p-6 border-t border-voxcina-cream/50 dark:border-voxcina-blue/20">
          <p className="text-[11px] md:text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
            از خرید شما سپاسگزاریم! شماره سفارش خود ({order.order_number}) را برای پیگیری نگه دارید.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrderDetailPage;
