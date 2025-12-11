"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { useSellerStore } from "@/store/seller-store";
import { useAuthStore } from "@/store/auth-store";

export default function SellerOrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { orders, fetchSellerOrders, isLoading, ordersPagination } = useSellerStore();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.role !== "seller") {
      router.push("/dashboard/become-seller");
      return;
    }
    fetchSellerOrders(1, statusFilter);
  }, [user, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "shipping":
        return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
        label: "در انتظار",
      },
      processing: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        label: "در حال پردازش",
      },
      shipping: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-700 dark:text-purple-400",
        label: "در حال ارسال",
      },
      delivered: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        label: "تحویل شده",
      },
      cancelled: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
        label: "لغو شده",
      },
    };

    const statusInfo = statusMap[status] || statusMap.pending;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusInfo.bg} ${statusInfo.text}`}
      >
        {getStatusIcon(status)}
        {statusInfo.label}
      </span>
    );
  };

  const filteredOrders = orders.filter((order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          سفارشات فروشگاه
        </h1>
        <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
          مدیریت سفارشات محصولات شما
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو با شماره سفارش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="processing">در حال پردازش</option>
            <option value="shipping">در حال ارسال</option>
            <option value="delivered">تحویل شده</option>
            <option value="cancelled">لغو شده</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-voxcina-blue/50 rounded-xl">
          <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
            سفارشی یافت نشد
          </h3>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
            هنوز سفارشی برای محصولات شما ثبت نشده است
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              {/* Order Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream">
                    سفارش #{order.order_number}
                  </h3>
                  <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    {new Date(order.created_at).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <button
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title="مشاهده جزئیات"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Order Items (only from this store) */}
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-voxcina-blue/30 rounded-lg"
                  >
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                        محصول (ID: {item.product_id})
                      </p>
                      <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        {item.variant.size} - {item.variant.color}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-voxcina-blue dark:text-voxcina-cream">
                        {item.quantity} عدد
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {item.price_at_purchase.toLocaleString()} تومان
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  مجموع (محصولات شما):
                </span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {order.items
                    .reduce((sum, item) => sum + item.price_at_purchase * item.quantity, 0)
                    .toLocaleString()}{" "}
                  تومان
                </span>
              </div>

              {/* Payment Status */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  وضعیت پرداخت:
                </span>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    order.payment_status === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {order.payment_status === "paid" ? "پرداخت شده" : "در انتظار پرداخت"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {ordersPagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: ordersPagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => fetchSellerOrders(page, statusFilter)}
              className={`w-10 h-10 rounded-lg transition-colors ${
                ordersPagination.currentPage === page
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
