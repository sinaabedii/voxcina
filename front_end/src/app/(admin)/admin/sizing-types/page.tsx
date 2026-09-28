"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ruler,
  Sparkles,
  Plus,
  Search,
  SlidersHorizontal,
  Copy,
  Check,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Maximize2,
  Layers,
  HelpCircle,
  Tag,
  ImageIcon,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminModal,
  AdminModalActions,
  AdminTable,
  AdminTh,
  AdminTd,
} from "@/components/admin/ui";
import { SizingType } from "@/types/sizing-type";
import { useSizingTypeStore } from "@/store/sizing-type-store";
import { useAuthStore } from "@/store/auth-store";
import { toPersianNumber } from "@/lib/utils";
import SizingTypeModal from "@/components/admin/sizing-types/SizingTypeModal";

export default function SizingTypesPage() {
  const { adminToken } = useAuthStore();
  const {
    sizingTypes,
    isLoading,
    error,
    fetchAdminSizingTypes,
    deleteSizingType,
    updateSizingType,
  } = useSizingTypeStore();

  // Search & Filter
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"ai" | "manual">("ai");
  const [editingTarget, setEditingTarget] = useState<SizingType | null>(null);

  // Zoom / Preview modal
  const [zoomTarget, setZoomTarget] = useState<SizingType | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<SizingType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick prompt copy feedback map { [id: string]: boolean }
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  // Quick toggle active loading map
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (adminToken) {
      fetchAdminSizingTypes(adminToken);
    }
  }, [adminToken, fetchAdminSizingTypes]);

  // Filtered sizing types
  const filteredTypes = useMemo(() => {
    return sizingTypes.filter((st) => {
      const matchSearch =
        !searchValue.trim() ||
        st.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        st.slug.toLowerCase().includes(searchValue.toLowerCase()) ||
        (st.description &&
          st.description.toLowerCase().includes(searchValue.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && st.is_active) ||
        (statusFilter === "inactive" && !st.is_active);

      return matchSearch && matchStatus;
    });
  }, [sizingTypes, searchValue, statusFilter]);

  // Metrics
  const activeCount = sizingTypes.filter((st) => st.is_active).length;
  const totalMeasurements = sizingTypes.reduce(
    (acc, st) => acc + (st.measurements?.length || 0),
    0
  );

  // Quick prompt copy
  const handleCopyPrompt = async (item: SizingType) => {
    const prompt = item.image_prompt;
    if (!prompt) {
      toast.info("برای این سایزبندی پرامپت تصویری ثبت نشده است");
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedMap((prev) => ({ ...prev, [item.id]: true }));
      toast.success(`پرامپت Nano Banana Pro برای «${item.name}» کپی شد`);
      setTimeout(() => {
        setCopiedMap((prev) => ({ ...prev, [item.id]: false }));
      }, 2500);
    } catch {
      toast.error("امکان کپی در کلیپ‌بورد مقدور نیست");
    }
  };

  // Quick Active toggle
  const handleToggleActive = async (item: SizingType) => {
    if (!adminToken) return;
    setTogglingMap((prev) => ({ ...prev, [item.id]: true }));
    const formData = new FormData();
    formData.append("is_active", String(!item.is_active));

    try {
      await updateSizingType(item.id, formData, adminToken);
    } finally {
      setTogglingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !adminToken) return;
    setIsDeleting(true);
    try {
      const success = await deleteSizingType(deleteTarget.id, adminToken);
      if (success) {
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Page Header */}
      <AdminPageHeader
        title="انواع سایزبندی و راهنمای ابعاد"
        subtitle="تعریف استانداردهای اندازه‌گیری، پرامپت‌های دیاگرام و الگوی سایز محصولات فروشگاه"
        icon={<Ruler className="w-6 h-6 text-voxcina-blue dark:text-voxcina-cream" />}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* AI Generator CTA Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingTarget(null);
                setModalMode("ai");
                setIsFormModalOpen(true);
              }}
              className="rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-voxcina-blue text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all px-4 py-2.5 font-medium"
            >
              <Sparkles className="w-4 h-4 ml-2 text-amber-300 animate-pulse" />
              تولید هوشمند با هوش مصنوعی
            </Button>

            {/* Manual Add Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingTarget(null);
                setModalMode("manual");
                setIsFormModalOpen(true);
              }}
              className="rounded-xl border-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/40 px-3.5 py-2.5"
            >
              <Plus className="w-4 h-4 ml-1.5" />
              افزودن دستی
            </Button>
          </div>
        }
      />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                کل الگوهای سایزبندی
              </p>
              <h3 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream mt-1">
                {toPersianNumber(sizingTypes.length)} نوع لباس
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-voxcina-cream/60 dark:bg-voxcina-blue/30 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                الگوهای فعال و منتشر شده
              </p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {toPersianNumber(activeCount)} فعال
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                متغیرهای اندازه‌گیری تعریف شده
              </p>
              <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {toPersianNumber(totalMeasurements)} متغیر اندازه
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Ruler className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search, Status Filter & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/70 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 text-sm placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/60 shadow-xs"
            placeholder="جستجو بر اساس نام، شناسه لاتین، توضیحات..."
          />
        </div>

        {/* Filter & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Pills */}
          <div className="flex items-center p-1 bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-xl border border-voxcina-cream/60 dark:border-voxcina-blue/40 text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-white dark:bg-voxcina-blue text-voxcina-blue dark:text-voxcina-cream shadow-xs font-bold"
                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue"
              }`}
            >
              همه ({toPersianNumber(sizingTypes.length)})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "active"
                  ? "bg-white dark:bg-voxcina-blue text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-emerald-600"
              }`}
            >
              فعال ({toPersianNumber(activeCount)})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "inactive"
                  ? "bg-white dark:bg-voxcina-blue text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-amber-600"
              }`}
            >
              غیرفعال ({toPersianNumber(sizingTypes.length - activeCount)})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-xl border border-voxcina-cream/60 dark:border-voxcina-blue/40">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-voxcina-blue text-voxcina-blue dark:text-voxcina-cream shadow-xs"
                  : "text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue"
              }`}
              title="نمایش کارتی"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-voxcina-blue text-voxcina-blue dark:text-voxcina-cream shadow-xs"
                  : "text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:text-voxcina-blue"
              }`}
              title="نمایش جدولی"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <AdminError
          message={`خطا در بارگذاری اطلاعات سایزبندی: ${error}`}
          onRetry={() => adminToken && fetchAdminSizingTypes(adminToken)}
        />
      )}

      {/* Loading State */}
      {isLoading && sizingTypes.length === 0 ? (
        <AdminLoading message="در حال بارگذاری استانداردهای سایزبندی..." />
      ) : sizingTypes.length === 0 ? (
        /* Empty State: First Time */
        <AdminEmpty
          icon={Sparkles}
          title="هنوز نوع سایزبندی تعریف نشده است"
          description="با تعریف استانداردهای سایزبندی، امکان استخراج خودکار جدول اندازه لباس‌ها و دیاگرام‌های فنی Nano Banana Pro در محصولات فروشگاه فعال می‌شود."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingTarget(null);
                setModalMode("ai");
                setIsFormModalOpen(true);
              }}
              className="rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-voxcina-blue text-white shadow-md hover:shadow-lg px-5 py-2.5 font-medium mt-2"
            >
              <Sparkles className="w-4 h-4 ml-2 text-amber-300" />
              تولید اولین نوع سایزبندی با هوش مصنوعی
            </Button>
          }
        />
      ) : filteredTypes.length === 0 ? (
        /* Empty State: Search yielded no results */
        <AdminEmpty
          icon={Search}
          title="موردی با این مشخصات یافت نشد"
          description="لطفاً عبارت جستجو یا فیلتر وضعیت انتخابی را تغییر دهید."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchValue("");
                setStatusFilter("all");
              }}
              className="rounded-xl mt-2"
            >
              پاک کردن فیلترها
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        /* 1. Grid View (Luxury Product Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTypes.map((item) => {
            const hasDiagram = Boolean(item.image_path);
            const promptCopied = Boolean(copiedMap[item.id]);
            const isToggling = Boolean(togglingMap[item.id]);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex flex-col bg-white/90 dark:bg-voxcina-blue/20 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30 shadow-xs hover:shadow-md transition-all overflow-hidden"
              >
                {/* Diagram Thumbnail Preview Banner */}
                <div className="relative h-48 w-full bg-voxcina-cream/30 dark:bg-voxcina-blue/40 border-b border-voxcina-cream/50 dark:border-voxcina-blue/30 flex items-center justify-center overflow-hidden">
                  {hasDiagram ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_path}
                        alt={item.name}
                        className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Click to zoom overlay */}
                      <button
                        type="button"
                        onClick={() => setZoomTarget(item)}
                        className="absolute inset-0 bg-voxcina-blue/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[2px]"
                        title="مشاهده بزرگ‌نمایی دیاگرام"
                      >
                        <span className="p-2.5 rounded-full bg-voxcina-blue/80 text-white shadow-md">
                          <Maximize2 className="w-5 h-5" />
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-voxcina-blue/40 dark:text-voxcina-cream/40 p-4 text-center">
                      <ImageIcon className="w-10 h-10 mb-2 stroke-[1.5]" />
                      <span className="text-xs font-medium">بدون دیاگرام تصویری</span>
                      {item.image_prompt && (
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">
                          پرامپت Nano آماده تولید است
                        </span>
                      )}
                    </div>
                  )}

                  {/* Top Badges Floating */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <AdminBadge tone={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "فعال" : "پیش‌نویس"}
                    </AdminBadge>
                    <AdminBadge tone="info">
                      {toPersianNumber(item.measurements?.length || 0)} اندازه
                    </AdminBadge>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-voxcina-blue dark:text-voxcina-cream leading-tight">
                        {item.name}
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-voxcina-cream/60 dark:bg-voxcina-blue/50 text-voxcina-blue/70 dark:text-voxcina-cream/70 shrink-0">
                        {item.slug}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Measurements List Chips */}
                    {item.measurements && item.measurements.length > 0 && (
                      <div className="pt-2">
                        <div className="flex flex-wrap gap-1">
                          {item.measurements.slice(0, 4).map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-voxcina-cream/40 dark:bg-voxcina-blue/40 text-voxcina-blue/80 dark:text-voxcina-cream/80"
                            >
                              {m.label}
                            </span>
                          ))}
                          {item.measurements.length > 4 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-lg text-voxcina-blue/50 dark:text-voxcina-cream/50">
                              +{toPersianNumber(item.measurements.length - 4)} دیگر
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nano Banana Pro Quick Copy Button */}
                  <div className="pt-3 border-t border-voxcina-cream/50 dark:border-voxcina-blue/20">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPrompt(item)}
                      disabled={!item.image_prompt}
                      className={`w-full justify-center rounded-xl text-xs transition-all ${
                        promptCopied
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-300 dark:border-emerald-700"
                          : "border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                      }`}
                    >
                      {promptCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 ml-1.5 text-emerald-500" />
                          پرامپت Nano Banana کپی شد!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 ml-1.5" />
                          کپی پرامپت Nano Banana Pro
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-voxcina-cream/40 dark:border-voxcina-blue/20 text-xs">
                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      disabled={isToggling}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                        item.is_active
                          ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          : "text-voxcina-blue/50 hover:bg-voxcina-cream/40"
                      }`}
                      title={item.is_active ? "کلیک برای غیرفعال‌سازی" : "کلیک برای فعال‌سازی"}
                    >
                      {item.is_active ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>فعال</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>پیش‌نویس</span>
                        </>
                      )}
                    </button>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTarget(item);
                          setModalMode("manual");
                          setIsFormModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/40 transition-colors"
                        title="ویرایش نوع سایزبندی"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="حذف نوع سایزبندی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* 2. Table View */
        <AdminTable
          head={
            <>
              <AdminTh className="w-16">دیاگرام</AdminTh>
              <AdminTh>نام و شناسه لباس</AdminTh>
              <AdminTh>متغیرهای اندازه</AdminTh>
              <AdminTh>پرامپت Nano Banana Pro</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh>ترتیب</AdminTh>
              <AdminTh className="text-left">عملیات</AdminTh>
            </>
          }
        >
          {filteredTypes.map((item) => {
            const promptCopied = Boolean(copiedMap[item.id]);

            return (
              <tr key={item.id} className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20">
                <AdminTd>
                  <div
                    onClick={() => item.image_path && setZoomTarget(item)}
                    className={`w-12 h-12 rounded-xl bg-voxcina-cream/40 dark:bg-voxcina-blue/30 border border-voxcina-cream/60 dark:border-voxcina-blue/30 flex items-center justify-center overflow-hidden shrink-0 ${
                      item.image_path ? "cursor-pointer hover:opacity-80" : ""
                    }`}
                  >
                    {item.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_path}
                        alt={item.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                    )}
                  </div>
                </AdminTd>

                <AdminTd>
                  <div className="font-semibold text-voxcina-blue dark:text-voxcina-cream">
                    {item.name}
                  </div>
                  <div className="text-xs font-mono text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    {item.slug}
                  </div>
                </AdminTd>

                <AdminTd>
                  <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                    {item.measurements?.map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-voxcina-cream/50 dark:bg-voxcina-blue/40 text-voxcina-blue/80 dark:text-voxcina-cream/80"
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>
                </AdminTd>

                <AdminTd>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPrompt(item)}
                    disabled={!item.image_prompt}
                    className="rounded-xl text-xs py-1"
                  >
                    {promptCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 ml-1 text-emerald-500" />
                        کپی شد
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 ml-1" />
                        کپی پرامپت
                      </>
                    )}
                  </Button>
                </AdminTd>

                <AdminTd>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className="cursor-pointer"
                  >
                    <AdminBadge tone={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "فعال" : "پیش‌نویس"}
                    </AdminBadge>
                  </button>
                </AdminTd>

                <AdminTd className="font-mono text-xs">
                  {toPersianNumber(item.display_order ?? 0)}
                </AdminTd>

                <AdminTd className="text-left">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTarget(item);
                        setModalMode("manual");
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/40 transition-colors"
                      title="ویرایش"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </AdminTd>
              </tr>
            );
          })}
        </AdminTable>
      )}

      {/* Sizing Type Add/Edit/AI Modal */}
      <SizingTypeModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingTarget(null);
        }}
        editingSizingType={editingTarget}
        initialMode={modalMode}
        onSuccess={() => {
          if (adminToken) fetchAdminSizingTypes(adminToken);
        }}
      />

      {/* Diagram Zoom Lightbox Modal */}
      {zoomTarget && (
        <AdminModal
          isOpen={Boolean(zoomTarget)}
          onClose={() => setZoomTarget(null)}
          title={`دیاگرام فنی و راهنمای فیت: ${zoomTarget.name}`}
          size="lg"
        >
          <div className="space-y-4" dir="rtl">
            <div className="relative w-full h-80 rounded-2xl bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream dark:border-voxcina-blue/40 p-4 flex items-center justify-center overflow-hidden">
              {zoomTarget.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={zoomTarget.image_path}
                  alt={zoomTarget.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-sm text-voxcina-blue/50">فاقد تصویر دیاگرام</span>
              )}
            </div>

            {zoomTarget.general_fit_guide && (
              <div className="p-4 rounded-xl bg-voxcina-cream/30 dark:bg-voxcina-blue/20 border border-voxcina-cream/60 dark:border-voxcina-blue/30 space-y-1">
                <span className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream block">
                  راهنمای فیت و تناسب لباس:
                </span>
                <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
                  {zoomTarget.general_fit_guide}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyPrompt(zoomTarget)}
                disabled={!zoomTarget.image_prompt}
                className="rounded-xl text-xs"
              >
                <Copy className="w-3.5 h-3.5 ml-1.5" />
                کپی مجدد پرامپت Nano Banana Pro
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setZoomTarget(null)}
                className="rounded-xl"
              >
                بستن پیش‌نمایش
              </Button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <AdminModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="تایید حذف نوع سایزبندی"
          size="sm"
        >
          <div className="space-y-4" dir="rtl">
            <p className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 leading-relaxed">
              آیا از حذف نوع سایزبندی «<span className="font-bold">{deleteTarget.name}</span>» اطمینان دارید؟
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30 leading-relaxed">
              توجه: ارتباط الگوی سایزبندی از محصولات قطع خواهد شد (جدول اندازه‌های ثبت‌شده در محصول باقی می‌ماند).
            </p>

            <AdminModalActions onCancel={() => setDeleteTarget(null)}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? "در حال حذف..." : "تایید و حذف دائمی"}
              </Button>
            </AdminModalActions>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
