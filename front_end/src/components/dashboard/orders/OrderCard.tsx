"use client";

import Link from "next/link";
import { Calendar, ChevronLeft, Download, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { downloadInvoice } from "@/components/OrderInvoice";
import { Order } from "@/types/order";
import { formatDate, formatPrice, toPersianNumber } from "@/lib/utils";

interface OrderCardProps {
  order: Order;
  onOpen: (order: Order) => void;
}

/** Mobile representation of an order row from the dashboard list. */
export default function OrderCard({ order, onOpen }: OrderCardProps) {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Card className="overflow-hidden rounded-xl border border-voxcina-cream bg-white/90 shadow-sm backdrop-blur-sm dark:border-voxcina-blue/20 dark:bg-voxcina-blue/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
            {order.order_number}
          </span>
          <OrderStatusBadge status={order.status} label={order.status_text} size="xs" />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {order.jalali_created_at || formatDate(order.created_at)}
          </span>
          <span>{toPersianNumber(itemCount)} محصول</span>
        </div>

        {order.tracking_code && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
            <Truck className="h-3.5 w-3.5" />
            کد رهگیری:
            <span className="font-mono" dir="ltr">
              {order.tracking_code}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-voxcina-cream/50 pt-3 dark:border-voxcina-blue/20">
          <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
            {formatPrice(order.total_amount)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadInvoice(order)}
              title="دانلود فاکتور"
              aria-label={`دانلود فاکتور سفارش ${order.order_number}`}
              className="h-8 w-8 rounded-full p-0 text-voxcina-blue/70 dark:text-voxcina-cream/70"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Link
              href={`/dashboard/orders/${order.id}`}
              onClick={() => onOpen(order)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-voxcina-blue transition-colors hover:bg-voxcina-blue/5 dark:text-voxcina-cream dark:hover:bg-voxcina-blue/20"
            >
              جزئیات سفارش
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
