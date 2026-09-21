"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Download,
  FileText,
  PackageSearch,
  Search,
  Truck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Card } from "@/components/ui/Card";
import { PageLoading } from "@/components/ui/Loading";
import FilterTabs, { type FilterTab } from "@/components/ui/FilterTabs";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import PageTitle from "@/components/dashboard/ui/PageTitle";
import OrderCard from "@/components/dashboard/orders/OrderCard";
import OrdersGuide from "@/components/dashboard/orders/OrdersGuide";
import { OrderStatusBadge } from "@/components/dashboard/orders/OrderStatusBadge";
import { downloadInvoice } from "@/components/OrderInvoice";
import { useOrderStore } from "@/store/order-store";
import { Order } from "@/types/order";
import { formatDate, formatPrice, toPersianNumber } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/order-utils";
import { slideUpItem, staggerContainer } from "@/lib/motion";

const PAGE_SIZE = 10;

type OrderStatusFilter =
  | "all"
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

const STATUS_TABS: ReadonlyArray<FilterTab<OrderStatusFilter>> = [
  { value: "all", label: "همه" },
  { value: "pending", label: ORDER_STATUS_LABELS.pending },
  { value: "processing", label: ORDER_STATUS_LABELS.processing },
  { value: "shipped", label: ORDER_STATUS_LABELS.shipped },
  { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

const STATUS_VALUES = STATUS_TABS.map((tab) => tab.value);

function parseStatus(value: string | null): OrderStatusFilter {
  return STATUS_VALUES.includes(value as OrderStatusFilter)
    ? (value as OrderStatusFilter)
    : "all";
}

function buildFilters(status: OrderStatusFilter, search: string): Record<string, string> {
  const filters: Record<string, string> = {};
  if (status !== "all") filters.status = status;
  if (search) filters.search = search;
  return filters;
}

function OrderRow({ order, onOpen }: { order: Order; onOpen: (order: Order) => void }) {
  const paymentId = order.merchant_transaction_id || order.gateway_transaction_id;
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <tr className="transition-colors hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/10">
      <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">
        {order.order_number}
      </td>
      <td className="p-4 text-xs font-mono text-voxcina-blue/70 dark:text-voxcina-cream/70" dir="ltr">
        {paymentId || "-"}
      </td>
      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
        <span className="flex items-center">
          <Calendar className="ml-2 h-4 w-4 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
          {order.jalali_created_at || formatDate(order.created_at)}
        </span>
      </td>
      <td className="p-4">
        <OrderStatusBadge status={order.status} label={order.status_text} />
      </td>
      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
        {toPersianNumber(itemCount)} محصول
      </td>
      <td className="p-4 font-bold text-voxcina-blue dark:text-voxcina-cream">
        {formatPrice(order.total_amount)}
      </td>
      <td className="p-4 text-left">
        <div className="flex justify-end gap-1">
          {order.tracking_code && (
            <span
              title={`کد رهگیری: ${order.tracking_code}`}
              className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full text-voxcina-blue dark:text-voxcina-cream"
            >
              <Truck className="h-5 w-5" />
              <span className="pointer-events-none absolute bottom-full right-1/2 mb-2 translate-x-1/2 whitespace-nowrap rounded bg-voxcina-blue px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-voxcina-cream dark:text-voxcina-blue">
                {order.tracking_code}
              </span>
            </span>
          )}

          <button
            type="button"
            title="دانلود فاکتور"
            aria-label={`دانلود فاکتور سفارش ${order.order_number}`}
            onClick={() => downloadInvoice(order)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-voxcina-blue/60 transition-colors hover:bg-voxcina-blue/10 dark:text-voxcina-cream/60 dark:hover:bg-voxcina-blue/20"
          >
            <Download className="h-5 w-5" />
          </button>

          <Link
            href={`/dashboard/orders/${order.id}`}
            title="جزئیات سفارش"
            aria-label={`جزئیات سفارش ${order.order_number}`}
            onClick={() => onOpen(order)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-voxcina-blue transition-colors hover:bg-voxcina-blue/10 dark:text-voxcina-cream dark:hover:bg-voxcina-blue/20"
          >
            <FileText className="h-5 w-5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orders, isLoading, error, fetchOrders, pagination, setCurrentOrder } =
    useOrderStore();

  const [activeStatus, setActiveStatus] = useState<OrderStatusFilter>(() =>
    parseStatus(searchParams.get("status")),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Keep the tab in sync with ?status= deep-links (e.g. dashboard stat tiles).
  useEffect(() => {
    const next = parseStatus(searchParams.get("status"));
    setActiveStatus((previous) => {
      if (previous === next) return previous;
      setCurrentPage(1);
      return next;
    });
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchOrders(currentPage, PAGE_SIZE, buildFilters(activeStatus, debouncedQuery));
  }, [activeStatus, debouncedQuery, currentPage, fetchOrders]);

  const syncStatusToUrl = (status: OrderStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") params.delete("status");
    else params.set("status", status);
    const query = params.toString();
    router.replace(`/dashboard/orders${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleStatusChange = (status: OrderStatusFilter) => {
    if (status === activeStatus) return;
    setActiveStatus(status);
    setCurrentPage(1);
    syncStatusToUrl(status);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const totalPages = pagination?.totalPages ?? 1;
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleRetry = () => {
    fetchOrders(currentPage, PAGE_SIZE, buildFilters(activeStatus, debouncedQuery));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setActiveStatus("all");
    setCurrentPage(1);
    router.replace("/dashboard/orders", { scroll: false });
  };

  const hasFilters = activeStatus !== "all" || searchQuery.trim() !== "";
  const showInitialLoading = isLoading && orders.length === 0;
  const showError = error !== null && !isLoading && orders.length === 0;
  const totalOrders = pagination?.totalOrders ?? 0;
  const pageSize = pagination?.pageSize ?? PAGE_SIZE;
  const firstItemIndex = ((pagination?.currentPage ?? 1) - 1) * pageSize + 1;
  const lastItemIndex = Math.min((pagination?.currentPage ?? 1) * pageSize, totalOrders);

  const renderContent = () => {
    if (showInitialLoading) {
      return <PageLoading text="در حال بارگذاری سفارش‌ها..." />;
    }

    if (showError) {
      return (
        <EmptyState
          icon={<AlertCircle className="h-10 w-10 text-red-500" />}
          title="خطا در بارگذاری سفارش‌ها"
          description={error ?? ""}
          action={
            <Button variant="outline" onClick={handleRetry}>
              تلاش دوباره
            </Button>
          }
        />
      );
    }

    if (orders.length === 0) {
      return (
        <EmptyState
          icon={
            <PackageSearch className="h-10 w-10 text-voxcina-blue dark:text-voxcina-cream" />
          }
          title="سفارشی یافت نشد"
          description={
            hasFilters
              ? "هیچ سفارشی با این مشخصات پیدا نشد. فیلترها را تغییر دهید یا جستجو را پاک کنید."
              : "شما هنوز هیچ سفارشی ثبت نکرده‌اید."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                پاک کردن فیلترها
              </Button>
            ) : undefined
          }
        />
      );
    }

    const paginationNode = (
      <Pagination
        page={pagination?.currentPage ?? 1}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={handlePageChange}
      />
    );

    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={slideUpItem}>
          <Card className="hidden overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-soft backdrop-blur-sm dark:border-voxcina-blue/20 dark:bg-voxcina-blue/10 md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20">
                  <tr>
                    {[
                      "شماره سفارش",
                      "شناسه پرداخت",
                      "تاریخ",
                      "وضعیت",
                      "تعداد محصولات",
                      "مبلغ کل",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="p-4 text-right font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-voxcina-cream/30 bg-white dark:divide-voxcina-blue/20 dark:bg-voxcina-blue/5">
                  {orders.map((order) => (
                    <OrderRow key={order.id} order={order} onOpen={setCurrentOrder} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 bg-voxcina-cream/20 p-4 dark:bg-voxcina-blue/20 sm:flex-row">
              {totalOrders > 0 && (
                <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  نمایش {toPersianNumber(firstItemIndex)} - {toPersianNumber(lastItemIndex)} از{" "}
                  {toPersianNumber(totalOrders)} سفارش
                </span>
              )}
              {paginationNode}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={slideUpItem} className="space-y-3 md:hidden">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onOpen={setCurrentOrder} />
          ))}
          {paginationNode}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 transition-all duration-500 ease-in-out md:px-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="سفارش‌های من" />

        <div className="sm:w-64">
          <Input
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="جستجوی شماره سفارش..."
            aria-label="جستجوی شماره سفارش"
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      <FilterTabs
        tabs={STATUS_TABS}
        value={activeStatus}
        onChange={handleStatusChange}
        label="فیلتر وضعیت سفارش"
        className="mb-6"
      />

      {renderContent()}

      <OrdersGuide className="mt-8" />
    </div>
  );
}
