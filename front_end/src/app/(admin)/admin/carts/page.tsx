"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ShoppingBasket,
  Clock,
  Calendar,
  User,
  Phone,
  Trash2,
  Package,
  PackageX,
  Loader2,
  MessageSquareText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { formatPrice } from "@/lib/utils";
import { useCartAdminStore } from "@/store/cart-admin-store";
import { AdminCartFilters, CartRecoverySmsDetail, CartRecoverySmsResult } from "@/types/cart-admin";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminStatCard,
} from "@/components/admin/ui";

const recoveryReasonLabels: Record<string, string> = {
  active_coupon_exists: "کد فعال قبلی",
  not_higher: "درصد جدید بالاتر نیست",
  maximum_active_coupons: "حداکثر کد فعال",
  no_phone: "شماره موبایل ندارد",
  inactive_products: "محصول فعال ندارد",
  user_not_found: "کاربر پیدا نشد",
  coupon_lookup_failed: "خطا در بررسی کدها",
  coupon_save_failed: "خطا در ذخیره کد",
  sms_failed: "خطا در ارسال پیامک",
};

export default function AdminCartsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "active");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "newest");
  const [onlyWithItems, setOnlyWithItems] = useState(searchParams.get("only_with_items") === "true");

  const { carts, stats, pagination, isLoading, error: cartError, fetchAdminCarts, deleteCart, sendCartRecoverySms, isSendingRecoverySms } =
    useCartAdminStore();

  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryDiscount, setRecoveryDiscount] = useState("10");
  const [recoveryDays, setRecoveryDays] = useState("2");
  const [recoveryResult, setRecoveryResult] = useState<CartRecoverySmsResult | null>(null);
  const [recoveryTargetUser, setRecoveryTargetUser] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [recoveryCreatedFrom, setRecoveryCreatedFrom] = useState("");
  const [recoveryCreatedTo, setRecoveryCreatedTo] = useState("");
  const [allowHigherDiscount, setAllowHigherDiscount] = useState(false);
  const [cartToDeactivate, setCartToDeactivate] = useState<string | null>(null);

  const buildFilters = useCallback((): AdminCartFilters => {
    const filters: AdminCartFilters = {};
    if (statusFilter !== "all") filters.status = statusFilter as AdminCartFilters["status"];
    if (searchTerm) filters.search = searchTerm;
    if (sortBy !== "newest") filters.sort_by = sortBy as AdminCartFilters["sort_by"];
    if (onlyWithItems) filters.only_with_items = true;
    return filters;
  }, [statusFilter, searchTerm, sortBy, onlyWithItems]);

  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "active") params.set("status", statusFilter);
    if (sortBy !== "newest") params.set("sort_by", sortBy);
    if (onlyWithItems) params.set("only_with_items", "true");
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    router.replace(`/admin/carts${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router, searchTerm, statusFilter, sortBy, onlyWithItems, currentPage]);

  useEffect(() => {
    const filters = buildFilters();
    fetchAdminCarts(currentPage, 10, filters as unknown as Record<string, any>);
    updateUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, searchTerm, sortBy, onlyWithItems]);

  const clearFilters = () => {
    setStatusFilter("active");
    setSortBy("newest");
    setOnlyWithItems(false);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "active" ||
    sortBy !== "newest" ||
    onlyWithItems ||
    searchTerm !== "";

  const handleDelete = (cartId: string) => {
    setCartToDeactivate(cartId);
  };

  const handleConfirmDeactivate = () => {
    if (cartToDeactivate) {
      deleteCart(cartToDeactivate);
      setCartToDeactivate(null);
    }
  };

  const openRecoveryModal = (targetUser?: { id: string; name: string; phone?: string }) => {
    setRecoveryResult(null);
    setRecoveryTargetUser(targetUser ?? null);
    setAllowHigherDiscount(false);
    if (!targetUser) {
      setRecoveryCreatedFrom("");
      setRecoveryCreatedTo("");
    }
    setIsRecoveryModalOpen(true);
  };

  const handleSendRecoverySms = async () => {
    const discountPercent = parseFloat(recoveryDiscount);
    const validDays = parseInt(recoveryDays, 10);
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      toast.error("درصد تخفیف باید بین ۱ تا ۱۰۰ باشد");
      return;
    }
    if (!validDays || validDays <= 0) {
      toast.error("مدت اعتبار باید حداقل ۱ روز باشد");
      return;
    }
    const result = await sendCartRecoverySms(discountPercent, validDays, {
      userId: recoveryTargetUser?.id,
      createdFrom: recoveryTargetUser ? undefined : recoveryCreatedFrom || undefined,
      createdTo: recoveryTargetUser ? undefined : recoveryCreatedTo || undefined,
    }, allowHigherDiscount);
    if (result) {
      setRecoveryResult(result);
      if (result.sent === 0 && result.failed > 0) {
        toast.error("هیچ پیامکی ارسال نشد؛ جزئیات خطا را بررسی کنید");
      } else if (result.sent === 0) {
        toast.warn("هیچ پیامکی ارسال نشد؛ کاربران ردشده را بررسی کنید");
      } else if (result.skipped > 0 || result.failed > 0) {
        toast.warn(`برای ${result.sent.toLocaleString("fa-IR")} کاربر ارسال شد؛ بخشی از کاربران رد یا ناموفق بودند`);
      } else {
        toast.success(`پیامک برای ${result.sent.toLocaleString("fa-IR")} کاربر ارسال شد`);
      }
    }
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <AdminPageHeader
        title="سبدهای خرید کاربران"
        actions={
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white"
            onClick={() => openRecoveryModal()}
          >
            <MessageSquareText className="w-4 h-4 ml-1" />
            ارسال پیامک بازگشت به سبد خرید
          </Button>
        }
      />

      {/* Statistics Summary */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard
          icon={ShoppingBasket}
          label="کل سبدهای فعال"
          value={(stats?.total_carts ?? 0).toLocaleString("fa-IR")}
          isLoading={isLoading}
        />
        <AdminStatCard
          icon={Package}
          label="دارای کالا"
          value={(stats?.carts_with_items ?? 0).toLocaleString("fa-IR")}
          tone="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          icon={PackageX}
          label="خالی"
          value={(stats?.empty_carts ?? 0).toLocaleString("fa-IR")}
          tone="amber"
          isLoading={isLoading}
        />
      </div>

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجو بر اساس نام یا شماره موبایل کاربر..."
        filterOpen={isFilterOpen}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminField label="وضعیت سبد">
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="all">همه</option>
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
              <option value="newest">جدیدترین فعالیت</option>
              <option value="oldest">قدیمی‌ترین فعالیت</option>
              <option value="created_desc">تاریخ ایجاد (جدید به قدیم)</option>
              <option value="created_asc">تاریخ ایجاد (قدیم به جدید)</option>
            </AdminSelect>
          </AdminField>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-voxcina-blue dark:text-voxcina-cream cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue focus:ring-voxcina-blue/40"
                checked={onlyWithItems}
                onChange={(e) => {
                  setOnlyWithItems(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              فقط سبدهای دارای کالا
            </label>
          </div>
        </div>
      </AdminToolbar>

      {cartError && (
        <AdminError
          message={cartError}
          onRetry={() => fetchAdminCarts(currentPage, 10, buildFilters() as unknown as Record<string, any>)}
        />
      )}

      {/* Carts List */}
      <div>
        {cartError ? null : carts.length > 0 ? (
          <div className="space-y-4">
            {carts.map((cart) => (
              <div key={cart.id} className="transition-all duration-300">
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      {/* Header */}
                      <div className="bg-voxcina-cream/20 dark:bg-voxcina-blue/20 p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center min-w-[140px]">
                            <User className="w-4 h-4 ml-2 text-voxcina-blue dark:text-voxcina-cream/80" />
                            <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {cart.user_name || "کاربر ناشناس"}
                            </span>
                          </div>
                          {cart.user_phone && (
                            <div className="flex items-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              <Phone className="w-4 h-4 ml-1" />
                              <span dir="ltr">{cart.user_phone}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            <Calendar className="w-4 h-4 ml-1" />
                            <span>{cart.jalali_updated_at}</span>
                            <span className="mx-1">|</span>
                            <Clock className="w-4 h-4 ml-1" />
                            <span>
                              {new Date(cart.updated_at).toLocaleTimeString("fa-IR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AdminBadge tone={cart.is_active ? "success" : "neutral"}>
                            {cart.is_active ? "فعال" : "غیرفعال"}
                          </AdminBadge>
                          {cart.is_active && cart.item_count > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-voxcina-blue hover:text-voxcina-darkBlue dark:text-voxcina-cream dark:hover:text-white rounded-xl"
                              onClick={() =>
                                openRecoveryModal({
                                  id: cart.user_id,
                                  name: cart.user_name || "کاربر ناشناس",
                                  phone: cart.user_phone,
                                })
                              }
                            >
                              <MessageSquareText className="w-4 h-4 ml-1" />
                              پیامک
                            </Button>
                          )}
                          {cart.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-xl"
                              onClick={() => handleDelete(cart.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-1" />
                              غیرفعال کردن
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Items */}
                        <div className="lg:col-span-2">
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2 flex items-center">
                            <ShoppingBasket className="w-4 h-4 ml-1" />
                            اقلام سبد ({cart.item_count})
                          </h3>
                          {cart.items.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {cart.items.map((item, idx) => (
                                <div
                                  key={`${item.product_id}-${item.variant?.size}-${item.variant?.color}-${idx}`}
                                  className="flex items-center gap-3 bg-voxcina-cream/10 dark:bg-voxcina-blue/10 rounded-xl p-2"
                                >
                                  {item.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-voxcina-cream dark:bg-voxcina-blue/20 flex items-center justify-center flex-shrink-0">
                                      <Package className="w-5 h-5 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream truncate">
                                      {item.name}
                                    </p>
                                    <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                                      {item.variant?.colorName || item.variant?.color}
                                      {item.variant?.size ? ` / سایز ${item.variant.size}` : ""}
                                      {" · "}
                                      {item.quantity} عدد
                                    </p>
                                  </div>
                                  <div className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream whitespace-nowrap">
                                    {formatPrice(item.price * item.quantity)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-voxcina-blue/50 dark:text-voxcina-cream/50">سبد خرید خالی است</p>
                          )}
                        </div>

                        {/* Summary */}
                        <div>
                          <h3 className="text-sm font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-2">
                            جمع سبد
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-voxcina-blue/80 dark:text-voxcina-cream/80 flex justify-between">
                              <span>جمع کالاها:</span>
                              <span>{formatPrice(cart.summary.subtotal)}</span>
                            </p>
                            <p className="text-voxcina-blue/80 dark:text-voxcina-cream/80 flex justify-between">
                              <span>هزینه ارسال:</span>
                              <span>{formatPrice(cart.summary.shipping)}</span>
                            </p>
                            <p className="text-voxcina-blue/80 dark:text-voxcina-cream/80 flex justify-between">
                              <span>مالیات:</span>
                              <span>{formatPrice(cart.summary.tax)}</span>
                            </p>
                            <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 my-1"></div>
                            <p className="text-voxcina-blue dark:text-voxcina-cream flex justify-between font-semibold">
                              <span>مبلغ کل:</span>
                              <span>{formatPrice(cart.summary.total)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmpty
            icon={ShoppingBasket}
            title="سبد خریدی یافت نشد"
            description="هیچ سبد خریدی با فیلترهای انتخاب شده یافت نشد"
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
        <AdminPagination
          page={currentPage}
          totalPages={pagination?.totalPages ?? 1}
          onChange={setCurrentPage}
        />
      </div>

      <AdminModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="ارسال پیامک بازگشت به سبد خرید"
        size="lg"
      >
        {recoveryTargetUser ? (
          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4 leading-relaxed">
            یک کد تخفیف اختصاصی برای همان رنگ محصولات موجود در سبد این کاربر ساخته و فقط برای او پیامک می‌شود.
          </p>
        ) : (
          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4 leading-relaxed">
            برای همه کاربرانی که سبد خرید فعال و غیرخالی دارند، یک کد تخفیف اختصاصی برای همان رنگ محصولات موجود
            در سبدشان ساخته و پیامک می‌شود. کاربران دارای کد فعال به‌صورت پیش‌فرض رد می‌شوند. با فعال کردن گزینه
            ارسال درصد بالاتر، حداکثر یک کد دوم با درصد بیشتر برای آن‌ها ارسال می‌شود.
          </p>
        )}

        <div className="space-y-4">
          {recoveryTargetUser && (
            <div className="flex items-center justify-between bg-secondary-50 dark:bg-voxcina-blue/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                  {recoveryTargetUser.name}
                </p>
                {recoveryTargetUser.phone && (
                  <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60" dir="ltr">
                    {recoveryTargetUser.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRecoveryTargetUser(null)}
                className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                حذف انتخاب (ارسال به همه)
              </button>
            </div>
          )}

          <AdminField label="درصد تخفیف" required>
            <AdminInput
              type="number"
              min={1}
              max={100}
              value={recoveryDiscount}
              onChange={(e) => setRecoveryDiscount(e.target.value)}
            />
          </AdminField>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-200">
            <input
              type="checkbox"
              checked={allowHigherDiscount}
              onChange={(event) => setAllowHigherDiscount(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-voxcina-blue focus:ring-voxcina-blue/40"
            />
            <span>
              <span className="block font-medium">ارسال کد دوم با درصد بالاتر</span>
              <span className="mt-1 block text-xs opacity-80">
                فقط برای کاربرانی که کد فعال دارند و درصد جدید از کد قبلی بیشتر است؛ حداکثر دو کد فعال نگه داشته می‌شود.
              </span>
            </span>
          </label>
          <AdminField label="مدت اعتبار (روز)" required>
            <AdminInput
              type="number"
              min={1}
              value={recoveryDays}
              onChange={(e) => setRecoveryDays(e.target.value)}
            />
          </AdminField>

          {!recoveryTargetUser && (
            <AdminField label="بازه زمانی ایجاد سبد (اختیاری)">
              <div className="flex items-center gap-2">
                <AdminInput
                  type="date"
                  value={recoveryCreatedFrom}
                  onChange={(e) => setRecoveryCreatedFrom(e.target.value)}
                  className="flex-1"
                />
                <span className="text-voxcina-blue/50 dark:text-voxcina-cream/50 text-sm">تا</span>
                <AdminInput
                  type="date"
                  value={recoveryCreatedTo}
                  onChange={(e) => setRecoveryCreatedTo(e.target.value)}
                  className="flex-1"
                />
              </div>
            </AdminField>
          )}

          {recoveryResult && (
            <div className="space-y-3 rounded-xl bg-secondary-50 p-4 text-sm dark:bg-voxcina-blue/10">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-green-100/70 p-2 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
                  ارسال‌شده: {recoveryResult.sent.toLocaleString("fa-IR")}
                </div>
                <div className="rounded-lg bg-amber-100/70 p-2 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertTriangle className="mx-auto mb-1 h-4 w-4" />
                  ردشده: {recoveryResult.skipped.toLocaleString("fa-IR")}
                </div>
                <div className="rounded-lg bg-red-100/70 p-2 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="mx-auto mb-1 h-4 w-4" />
                  ناموفق: {recoveryResult.failed.toLocaleString("fa-IR")}
                </div>
              </div>
              {recoveryResult.details && recoveryResult.details.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {recoveryResult.details.map((detail: CartRecoverySmsDetail, index) => (
                    <div
                      key={`${detail.user_id}-${detail.reason}-${index}`}
                      className={`rounded-lg border p-2 text-xs ${
                        detail.status === "failed"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300"
                          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{detail.user_name || detail.user_id}</span>
                        <span>{recoveryReasonLabels[detail.reason] || detail.reason}</span>
                      </div>
                      <p>{detail.message}</p>
                    </div>
                  ))}
                </div>
              ) : recoveryResult.errors && recoveryResult.errors.length > 0 ? (
                <div className="max-h-32 space-y-1 overflow-y-auto text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  {recoveryResult.errors.map((message, index) => <p key={`${message}-${index}`}>{message}</p>)}
                </div>
              ) : null}
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white"
            onClick={handleSendRecoverySms}
            disabled={isSendingRecoverySms}
          >
            {isSendingRecoverySms ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "ارسال پیامک"
            )}
          </Button>
        </div>
      </AdminModal>

      {/* Deactivate Cart Confirmation Modal (replaces window.confirm) */}
      <AdminModal
        isOpen={!!cartToDeactivate}
        onClose={() => setCartToDeactivate(null)}
        title="غیرفعال کردن سبد خرید"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="text-red-500 h-5 w-5 shrink-0 mt-0.5" />
          آیا از غیرفعال کردن این سبد خرید اطمینان دارید؟
        </p>
        <AdminModalActions onCancel={() => setCartToDeactivate(null)}>
          <Button
            variant="danger"
            size="sm"
            className="rounded-xl min-w-[80px]"
            onClick={handleConfirmDeactivate}
          >
            بله، غیرفعال کن
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
