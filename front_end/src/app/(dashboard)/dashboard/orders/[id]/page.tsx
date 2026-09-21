"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  CreditCard,
  MapPin,
  Package,
  PackageSearch,
  Tag,
  Truck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoading } from "@/components/ui/Loading";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ReturnRequestSection from "@/components/dashboard/ReturnRequestSection";
import OrderItemsList from "@/components/dashboard/orders/OrderItemsList";
import OrderSection from "@/components/dashboard/orders/OrderSection";
import OrderSummary from "@/components/dashboard/orders/OrderSummary";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/dashboard/orders/OrderStatusBadge";
import { useOrderStore } from "@/store/order-store";
import { ShippingAddress } from "@/types/order";
import { formatDate, toPersianNumber } from "@/lib/utils";

const BACK_BUTTON_CLASSES =
  "inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3.5 text-xs font-medium text-foreground shadow-soft transition-all duration-200 hover:border-primary/20 hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-voxcina-blue/60 dark:text-voxcina-cream/60">
        {icon}
        {label}
      </span>
      <span className="text-voxcina-blue dark:text-voxcina-cream">{children}</span>
    </div>
  );
}

function MonoValue({ children }: { children: ReactNode }) {
  return (
    <span
      dir="ltr"
      className="rounded bg-voxcina-cream/50 px-1.5 py-0.5 font-mono text-[11px] dark:bg-voxcina-blue/10"
    >
      {children}
    </span>
  );
}

/** Prefers the Persian address fields, falling back to the legacy ones. */
function ShippingAddressBlock({ address }: { address: ShippingAddress }) {
  const recipient = [address.first_name, address.last_name].filter(Boolean).join(" ");
  const region = [address.province || address.state, address.city].filter(Boolean).join("، ");
  const street = address.address || address.street;

  return (
    <div className="rounded-lg bg-voxcina-cream/20 px-3 py-2 text-xs text-voxcina-blue dark:bg-voxcina-blue/5 dark:text-voxcina-cream">
      {(recipient || address.phone_number) && (
        <p className="font-medium">
          {recipient}
          {recipient && address.phone_number && " — "}
          {address.phone_number}
        </p>
      )}
      {region && <p className="mt-0.5">{region}</p>}
      {street && (
        <p className="mt-0.5 text-voxcina-blue/70 dark:text-voxcina-cream/70">{street}</p>
      )}
      {address.postal_code && (
        <p className="mt-0.5 text-voxcina-blue/50 dark:text-voxcina-cream/50">
          کد پستی: {address.postal_code}
        </p>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const { currentOrder, isLoading, error, fetchOrderById } = useOrderStore();

  // Only trust the stored order when it is the one in the URL; otherwise the
  // page would briefly render the previously opened order (or a stale one).
  const order = currentOrder && currentOrder.id === orderId ? currentOrder : null;
  const [isFetching, setIsFetching] = useState(() => !order);

  useEffect(() => {
    if (!orderId || (currentOrder && currentOrder.id === orderId)) return;

    let cancelled = false;
    setIsFetching(true);
    fetchOrderById(orderId).finally(() => {
      if (!cancelled) setIsFetching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, currentOrder, fetchOrderById]);

  if (!order) {
    if (isFetching || isLoading) {
      return <PageLoading text="در حال بارگذاری سفارش..." />;
    }

    if (error && error !== "Order not found") {
      return (
        <EmptyState
          icon={<AlertCircle className="h-10 w-10 text-red-500" />}
          title="خطا در دریافت اطلاعات سفارش"
          description={error}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => orderId && fetchOrderById(orderId)}>
                تلاش دوباره
              </Button>
              <Link href="/dashboard/orders" className={BACK_BUTTON_CLASSES}>
                بازگشت به لیست سفارش‌ها
              </Link>
            </div>
          }
        />
      );
    }

    return (
      <EmptyState
        icon={<PackageSearch className="h-10 w-10 text-gray-400" />}
        title="سفارش یافت نشد"
        description="ممکن است این سفارش وجود نداشته باشد یا شما دسترسی لازم را ندارید."
        action={
          <Link href="/dashboard/orders" className={BACK_BUTTON_CLASSES}>
            بازگشت به لیست سفارش‌ها
          </Link>
        }
      />
    );
  }

  const { items, shipping_address } = order;

  return (
    <div className="container mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-6">
      <div className="mb-3">
        <Link href="/dashboard/orders" className={BACK_BUTTON_CLASSES}>
          <ChevronRight className="h-4 w-4" />
          بازگشت به لیست سفارش‌ها
        </Link>
      </div>

      <Card className="overflow-hidden rounded-xl border border-voxcina-cream shadow-md dark:border-voxcina-blue/20">
        <CardHeader className="border-b border-voxcina-cream/50 bg-voxcina-cream/30 px-4 py-3 dark:border-voxcina-blue/20 dark:bg-voxcina-blue/10 md:px-5 md:py-4">
          <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream md:text-xl">
                سفارش #{order.order_number}
              </CardTitle>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60 md:text-xs">
                <Calendar className="h-3 w-3" />
                {order.jalali_created_at || formatDate(order.created_at)}
              </p>
            </div>
            <OrderStatusBadge status={order.status} label={order.status_text} size="sm" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-4 py-3 md:px-5 md:py-4">
          <OrderSection title="اطلاعات سفارش" icon={<Tag className="h-3.5 w-3.5" />}>
            <div className="space-y-1.5 rounded-lg bg-voxcina-cream/20 px-3 py-2 text-xs dark:bg-voxcina-blue/5">
              <InfoRow icon={<Calendar className="h-3 w-3" />} label="بروزرسانی">
                <span className="font-medium">
                  {order.jalali_updated_at || formatDate(order.updated_at)}
                </span>
              </InfoRow>

              {(order.merchant_transaction_id || order.gateway_transaction_id) && (
                <InfoRow icon={<CreditCard className="h-3 w-3" />} label="شناسه تراکنش">
                  <MonoValue>
                    {order.merchant_transaction_id || order.gateway_transaction_id}
                  </MonoValue>
                </InfoRow>
              )}

              {order.zibal_track_id && (
                <InfoRow icon={<CreditCard className="h-3 w-3" />} label="کد پیگیری زیبال">
                  <MonoValue>{order.zibal_track_id}</MonoValue>
                </InfoRow>
              )}

              <InfoRow icon={<CreditCard className="h-3 w-3" />} label="پرداخت">
                <PaymentStatusBadge status={order.payment_status} size="xs" />
              </InfoRow>

              {order.tracking_code && (
                <InfoRow icon={<Truck className="h-3 w-3" />} label="کد رهگیری">
                  <MonoValue>{order.tracking_code}</MonoValue>
                </InfoRow>
              )}
            </div>
          </OrderSection>

          {shipping_address && (
            <OrderSection title="آدرس تحویل" icon={<MapPin className="h-3.5 w-3.5" />}>
              <ShippingAddressBlock address={shipping_address} />
            </OrderSection>
          )}

          <OrderSection
            title={`محصولات (${toPersianNumber(items.length)})`}
            icon={<Package className="h-3.5 w-3.5" />}
          >
            <OrderItemsList items={items} />
          </OrderSection>

          <ReturnRequestSection order={order} />

          <OrderSummary order={order} />
        </CardContent>
      </Card>

      <p className="mt-3 text-center text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 md:text-[11px]">
        از خرید شما سپاسگزاریم! شماره سفارش خود ({order.order_number}) را برای پیگیری نگه دارید.
      </p>
    </div>
  );
}
