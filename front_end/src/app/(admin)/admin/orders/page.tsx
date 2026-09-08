"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ShoppingCart,
  Clock,
  Calendar,
  User,
  Eye,
  Download,
  XCircle,
  CheckCircle,
  TruckIcon,
  DollarSign,
  Package,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { getPaymentMethodText } from "@/lib/order-display";
import { useOrderStore } from '@/store/order-store';
import { AdminOrderFilters } from "@/types/order";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminBadgeTone,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminStatCard,
  AdminField,
  AdminSelect,
  AdminInput,
} from "@/components/admin/ui";

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(searchParams.get("payment_status") || "all");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "newest");

  // Connect to admin orders store
  const { orders, fetchAdminOrders, updateOrderStatusAdmin, cancelSnappPay, pagination, isLoading, orderStats, fetchOrderStats } = useOrderStore();

  // Build filters object from current state
  const buildFilters = useCallback((): AdminOrderFilters => {
    const filters: AdminOrderFilters = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (paymentStatusFilter !== "all") filters.payment_status = paymentStatusFilter;
    if (searchTerm) filters.search = searchTerm;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (sortBy !== "newest") filters.sort_by = sortBy as AdminOrderFilters['sort_by'];
    return filters;
  }, [statusFilter, paymentStatusFilter, searchTerm, dateFrom, dateTo, sortBy]);

  // Update URL params when filters change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentStatusFilter !== "all") params.set("payment_status", paymentStatusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (sortBy !== "newest") params.set("sort_by", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());
    
    const queryString = params.toString();
    router.replace(`/admin/orders${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router, searchTerm, statusFilter, paymentStatusFilter, dateFrom, dateTo, sortBy, currentPage]);

  // Fetch admin orders on filter or page change
  useEffect(() => {
    const filters = buildFilters();
    fetchAdminOrders(currentPage, 10, filters);
    updateUrlParams();
  }, [currentPage, statusFilter, paymentStatusFilter, searchTerm, dateFrom, dateTo, sortBy, fetchAdminOrders, buildFilters, updateUrlParams]);

  // Fetch order stats when filters change (excluding pagination)
  useEffect(() => {
    const filters = buildFilters();
    fetchOrderStats(filters);
  }, [statusFilter, paymentStatusFilter, dateFrom, dateTo, fetchOrderStats, buildFilters]);

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const currentOrders = orders;
  const [cancelTarget, setCancelTarget] = useState<(typeof orders)[number] | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      if (cancelTarget.gateway_name === "snappay" && cancelTarget.payment_status === "paid") {
        await cancelSnappPay(cancelTarget.id);
      } else {
        await updateOrderStatusAdmin(cancelTarget.id, "cancelled");
      }
      setCancelTarget(null);
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper function to get status tone
  const getStatusTone = (status: string): AdminBadgeTone => {
    switch (status) {
      case "delivered":
        return "success";
      case "shipping":
      case "shipped":
        return "info";
      case "processing":
        return "success";
      case "pending":
        return "danger";
      case "cancelled":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    paymentStatusFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    sortBy !== "newest" ||
    searchTerm !== "";

  return (
    <div>
      <AdminPageHeader
        title="مدیریت سفارش‌ها"
        actions={
          <a href="/admin/orders/export">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Download className="w-4 h-4 ml-1" />
              خروجی اکسل
            </Button>
          </a>
        }
      />

      {/* Statistics Summary Section */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard
          icon={Package}
          label="کل سفارش‌ها"
          value={(orderStats?.total_orders || 0).toLocaleString("fa-IR")}
          isLoading={isLoading}
        />
        <AdminStatCard
          icon={Clock}
          tone="amber"
          label="در انتظار"
          value={(orderStats?.pending_orders || 0).toLocaleString("fa-IR")}
          isLoading={isLoading}
        />
        <AdminStatCard
          icon={DollarSign}
          tone="green"
          label="درآمد کل"
          value={formatPrice(orderStats?.total_revenue || 0)}
          isLoading={isLoading}
        />
        <AdminStatCard
          icon={Calendar}
          tone="blue"
          label="سفارش‌های امروز"
          value={(orderStats?.today_orders || 0).toLocaleString("fa-IR")}
          isLoading={isLoading}
        />
      </div>

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجوی شماره سفارش، شناسه تراکنش یا توکن پرداخت اسنپ‌پی..."
        filterOpen={isFilterOpen}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Order Status Filter */}
          <AdminField label="وضعیت سفارش">
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending">در انتظار تایید</option>
              <option value="processing">در حال پردازش</option>
              <option value="shipped">ارسال شده</option>
              <option value="delivered">تحویل شده</option>
              <option value="cancelled">لغو شده</option>
            </AdminSelect>
          </AdminField>

          {/* Payment Status Filter */}
          <AdminField label="وضعیت پرداخت">
            <AdminSelect
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending">در انتظار پرداخت</option>
              <option value="paid">پرداخت شده</option>
              <option value="failed">ناموفق</option>
              <option value="abandoned">پرداخت ناتمام</option>
              <option value="expired">منقضی شده</option>
              <option value="cancelled">لغو شده</option>
              <option value="refunded">بازگشت وجه</option>
            </AdminSelect>
          </AdminField>

          {/* Sort Options */}
          <AdminField label="مرتب‌سازی">
            <AdminSelect
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="newest">جدیدترین</option>
              <option value="oldest">قدیمی‌ترین</option>
              <option value="amount_asc">مبلغ (کم به زیاد)</option>
              <option value="amount_desc">مبلغ (زیاد به کم)</option>
            </AdminSelect>
          </AdminField>

          {/* Date From */}
          <AdminField label="از تاریخ">
            <AdminInput
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
            />
          </AdminField>

          {/* Date To */}
          <AdminField label="تا تاریخ">
            <AdminInput
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
            />
          </AdminField>
        </div>
      </AdminToolbar>

      {/* Orders List */}
      <div>
        {currentOrders.length > 0 ? (
          <div className="space-y-4">
            {currentOrders.map((order) => (
              <div key={order.id}>
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      {/* Order Header */}
                      <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="flex items-center ml-4 min-w-[120px]">
                            <ShoppingCart className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                            <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {order.order_number}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            <Calendar className="w-4 h-4 ml-1" />
                            <span>{order.jalali_created_at}</span>
                            <span className="mx-1">|</span>
                            <Clock className="w-4 h-4 ml-1" />
                            <span>{new Date(order.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <AdminBadge tone={getStatusTone(order.status)}>
                            {order.status_text}
                          </AdminBadge>
                          <a
                            href={`/admin/orders/${order.id}`}
                            className="mr-3 flex items-center text-sm text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream transition-colors"
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            <span>مشاهده جزئیات</span>
                          </a>
                        </div>
                      </div>

                      {/* Order Body */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2 flex items-center">
                            <User className="w-4 h-4 ml-1" />
                            اطلاعات مشتری
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-voxcina-blue dark:text-voxcina-cream">
                              <span className="font-medium">{(order.shipping_address as any).first_name} {(order.shipping_address as any).last_name}</span>
                              <span className="text-xs mr-1 text-voxcina-blue/60 dark:text-voxcina-cream/60">
                                ({order.user_id})
                              </span>
                            </p>
                            <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {(order.shipping_address as any).phone_number}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2 flex items-center">
                            <ShoppingCart className="w-4 h-4 ml-1" />
                            اطلاعات سفارش
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between">
                              <span>تعداد اقلام:</span>
                              <span className="font-medium">{order.items.length} محصول</span>
                            </p>
                            <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between">
                              <span>مبلغ کل:</span>
                              <span className="font-medium">
                                {formatPrice(order.total_amount)}
                              </span>
                            </p>
                             <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between">
                               <span>روش پرداخت:</span>
                               <span>{getPaymentMethodText(order)}</span>
                             </p>
                               {order.merchant_transaction_id && (
                                 <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between gap-2">
                                   <span>شناسه تراکنش فروشگاه:</span>
                                   <span className="font-mono text-xs truncate" dir="ltr">{order.merchant_transaction_id}</span>
                                 </p>
                               )}
                               {order.gateway_transaction_id && (
                                 <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between gap-2">
                                   <span>شناسه تراکنش درگاه:</span>
                                   <span className="font-mono text-xs truncate" dir="ltr">{order.gateway_transaction_id}</span>
                                 </p>
                               )}
                               {order.snappay_payment_token && (
                                 <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between gap-2">
                                   <span>توکن پرداخت اسنپ‌پی:</span>
                                   <span className="font-mono text-xs truncate" dir="ltr">{order.snappay_payment_token}</span>
                                 </p>
                               )}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2">
                            آدرس ارسال
                          </h3>
                          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            {(order.shipping_address as any).address || `${order.shipping_address.city} ${order.shipping_address.state}`}
                          </p>
                        </div>
                      </div>

                      {/* Order Actions */}
                      <div className="p-3 bg-voxcina-cream/10 dark:bg-voxcina-blue/10 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end space-x-2 space-x-reverse">
                        {order.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-xl"
                            onClick={() => setCancelTarget(order)}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            لغو کامل سفارش
                          </Button>
                        )}
                        {order.status === "pending" && order.payment_status === "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-voxcina-blue dark:text-voxcina-cream rounded-xl"
                            onClick={() =>
                              updateOrderStatusAdmin(order.id, "processing")
                            }
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تایید سفارش
                          </Button>
                        )}
                        {order.status === "processing" && order.payment_status === "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-voxcina-blue dark:text-voxcina-cream rounded-xl"
                            onClick={() => updateOrderStatusAdmin(order.id, "shipped")}
                          >
                            <TruckIcon className="w-4 h-4 ml-1" />
                            ارسال سفارش
                          </Button>
                        )}
                        {order.status === "shipped" && order.payment_status === "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-voxcina-blue dark:text-voxcina-cream rounded-xl"
                            onClick={() => updateOrderStatusAdmin(order.id, "delivered")}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تحویل شده
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmpty
            icon={ShoppingCart}
            title="سفارشی یافت نشد"
            description="هیچ سفارشی با فیلترهای انتخاب شده یافت نشد"
            action={
              <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
                پاک کردن فیلترها
              </Button>
            }
          />
        )}

        {/* Pagination */}
        {pagination && (
          <AdminPagination
            page={currentPage}
            totalPages={pagination.totalPages}
            onChange={setCurrentPage}
          />
        )}
      </div>

      <AdminModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="لغو کامل سفارش"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          {cancelTarget?.gateway_name === "snappay" && cancelTarget?.payment_status === "paid"
            ? `لغو کامل سفارش ${cancelTarget?.order_number} و بازگشت وجه اسنپ‌پی انجام شود؟ این عملیات غیرقابل برگشت است.`
            : `لغو کامل سفارش ${cancelTarget?.order_number} انجام شود؟ این عملیات غیرقابل برگشت است.`}
        </p>
        <AdminModalActions onCancel={() => setCancelTarget(null)}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleCancelOrder}
            disabled={isCancelling}
            isLoading={isCancelling}
            className="rounded-xl"
          >
            لغو سفارش
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
