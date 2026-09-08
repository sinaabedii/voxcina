"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import Button from "@/components/ui/Button";
import {
  Activity as ActivityIcon,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminField,
  AdminSelect,
} from "@/components/admin/ui";

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

  const clearFilters = () => {
    setTypeFilter("");
    setDeviceFilter("");
  };

  return (
    <div className="py-8 md:py-12">
      <AdminPageHeader
        title="لاگ فعالیت کاربران"
        icon={<ActivityIcon className="w-7 h-7" />}
      />

      {/* Filters (no search on this page: type + device only) */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <AdminField label="نوع فعالیت" className="flex-1">
          <AdminSelect
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">همه انواع فعالیت</option>
            {activityTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label="دستگاه" className="flex-1">
          <AdminSelect
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
          >
            {deviceTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        {(typeFilter || deviceFilter) && (
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              پاک کردن فیلترها
            </Button>
          </div>
        )}
      </div>

      {total > 0 && !isLoading && !error && (
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
          تعداد کل رکوردها: <span className="font-semibold">{total.toLocaleString("fa-IR")}</span>
        </p>
      )}

      {isLoading ? (
        <AdminLoading message="در حال بارگذاری لاگ فعالیتها..." />
      ) : error ? (
        <AdminError message={error} />
      ) : activities.length === 0 ? (
        <AdminEmpty
          icon={ActivityIcon}
          title="هیچ فعالیتی یافت نشد"
          description="با فیلترهای انتخاب شده هیچ رویداد فعالیتی ثبت نشده است."
        />
      ) : (
        <div>
          <AdminTable
            head={
              <>
                <AdminTh>کاربر</AdminTh>
                <AdminTh>نوع فعالیت</AdminTh>
                <AdminTh>جزئیات</AdminTh>
                <AdminTh>دستگاه</AdminTh>
                <AdminTh>آیپی</AdminTh>
                <AdminTh>تاریخ</AdminTh>
              </>
            }
          >
            {activities.map((a, index) => (
              <tr
                key={a.id || index}
                className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors"
              >
                <AdminTd className="font-medium whitespace-nowrap">
                  {a.userName || (a.userId ? "کاربر ناشناس" : "مهمان")}
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  {activityLabels[a.activityType || ""] || a.activityType || "نامشخص"}
                </AdminTd>
                <AdminTd className="max-w-xs truncate">
                  {describeActivity(a)}
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  {deviceIcons[a.deviceType || ""] || "—"}{" "}
                  {a.deviceType || "—"}
                </AdminTd>
                <AdminTd className="dir-ltr text-left whitespace-nowrap">
                  {a.ipAddress || "—"}
                </AdminTd>
                <AdminTd className="whitespace-nowrap">
                  {formatDate(a.createdAt || "")}
                </AdminTd>
              </tr>
            ))}
          </AdminTable>

          {totalPages > 1 && (
            <>
              <p className="mt-6 text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
              </p>
              <AdminPagination
                page={page}
                totalPages={totalPages}
                onChange={fetchActivities}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
