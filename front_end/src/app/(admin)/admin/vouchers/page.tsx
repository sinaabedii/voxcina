"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Ticket,
  Search,
  ChevronRight,
  ChevronLeft,
  Clock,
  Calendar,
  User,
  Phone,
  Users,
  SlidersHorizontal,
  Loader2,
  X,
  Percent,
  Tag,
  Package,
} from "lucide-react";
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

const TYPE_LABELS: Record<AdminVoucherType, string> = {
  public: "عمومی",
  targeted: "هدفمند",
  negotiated: "مذاکره‌ای (اتاق پرو)",
  cart_recovery: "بازگشت به سبد خرید",
};

const TYPE_BADGE_CLASSES: Record<AdminVoucherType, string> = {
  public: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
  targeted:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/30",
  negotiated:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800/30",
  cart_recovery:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
};

const STATUS_LABELS: Record<AdminVoucherStatus, string> = {
  active: "فعال",
  scheduled: "زمان‌بندی‌شده",
  expired: "منقضی",
  used: "استفاده‌شده",
  depleted: "تمام‌شده",
};

const STATUS_BADGE_CLASSES: Record<AdminVoucherStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800/30",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800/30",
  used: "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800/30",
  depleted:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800/30",
};

const STAT_CARDS: { key: keyof AdminVoucherStats; label: string }[] = [
  { key: "total", label: "کل" },
  { key: "active", label: "فعال" },
  { key: "scheduled", label: "زمان‌بندی‌شده" },
  { key: "expired", label: "منقضی" },
  { key: "used", label: "استفاده‌شده" },
  { key: "depleted", label: "تمام‌شده" },
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
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_BADGE_CLASSES[voucher.type]}`}>
              {TYPE_LABELS[voucher.type]}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE_CLASSES[voucher.status]}`}>
              {STATUS_LABELS[voucher.status]}
            </span>
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

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= (pagination?.totalPages || 1)) {
      setCurrentPage(pageNumber);
    }
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">کدهای تخفیف و کوپن‌ها</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {STAT_CARDS.map((s) => (
          <motion.div key={s.key} variants={itemVariants}>
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
              <CardContent className="p-3">
                <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">{s.label}</p>
                <p className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (stats?.[s.key] ?? 0).toLocaleString("fa-IR")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Search + Filter toggle */}
      <motion.div
        className="mb-6 flex flex-col md:flex-row md:items-center gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
            placeholder="جستجو بر اساس کد تخفیف یا نام/شماره کاربر..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="md:w-auto w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <SlidersHorizontal className="w-4 h-4 ml-1" />
          فیلترها
        </Button>
      </motion.div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <motion.div className="mb-6" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">نوع کد</h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
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
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">وضعیت</h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
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
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">مرتب‌سازی</h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="newest">جدیدترین</option>
                    <option value="oldest">قدیمی‌ترین</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                  onClick={clearFilters}
                >
                  <X className="w-4 h-4 ml-1" />
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Vouchers List */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {vouchers.length > 0 ? (
          <div className="space-y-4">
            {vouchers.map((voucher) => (
              <motion.div key={voucher.id} variants={itemVariants} className="transition-all duration-300">
                <VoucherRow voucher={voucher} />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <Ticket className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                کد تخفیفی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ کد تخفیف یا کوپنی با فیلترهای انتخاب شده یافت نشد
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                پاک کردن فیلترها
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-1 space-x-reverse bg-white dark:bg-voxcina-blue/30 rounded-xl p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === 1
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? "primary" : "ghost"}
                  size="sm"
                  className={`rounded-lg ${
                    currentPage === number
                      ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                      : "text-voxcina-blue dark:text-voxcina-cream"
                  }`}
                  onClick={() => paginate(number)}
                >
                  {number}
                </Button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === pagination.totalPages
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
