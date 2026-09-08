"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Ticket,
  Clock,
  Calendar,
  User,
  Phone,
  Users,
  Percent,
  Tag,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { useAdminVoucherStore } from "@/store/admin-voucher-store";
import {
  AdminVoucher,
  AdminVoucherFilters,
  AdminVoucherType,
  AdminVoucherStatus,
  AdminVoucherStats,
} from "@/types/admin-voucher";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminLoading,
  AdminEmpty,
  AdminPagination,
  AdminStatCard,
  AdminField,
  AdminSelect,
} from "@/components/admin/ui";
import type { AdminStatTone } from "@/components/admin/ui";

const TYPE_LABELS: Record<AdminVoucherType, string> = {
  public: "عمومی",
  targeted: "هدفمند",
  negotiated: "مذاکره‌ای (اتاق پرو)",
  cart_recovery: "بازگشت به سبد خرید",
};

const TYPE_TONES: Record<AdminVoucherType, "info" | "violet" | "warning"> = {
  public: "info",
  targeted: "violet",
  negotiated: "violet",
  cart_recovery: "warning",
};

const STATUS_LABELS: Record<AdminVoucherStatus, string> = {
  active: "فعال",
  scheduled: "زمان‌بندی‌شده",
  expired: "منقضی",
  used: "استفاده‌شده",
  depleted: "تمام‌شده",
};

const STATUS_TONES: Record<AdminVoucherStatus, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  scheduled: "warning",
  expired: "danger",
  used: "neutral",
  depleted: "warning",
};

