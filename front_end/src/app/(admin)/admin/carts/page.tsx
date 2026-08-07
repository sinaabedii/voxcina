"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  ShoppingBasket,
  Search,
  ChevronRight,
  ChevronLeft,
  Clock,
  Calendar,
  User,
  Phone,
  Trash2,
  SlidersHorizontal,
  Package,
  PackageX,
  Loader2,
  X,
  MessageSquareText,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/input";
import { toast } from "react-toastify";
import { formatPrice } from "@/lib/utils";
import { useCartAdminStore } from "@/store/cart-admin-store";
import { AdminCartFilters, CartRecoverySmsResult } from "@/types/cart-admin";

export default function AdminCartsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "active");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "newest");
  const [onlyWithItems, setOnlyWithItems] = useState(searchParams.get("only_with_items") === "true");

  const { carts, stats, pagination, isLoading, fetchAdminCarts, deleteCart, sendCartRecoverySms, isSendingRecoverySms } =
    useCartAdminStore();

  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryDiscount, setRecoveryDiscount] = useState("10");
  const [recoveryDays, setRecoveryDays] = useState("2");
  const [recoveryResult, setRecoveryResult] = useState<CartRecoverySmsResult | null>(null);

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

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= (pagination?.totalPages || 1)) {
      setCurrentPage(pageNumber);
    }
  };

  const clearFilters = () => {
    setStatusFilter("active");
    setSortBy("newest");
    setOnlyWithItems(false);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleDelete = (cartId: string) => {
    if (window.confirm("آیا از غیرفعال کردن این سبد خرید اطمینان دارید؟")) {
      deleteCart(cartId);
    }
  };

  const openRecoveryModal = () => {
    setRecoveryResult(null);
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
    const result = await sendCartRecoverySms(discountPercent, validDays);
    if (result) {
      setRecoveryResult(result);
      toast.success(`پیامک برای ${result.sent.toLocaleString("fa-IR")} کاربر ارسال شد`);
    }
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
          <span className="relative z-10">سبدهای خرید کاربران</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
        <Button
          variant="primary"
          size="sm"
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white"
          onClick={openRecoveryModal}
        >
          <MessageSquareText className="w-4 h-4 ml-1" />
          ارسال پیامک بازگشت به سبد خرید
        </Button>
      </motion.div>

      {/* Statistics Summary */}
      <motion.div
        className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">کل سبدهای فعال</p>
                  <p className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (stats?.total_carts ?? 0).toLocaleString("fa-IR")}
                  </p>
                </div>
                <div className="p-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl">
                  <ShoppingBasket className="w-6 h-6 text-voxcina-blue dark:text-voxcina-cream" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-green-200 dark:border-green-800/30 shadow-sm rounded-2xl backdrop-blur-sm bg-green-50/90 dark:bg-green-900/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400">دارای کالا</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (stats?.carts_with_items ?? 0).toLocaleString("fa-IR")}
                  </p>
                </div>
                <div className="p-3 bg-green-200/50 dark:bg-green-800/30 rounded-xl">
                  <Package className="w-6 h-6 text-green-700 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-amber-200 dark:border-amber-800/30 shadow-sm rounded-2xl backdrop-blur-sm bg-amber-50/90 dark:bg-amber-900/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">خالی</p>
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (stats?.empty_carts ?? 0).toLocaleString("fa-IR")}
                  </p>
                </div>
                <div className="p-3 bg-amber-200/50 dark:bg-amber-800/30 rounded-xl">
                  <PackageX className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
            placeholder="جستجو بر اساس نام یا شماره موبایل کاربر..."
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
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          variants={itemVariants}
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">وضعیت سبد</h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                    <option value="all">همه</option>
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
                    <option value="newest">جدیدترین فعالیت</option>
                    <option value="oldest">قدیمی‌ترین فعالیت</option>
                    <option value="created_desc">تاریخ ایجاد (جدید به قدیم)</option>
                    <option value="created_asc">تاریخ ایجاد (قدیم به جدید)</option>
                  </select>
                </div>

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

      {/* Carts List */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {carts.length > 0 ? (
          <div className="space-y-4">
            {carts.map((cart) => (
              <motion.div key={cart.id} variants={itemVariants} className="transition-all duration-300">
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
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              cart.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 border border-gray-200 dark:border-gray-800/30"
                            }`}
                          >
                            {cart.is_active ? "فعال" : "غیرفعال"}
                          </span>
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
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <ShoppingBasket className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                سبد خریدی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ سبد خریدی با فیلترهای انتخاب شده یافت نشد
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

      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="ارسال پیامک بازگشت به سبد خرید"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4 leading-relaxed">
          برای همه کاربرانی که سبد خرید فعال و غیرخالی دارند (و کد تخفیف فعال بازگشت به سبد خرید ندارند)، یک
          کد تخفیف اختصاصی برای همان رنگ محصولات موجود در سبدشان ساخته و پیامک می‌شود.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
              درصد تخفیف
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={recoveryDiscount}
              onChange={(e) => setRecoveryDiscount(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
              مدت اعتبار (روز)
            </label>
            <Input
              type="number"
              min={1}
              value={recoveryDays}
              onChange={(e) => setRecoveryDays(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {recoveryResult && (
            <div className="bg-secondary-50 dark:bg-voxcina-blue/10 rounded-xl p-4 text-sm space-y-1">
              <p className="text-green-600 dark:text-green-400">
                ارسال شد: {recoveryResult.sent.toLocaleString("fa-IR")}
              </p>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                رد شد (کد فعال قبلی یا بدون شماره): {recoveryResult.skipped.toLocaleString("fa-IR")}
              </p>
              {recoveryResult.failed > 0 && (
                <p className="text-red-500 dark:text-red-400">
                  ناموفق: {recoveryResult.failed.toLocaleString("fa-IR")}
                </p>
              )}
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
      </Modal>
    </div>
  );
}
