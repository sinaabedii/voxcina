"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Filter,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminActivity {
  id?: string;
  userId?: string;
  userName?: string;
  sessionId?: string;
  activityType?: string;
  pagePath?: string;
  pageTitle?: string;
  productId?: string;
  productName?: string;
  searchQuery?: string;
  searchResults?: number;
  orderId?: string;
  orderValue?: number;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  duration?: number;
  createdAt?: string;
  metadata?: Record<string, any>;
}

// Persian label for each activity type
const activityLabels: Record<string, string> = {
  page_view: "مشاهده صفحه",
  product_view: "مشاهده محصول",
  product_click: "کلیک محصول",
  add_to_cart: "افزودن به سبد",
  remove_from_cart: "حذف از سبد",
  add_to_wishlist: "افزودن به علاقهمندی",
  remove_from_wishlist: "حذف از علاقهمندی",
  search: "جستجو",
  login: "ورود",
  logout: "خروج",
  register: "ثبتنام",
  checkout_started: "شروع تسویه",
  checkout_completed: "تکمیل تسویه",
  order_placed: "ثبت سفارش",
  payment_success: "پرداخت موفق",
  payment_failed: "پرداخت ناموفق",
  category_view: "مشاهده دستهبندی",
  filter_applied: "اعمال فیلتر",
  sort_applied: "اعمال مرتبسازی",
  review_submitted: "ثبت نظر",
  newsletter_subscribe: "عضویت خبرنامه",
  chat_started: "شروع گفتگو",
  chat_message: "پیام گفتگو",
  video_played: "پخش ویدیو",
  image_viewed: "مشاهده تصویر",
  download: "دانلود",
  share: "اشتراکگذاری",
  error: "خطا",
};

const activityTypeOptions = Object.entries(activityLabels).map(([value, label]) => ({
  value,
  label,
}));

const deviceTypeOptions = [
  { value: "", label: "همه دستگاهها" },
  { value: "mobile", label: "موبایل" },
  { value: "tablet", label: "تبلت" },
  { value: "desktop", label: "دسکتاپ" },
];

const deviceIcons: Record<string, string> = {
  mobile: "📱",
  tablet: "📟",
  desktop: "🖥️",
};

// Build a short, human-readable description of an activity record
const describeActivity = (a: AdminActivity): string => {
  switch (a.activityType) {
    case "page_view":
      return a.pagePath || a.pageTitle || "—";
    case "product_view":
    case "product_click":
    case "image_viewed":
      return a.productName || "—";
    case "search":
      return a.searchQuery
        ? `${a.searchQuery}${a.searchResults != null ? ` (${a.searchResults} نتیجه)` : ""}`
        : "—";
    case "order_placed":
    case "payment_success":
    case "payment_failed":
    case "checkout_completed":
      return a.orderId ? `سفارش ${a.orderId}` : "—";
    case "category_view":
      return a.pageTitle || a.pagePath || "—";
    default:
      return a.pageTitle || a.pagePath || "—";
  }
};

const getPaginationItems = (currentPage: number, totalPages: number): Array<number | "ellipsis-left" | "ellipsis-right"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) pages.add(page);
  }

  const visiblePages = [...pages].sort((a, b) => a - b);
  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [];

  visiblePages.forEach((visiblePage, index) => {
    const previousPage = visiblePages[index - 1];
    if (index > 0 && visiblePage - previousPage > 1) {
      items.push(index === 1 ? "ellipsis-left" : "ellipsis-right");
    }
    items.push(visiblePage);
  });

  return items;
};

