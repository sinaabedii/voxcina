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

export const getStatusStyle = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-voxcina-blue dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
    case "shipping":
      return "bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream border border-voxcina-blue/20 dark:border-voxcina-blue/30";
    case "processing":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
    default:
      return "bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/10 dark:text-voxcina-lightCream border border-voxcina-cream/70 dark:border-voxcina-blue/20";
  }
};

export const formatOrderDate = (order: OrderLike) => order.jalali_created_at || order.jalaliCreatedAt || order.date || order.created_at || order.createdAt || "";
export const formatOrderAmount = (order: OrderLike) => formatPrice(order.total_amount ?? order.totalAmount ?? order.total ?? 0);
export const formatOrderStatus = (order: OrderLike) => order.status_text || order.statusText || "";
export const formatOrderId = (order: OrderLike) => order.order_number || order.id;
