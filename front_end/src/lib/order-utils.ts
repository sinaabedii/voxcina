import { formatPrice } from "./utils";

export interface OrderLike {
  id: string;
  order_number?: string;
  status: string;
  status_text?: string;
  statusText?: string;
  total_amount?: number;
  totalAmount?: number;
  total?: number;
  jalali_created_at?: string;
  jalaliCreatedAt?: string;
  date?: string;
  created_at?: string;
  createdAt?: string;
}

/**
 * Customer-facing labels for the order statuses the backend can set.
 * `handlers/orders.go` localizes the same set in `getStatusText`; the values
 * here are only the fallback when the API response carries no `status_text`.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار پرداخت",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  refunded: "مرجوع شده",
};

/** Customer-facing labels for `payment_status` values. */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  failed: "پرداخت ناموفق",
  abandoned: "رها شده",
  expired: "منقضی شده",
  cancelled: "لغو شده",
  refunded: "بازگشت داده شده",
};

export const formatOrderDate = (order: OrderLike) => order.jalali_created_at || order.jalaliCreatedAt || order.date || order.created_at || order.createdAt || "";
export const formatOrderAmount = (order: OrderLike) => formatPrice(order.total_amount ?? order.totalAmount ?? order.total ?? 0);
export const formatOrderStatus = (order: OrderLike) => order.status_text || order.statusText || "";
export const formatOrderId = (order: OrderLike) => order.order_number || order.id;