export default function AdminActivityPage() {
  const { adminToken } = useAuthStore();
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");

  const fetchActivities = useCallback(
    async (currentPage: number) => {
      if (!adminToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(currentPage), limit: "20" });
        if (typeFilter) params.set("types", typeFilter);
        if (deviceFilter) params.set("device_type", deviceFilter);
        const response = await fetch(`/api/admin/activity/logs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch activity logs");
        }
        const data = await response.json();
        setActivities(Array.isArray(data.activities) ? data.activities : []);
        setPage(data.pagination?.page ?? currentPage);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      } catch (err) {
        console.error("Failed to fetch activity logs:", err);
        setError("خطا در بارگذاری لاگ فعالیت کاربران");
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    },
    [adminToken, typeFilter, deviceFilter]
  );

  // Reload from page 1 whenever a filter changes
  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  const paginate = (target: number) => {
    if (target > 0 && target <= totalPages) {
      fetchActivities(target);
    }
  };

  const clearFilters = () => {
    setTypeFilter("");
    setDeviceFilter("");
  };

  return (
    <div className="py-8 md:py-12">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10 flex items-center gap-2">
          <ActivityIcon className="w-7 h-7" />
          لاگ فعالیت کاربران
        </span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Filter className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-voxcina-cream/30 dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
          >
            <option value="">همه انواع فعالیت</option>
            {activityTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1">
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="bg-voxcina-cream/30 dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
          >
            {deviceTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {(typeFilter || deviceFilter) && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
          >
            پاک کردن فیلترها
          </Button>
        )}
      </div>

      {total > 0 && !isLoading && !error && (
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
          تعداد کل رکوردها: <span className="font-semibold">{total.toLocaleString("fa-IR")}</span>
        </p>
      )}

      {isLoading ? (
        <Card className="border border-voxcina-cream/60 dark:border-voxcina-blue/30 shadow-lg rounded-3xl backdrop-blur-sm bg-gradient-to-br from-white/95 to-voxcina-cream/20 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 p-12 max-w-lg mx-auto relative overflow-hidden">
          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-cream/10 mb-4 mx-auto">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-voxcina-blue/20 dark:border-voxcina-cream/20 border-t-voxcina-blue dark:border-t-voxcina-cream"></div>
            </div>
            <p className="text-lg text-voxcina-blue dark:text-voxcina-cream font-medium">در حال بارگذاری لاگ فعالیتها...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="border border-red-200/60 dark:border-red-800/40 shadow-lg rounded-3xl backdrop-blur-sm bg-gradient-to-br from-red-50/95 to-red-100/20 dark:from-red-900/15 dark:to-red-900/5 p-12 max-w-lg mx-auto relative overflow-hidden">
          <div className="text-center relative z-10">
            <h3 className="text-xl font-bold mb-3 text-red-700 dark:text-red-400">خطا در بارگذاری</h3>
            <p className="text-red-600/70 dark:text-red-400/70 mb-8 leading-relaxed">{error}</p>
          </div>
        </Card>
      ) : activities.length === 0 ? (
        <Card className="border border-voxcina-cream/60 dark:border-voxcina-blue/30 shadow-lg rounded-3xl backdrop-blur-sm bg-gradient-to-br from-white/95 to-voxcina-cream/20 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 p-12 max-w-lg mx-auto relative overflow-hidden">
          <div className="text-center relative z-10">
            <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-voxcina-cream">هیچ فعالیتی یافت نشد</h3>
            <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed">
              با فیلترهای انتخاب شده هیچ رویداد فعالیتی ثبت نشده است.
            </p>
          </div>
        </Card>
      ) : (
        <motion.div>
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
              <table className="w-full">
                <thead className="bg-voxcina-cream/50 dark:bg-voxcina-blue/20">
                  <tr>
                    <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">کاربر</th>
                    <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">نوع فعالیت</th>
                    <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">جزئیات</th>
                    <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">دستگاه</th>
                    <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">آیپی</th>
                    <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a, index) => (
                    <motion.tr
                      key={a.id || index}
                      className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/10 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">
                        {a.userName || (a.userId ? "کاربر ناشناس" : "مهمان")}
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        {activityLabels[a.activityType || ""] || a.activityType || "نامشخص"}
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 max-w-xs truncate">
                        {describeActivity(a)}
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        {deviceIcons[a.deviceType || ""] || "—"}{" "}
                        {a.deviceType || "—"}
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 dir-ltr text-left">
                        {a.ipAddress || "—"}
                      </td>
                      <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 whitespace-nowrap">
                        {formatDate(a.createdAt || "")}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-voxcina-cream/50 bg-white/70 p-3 shadow-sm dark:border-voxcina-blue/20 dark:bg-voxcina-blue/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 sm:text-right">
                صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
              </span>
              <div className="flex items-center justify-center gap-1" dir="ltr">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="صفحه اول"
                  className={`rounded-lg px-2 ${
                    page === 1
                      ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                      : "text-voxcina-blue dark:text-voxcina-cream"
                  }`}
                  onClick={() => paginate(1)}
                  disabled={page === 1}
                >
                  <span className="text-xs font-semibold">اول</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="صفحه قبل"
                  className={`rounded-lg px-2 ${
                    page === 1
                      ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                      : "text-voxcina-blue dark:text-voxcina-cream"
                  }`}
                  onClick={() => paginate(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {getPaginationItems(page, totalPages).map((item, index) => item === "ellipsis-left" || item === "ellipsis-right" ? (
                  <span
                    key={`${item}-${index}`}
                    className="flex h-9 min-w-9 items-center justify-center px-1 text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={page === item ? "primary" : "ghost"}
                    size="sm"
                    className={`rounded-lg ${
                      page === item
                        ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                        : "text-voxcina-blue dark:text-voxcina-cream"
                    }`}
                    onClick={() => paginate(item)}
                  >
                    {item.toLocaleString("fa-IR")}
                  </Button>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="صفحه بعد"
                  className={`rounded-lg px-2 ${
                    page === totalPages
                      ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                      : "text-voxcina-blue dark:text-voxcina-cream"
                  }`}
                  onClick={() => paginate(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="صفحه آخر"
                  className={`rounded-lg ${
                    page === totalPages
                      ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                      : "text-voxcina-blue dark:text-voxcina-cream"
                  }`}
                  onClick={() => paginate(totalPages)}
                  disabled={page === totalPages}
                >
                  <span className="text-xs font-semibold">آخر</span>
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