const STAT_CARDS: { key: keyof AdminVoucherStats; label: string; icon: LucideIcon; tone: AdminStatTone }[] = [
  { key: "total", label: "کل", icon: Ticket, tone: "default" },
  { key: "active", label: "فعال", icon: Percent, tone: "green" },
  { key: "scheduled", label: "زمان‌بندی‌شده", icon: Clock, tone: "amber" },
  { key: "expired", label: "منقضی", icon: Calendar, tone: "red" },
  { key: "used", label: "استفاده‌شده", icon: Tag, tone: "blue" },
  { key: "depleted", label: "تمام‌شده", icon: Package, tone: "violet" },
];

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString("fa-IR")} ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`;
}

function VoucherRow({ voucher }: { voucher: AdminVoucher }) {
  const isPercentage = voucher.discount_type === "percentage";
  const discountLabel = isPercentage
    ? `${voucher.value}٪`
    : `${voucher.value.toLocaleString("fa-IR")} تومان`;

  return (
    <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
      <CardContent className="p-0">
        <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <code className="font-mono font-semibold text-voxcina-blue dark:text-voxcina-cream text-sm tracking-wider bg-white dark:bg-voxcina-blue/20 px-2.5 py-1 rounded-lg border border-voxcina-cream/50 dark:border-voxcina-blue/30">
              {voucher.code}
            </code>
            <AdminBadge tone={TYPE_TONES[voucher.type]}>
              {TYPE_LABELS[voucher.type]}
            </AdminBadge>
            <AdminBadge tone={STATUS_TONES[voucher.status]}>
              {STATUS_LABELS[voucher.status]}
            </AdminBadge>
          </div>
          <div className="flex items-center gap-1.5 text-voxcina-blue dark:text-voxcina-cream font-bold">
            {isPercentage ? <Percent className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
            {discountLabel}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <h3 className="text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-2">هدف</h3>
            {voucher.user_name || voucher.user_phone ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <User className="w-3.5 h-3.5 ml-1.5" />
                  {voucher.user_name || "کاربر ناشناس"}
                </div>
                {voucher.user_phone && (
                  <div className="flex items-center text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    <Phone className="w-3.5 h-3.5 ml-1.5" />
                    <span dir="ltr">{voucher.user_phone}</span>
                  </div>
                )}
              </div>
            ) : voucher.type === "public" ? (
              <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">همه کاربران</span>
            ) : voucher.assigned_user_count ? (
              <div className="flex items-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                <Users className="w-3.5 h-3.5 ml-1.5" />
                {voucher.assigned_user_count.toLocaleString("fa-IR")} کاربر
              </div>
            ) : (
              <span className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50">تعیین‌نشده</span>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-2">اعتبار</h3>
            <div className="space-y-1 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
              {voucher.valid_from && (
                <div className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 ml-1.5" />
                  از {formatDateTime(voucher.valid_from)}
                </div>
              )}
              <div className="flex items-center">
                <Clock className="w-3.5 h-3.5 ml-1.5" />
                تا {formatDateTime(voucher.valid_until)}
              </div>
              {voucher.max_uses ? (
                <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  استفاده: {voucher.used_count?.toLocaleString("fa-IR") || 0} از {voucher.max_uses.toLocaleString("fa-IR")}
                </div>
              ) : null}
              {voucher.min_order_amount ? (
                <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  حداقل خرید: {formatPrice(voucher.min_order_amount)}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-2">محصولات مرتبط</h3>
            {voucher.required_products && voucher.required_products.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {voucher.required_products.map((p, idx) => (
                  <div
                    key={`${p.id}-${idx}`}
                    className="flex items-center gap-1.5 bg-voxcina-cream/10 dark:bg-voxcina-blue/10 rounded-lg p-1.5"
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-white" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-voxcina-cream dark:bg-voxcina-blue/20 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                      </div>
                    )}
                    <span className="text-xs text-voxcina-blue dark:text-voxcina-cream truncate max-w-[90px]">
                      {p.name}
                      {p.color_name ? ` · ${p.color_name}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50">همه محصولات</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminVouchersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "newest");

  const { vouchers, stats, pagination, isLoading, fetchAdminVouchers } = useAdminVoucherStore();

  const buildFilters = useCallback((): AdminVoucherFilters => {
    const filters: AdminVoucherFilters = {};
    if (typeFilter !== "all") filters.type = typeFilter as AdminVoucherFilters["type"];
    if (statusFilter !== "all") filters.status = statusFilter as AdminVoucherFilters["status"];
    if (searchTerm) filters.search = searchTerm;
    if (sortBy !== "newest") filters.sort_by = sortBy as AdminVoucherFilters["sort_by"];
    return filters;
  }, [typeFilter, statusFilter, searchTerm, sortBy]);

  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy !== "newest") params.set("sort_by", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    router.replace(`/admin/vouchers${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router, searchTerm, typeFilter, statusFilter, sortBy, currentPage]);

  useEffect(() => {
    const filters = buildFilters();
    fetchAdminVouchers(currentPage, 20, filters);
    updateUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, typeFilter, statusFilter, searchTerm, sortBy]);

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    typeFilter !== "all" || statusFilter !== "all" || sortBy !== "newest" || searchTerm !== "";

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <AdminPageHeader title="کدهای تخفیف و کوپن‌ها" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map((s) => (
          <AdminStatCard
            key={s.key}
            icon={s.icon}
            label={s.label}
            tone={s.tone}
            isLoading={isLoading}
            value={(stats?.[s.key] ?? 0).toLocaleString("fa-IR")}
          />
        ))}
      </div>

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجو بر اساس کد تخفیف یا نام/شماره کاربر..."
        filterOpen={isFilterOpen}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminField label="نوع کد">
            <AdminSelect
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه</option>
              <option value="public">عمومی</option>
              <option value="targeted">هدفمند</option>
              <option value="negotiated">مذاکره‌ای (اتاق پرو)</option>
              <option value="cart_recovery">بازگشت به سبد خرید</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="وضعیت">
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه</option>
              <option value="active">فعال</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
              <option value="expired">منقضی</option>
              <option value="used">استفاده‌شده</option>
              <option value="depleted">تمام‌شده</option>
            </AdminSelect>
          </AdminField>

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
            </AdminSelect>
          </AdminField>
        </div>
      </AdminToolbar>

      {/* Vouchers List */}
      <div>
        {isLoading && vouchers.length === 0 ? (
          <AdminLoading message="در حال بارگذاری کدهای تخفیف..." />
        ) : vouchers.length > 0 ? (
          <div className="space-y-4">
            {vouchers.map((voucher) => (
              <div key={voucher.id} className="transition-all duration-300">
                <VoucherRow voucher={voucher} />
              </div>
            ))}
          </div>
        ) : (
          <AdminEmpty
            icon={Ticket}
            title="کد تخفیفی یافت نشد"
            description="هیچ کد تخفیف یا کوپنی با فیلترهای انتخاب شده یافت نشد"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                پاک کردن فیلترها
              </Button>
            }
          />
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <AdminPagination
            page={currentPage}
            totalPages={pagination.totalPages}
            onChange={(p) => {
              if (p > 0 && p <= (pagination?.totalPages || 1)) {
                setCurrentPage(p);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
