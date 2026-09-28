"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Ruler,
  HelpCircle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Maximize2,
  Sparkles,
  Info,
  ExternalLink,
  ChevronDown,
  Table as TableIcon,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  AdminTableCard,
  AdminBadge,
  AdminModal,
} from "@/components/admin/ui";
import { SizingType, SizingMeasurementDef } from "@/types/sizing-type";
import { ProductSizeMeasurement, ColorVariant } from "@/types/product";
import { useSizingTypeStore } from "@/store/sizing-type-store";
import { toPersianNumber } from "@/lib/utils";

export interface ProductSizingSectionProps {
  sizingTypeId?: string;
  sizeChart?: ProductSizeMeasurement[];
  colorVariants?: ColorVariant[];
  onChangeSizingTypeId: (id: string) => void;
  onChangeSizeChart: (chart: ProductSizeMeasurement[]) => void;
  adminToken?: string;
}

export default function ProductSizingSection({
  sizingTypeId = "",
  sizeChart = [],
  colorVariants = [],
  onChangeSizingTypeId,
  onChangeSizeChart,
  adminToken,
}: ProductSizingSectionProps) {
  const { sizingTypes, fetchAdminSizingTypes, fetchPublicSizingTypes, isLoading } =
    useSizingTypeStore();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [zoomDiagram, setZoomDiagram] = useState(false);
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);

  // Fetch sizing types on mount if not already loaded
  useEffect(() => {
    if (sizingTypes.length === 0) {
      if (adminToken) {
        fetchAdminSizingTypes(adminToken)
          .then((types) => {
            if (!types || types.length === 0) {
              fetchPublicSizingTypes().catch(() => {});
            }
          })
          .catch(() => {
            fetchPublicSizingTypes().catch(() => {});
          });
      } else {
        fetchPublicSizingTypes().catch(() => {});
      }
    }
  }, [sizingTypes.length, adminToken, fetchAdminSizingTypes, fetchPublicSizingTypes]);

  // Selected sizing type object
  const selectedSizingType = useMemo<SizingType | undefined>(() => {
    if (!sizingTypeId) return undefined;
    return sizingTypes.find((st) => st.id === sizingTypeId);
  }, [sizingTypeId, sizingTypes]);

  // Unique sizes from colorVariants
  const variantSizes = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const cv of colorVariants) {
      if (Array.isArray(cv.sizes)) {
        for (const s of cv.sizes) {
          if (s.size && s.size.trim()) {
            set.add(s.size.trim());
          }
        }
      }
    }
    return Array.from(set);
  }, [colorVariants]);

  // Handle Sizing Type selection
  const handleSelectSizingType = (newId: string) => {
    onChangeSizingTypeId(newId);

    if (!newId) {
      onChangeSizeChart([]);
      return;
    }

    // If sizeChart is currently empty and we have variant sizes, auto-populate rows!
    if (sizeChart.length === 0 && variantSizes.length > 0) {
      const initialChart: ProductSizeMeasurement[] = variantSizes.map((size) => ({
        size,
        values: {},
      }));
      onChangeSizeChart(initialChart);
    }
  };

  // Synchronize size rows with product color variant sizes
  const handleSyncWithVariants = () => {
    if (variantSizes.length === 0) return;

    const existingMap = new Map<string, Record<string, string>>();
    for (const row of sizeChart) {
      existingMap.set(row.size.trim(), row.values || {});
    }

    // Keep existing rows and add missing variant sizes
    const merged: ProductSizeMeasurement[] = [...sizeChart];

    for (const vSize of variantSizes) {
      if (!merged.some((row) => row.size.trim() === vSize)) {
        merged.push({
          size: vSize,
          values: existingMap.get(vSize) || {},
        });
      }
    }

    onChangeSizeChart(merged);
  };

  // Add custom size row
  const handleAddSizeRow = () => {
    onChangeSizeChart([
      ...sizeChart,
      {
        size: `سایز ${toPersianNumber(sizeChart.length + 1)}`,
        values: {},
      },
    ]);
  };

  // Update a row's size label
  const handleUpdateSizeLabel = (rowIndex: number, newSize: string) => {
    const updated = sizeChart.map((row, idx) =>
      idx === rowIndex ? { ...row, size: newSize } : row
    );
    onChangeSizeChart(updated);
  };

  // Update a cell measurement value
  const handleUpdateCellValue = (
    rowIndex: number,
    measurementKey: string,
    value: string
  ) => {
    const updated = sizeChart.map((row, idx) => {
      if (idx !== rowIndex) return row;
      return {
        ...row,
        values: {
          ...(row.values || {}),
          [measurementKey]: value,
        },
      };
    });
    onChangeSizeChart(updated);
  };

  // Remove a size row
  const handleRemoveSizeRow = (rowIndex: number) => {
    onChangeSizeChart(sizeChart.filter((_, idx) => idx !== rowIndex));
  };

  const measurements: SizingMeasurementDef[] = selectedSizingType?.measurements || [];

  return (
    <AdminTableCard className="p-4 md:p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-voxcina-cream/50 dark:bg-voxcina-blue/40 text-voxcina-blue dark:text-voxcina-cream flex items-center justify-center">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-voxcina-blue dark:text-voxcina-cream">
              راهنمای سایز و جدول ابعاد محصول (Size Chart)
            </h2>
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-0.5">
              انتخاب الگوی سایزبندی و درج ابعاد بر اساس سانتی‌متر برای نمایش در صفحه محصول
            </p>
          </div>
        </div>

        <Link
          href="/admin/sizing-types"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream font-medium"
        >
          <span>مدیریت انواع سایزبندی</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Sizing Type Picker Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
          انتخاب نوع سایزبندی
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={sizingTypeId}
            onChange={(e) => handleSelectSizingType(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-voxcina-cream/70 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 px-3.5 py-2.5 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:border-voxcina-blue/60"
          >
            <option value="">— بدون جدول سایزبندی (سایز متغیر ندارد) —</option>
            {sizingTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.slug}) — {toPersianNumber(st.measurements?.length || 0)} اندازه
                {!st.is_active ? " (پیش‌نویس)" : ""}
              </option>
            ))}
          </select>

          {sizingTypeId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectSizingType("")}
              className="rounded-xl shrink-0 text-xs text-red-500 hover:text-red-600 border-red-200"
            >
              حذف جدول سایز
            </Button>
          )}
        </div>
      </div>

      {/* When NO sizing type is selected */}
      {!sizingTypeId && (
        <div className="p-5 rounded-2xl border border-dashed border-voxcina-cream dark:border-voxcina-blue/40 bg-voxcina-cream/10 dark:bg-voxcina-blue/20 text-center space-y-2">
          <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed max-w-md mx-auto">
            با انتخاب یک الگوی سایزبندی، جدول اندازه‌ها بر اساس ابعاد متناسب این دسته از لباس (مانند قد کل، دور سینه، سرشانه و...) فعال می‌شود و راهنمای تصویری دیاگرام برای خریداران به نمایش درمی‌آید.
          </p>
        </div>
      )}

      {/* When a sizing type IS selected */}
      {selectedSizingType && (
        <div className="space-y-6 pt-2">
          {/* Top Banner: Diagram & General Fit Guide Summary */}
          <div className="p-4 rounded-2xl bg-voxcina-cream/20 dark:bg-voxcina-blue/30 border border-voxcina-cream/60 dark:border-voxcina-blue/40 flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Diagram Thumbnail Preview */}
            <div className="relative w-24 h-24 rounded-xl bg-white dark:bg-voxcina-blue/50 border border-voxcina-cream/80 dark:border-voxcina-blue/50 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group">
              {selectedSizingType.image_path ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedSizingType.image_path}
                    alt={selectedSizingType.name}
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomDiagram(true)}
                    className="absolute inset-0 bg-voxcina-blue/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    title="بزرگ‌نمایی دیاگرام فنی"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-1 text-voxcina-blue/40">
                  <Ruler className="w-6 h-6 mx-auto mb-1 stroke-[1.5]" />
                  <span className="text-[10px] block">بدون دیاگرام</span>
                </div>
              )}
            </div>

            {/* General Fit Guide and Info */}
            <div className="space-y-1.5 flex-grow">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                  الگوی انتخابی: {selectedSizingType.name}
                </span>
                <AdminBadge tone="info">
                  {toPersianNumber(measurements.length)} متغیر اندازه
                </AdminBadge>
                {selectedSizingType.image_path && (
                  <button
                    type="button"
                    onClick={() => setZoomDiagram(true)}
                    className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <span>مشاهده دیاگرام خطوط اندازه</span>
                    <Maximize2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {selectedSizingType.general_fit_guide ? (
                <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
                  <span className="font-semibold">راهنمای فیت: </span>
                  {selectedSizingType.general_fit_guide}
                </p>
              ) : (
                <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 italic">
                  توضیح عمومی برای این الگو ثبت نشده است.
                </p>
              )}
            </div>
          </div>

          {/* Size Chart Table Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* View Mode Toggle: Edit vs Preview */}
            <div className="flex items-center p-1 bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-xl border border-voxcina-cream/60 dark:border-voxcina-blue/40 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "edit"
                    ? "bg-white dark:bg-voxcina-blue text-voxcina-blue dark:text-voxcina-cream shadow-xs font-bold"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue"
                }`}
              >
                ویرایش جدول ابعاد
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "preview"
                    ? "bg-white dark:bg-voxcina-blue text-voxcina-blue dark:text-voxcina-cream shadow-xs font-bold"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  پیش‌نمایش خریدار
                </span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {variantSizes.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncWithVariants}
                  className="rounded-xl text-xs border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                  title="سایزهای تعریف‌شده در تنوع رنگ‌ها را وارد جدول می‌کند"
                >
                  <RefreshCw className="w-3 h-3 ml-1.5" />
                  همگام‌سازی با سایزهای تنوع محصول ({toPersianNumber(variantSizes.length)} سایز)
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSizeRow}
                className="rounded-xl text-xs"
              >
                <Plus className="w-3 h-3 ml-1" />
                افزودن ردیف سایز
              </Button>
            </div>
          </div>

          {/* Table Container */}
          {activeTab === "edit" ? (
            /* Mode 1: Edit Mode */
            <div className="overflow-x-auto rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/60 dark:bg-voxcina-blue/20">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-voxcina-cream/40 dark:bg-voxcina-blue/40 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
                    <th className="p-3 font-bold text-voxcina-blue dark:text-voxcina-cream w-28 whitespace-nowrap">
                      سایز
                    </th>

                    {measurements.map((m) => (
                      <th
                        key={m.key}
                        className="p-3 font-semibold text-voxcina-blue dark:text-voxcina-cream whitespace-nowrap min-w-[130px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{m.label}</span>
                          <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                            (cm)
                          </span>
                          {(m.body_guide || m.fit_advice) && (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveTooltipKey(
                                    activeTooltipKey === m.key ? null : m.key
                                  )
                                }
                                className="text-voxcina-blue/40 hover:text-voxcina-blue dark:text-voxcina-cream/40 dark:hover:text-voxcina-cream"
                                title="راهنمای اندازه‌گیری"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* Helper Popover */}
                              {activeTooltipKey === m.key && (
                                <div className="absolute z-30 right-0 top-full mt-1 w-64 p-3 bg-white dark:bg-voxcina-blue rounded-xl shadow-lg border border-voxcina-cream dark:border-voxcina-blue/40 text-xs space-y-1.5 text-right font-normal">
                                  {m.body_guide && (
                                    <div>
                                      <span className="font-bold text-voxcina-blue dark:text-voxcina-cream block">
                                        نحوه اندازه‌گیری بدن:
                                      </span>
                                      <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
                                        {m.body_guide}
                                      </p>
                                    </div>
                                  )}
                                  {m.fit_advice && (
                                    <div className="pt-1 border-t border-voxcina-cream/50 dark:border-voxcina-blue/30">
                                      <span className="font-bold text-voxcina-blue dark:text-voxcina-cream block">
                                        نکات فیت و آزادی دوخت:
                                      </span>
                                      <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
                                        {m.fit_advice}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}

                    <th className="p-3 text-left w-12 whitespace-nowrap">حذف</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/20">
                  {sizeChart.length === 0 ? (
                    <tr>
                      <td
                        colSpan={measurements.length + 2}
                        className="p-8 text-center text-voxcina-blue/50 dark:text-voxcina-cream/50"
                      >
                        هنوز ردیفی به جدول اضافه نشده است. روی دکمه «همگام‌سازی با سایزهای تنوع» یا «افزودن ردیف سایز» کلیک کنید.
                      </td>
                    </tr>
                  ) : (
                    sizeChart.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/30 transition-colors"
                      >
                        {/* Size Name Input */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.size}
                            onChange={(e) =>
                              handleUpdateSizeLabel(rowIdx, e.target.value)
                            }
                            placeholder="مثلاً M"
                            className="w-full text-xs font-bold text-voxcina-blue dark:text-voxcina-cream bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream/80 dark:border-voxcina-blue/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-voxcina-blue/60"
                          />
                        </td>

                        {/* Measurement Cell Inputs */}
                        {measurements.map((m) => (
                          <td key={m.key} className="p-2.5">
                            <input
                              type="text"
                              dir="ltr"
                              value={row.values?.[m.key] || ""}
                              onChange={(e) =>
                                handleUpdateCellValue(rowIdx, m.key, e.target.value)
                              }
                              placeholder="مثلاً 72 یا 70-74"
                              className="w-full text-xs text-center font-mono text-voxcina-blue dark:text-voxcina-cream bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream/80 dark:border-voxcina-blue/40 rounded-lg px-2 py-1.5 focus:outline-none focus:border-voxcina-blue/60 placeholder:font-sans placeholder:text-[10px]"
                            />
                          </td>
                        ))}

                        {/* Delete Row Action */}
                        <td className="p-2.5 text-left">
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeRow(rowIdx)}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="حذف این ردیف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mode 2: Shopper Live Preview */
            <div className="space-y-4 p-5 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  پیش‌نمایش زنده جدول برای مشتریان فروشگاه
                </span>
                <span className="text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  تمامی اعداد بر حسب سانتی‌متر (cm) می‌باشند
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-voxcina-cream/80 dark:border-voxcina-blue/30">
                <table className="w-full text-right text-xs">
                  <thead className="bg-voxcina-cream/30 dark:bg-voxcina-blue/40 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
                    <tr>
                      <th className="p-3 font-bold text-voxcina-blue dark:text-voxcina-cream">
                        سایز
                      </th>
                      {measurements.map((m) => (
                        <th
                          key={m.key}
                          className="p-3 font-semibold text-voxcina-blue dark:text-voxcina-cream text-center"
                        >
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/20">
                    {sizeChart.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white/40 dark:bg-transparent" : "bg-voxcina-cream/10 dark:bg-voxcina-blue/10"}
                      >
                        <td className="p-3 font-bold text-voxcina-blue dark:text-voxcina-cream">
                          {row.size}
                        </td>
                        {measurements.map((m) => (
                          <td
                            key={m.key}
                            className="p-3 text-center font-mono font-medium text-voxcina-blue/90 dark:text-voxcina-cream/90"
                          >
                            {row.values?.[m.key] ? `${row.values[m.key]} cm` : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Diagram preview */}
      {selectedSizingType?.image_path && zoomDiagram && (
        <AdminModal
          isOpen={zoomDiagram}
          onClose={() => setZoomDiagram(false)}
          title={`دیاگرام فنی: ${selectedSizingType.name}`}
          size="lg"
        >
          <div className="space-y-4" dir="rtl">
            <div className="relative w-full h-80 rounded-2xl bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream dark:border-voxcina-blue/40 p-4 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSizingType.image_path}
                alt={selectedSizingType.name}
                className="w-full h-full object-contain"
              />
            </div>
            {selectedSizingType.general_fit_guide && (
              <p className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed bg-voxcina-cream/20 dark:bg-voxcina-blue/20 p-3 rounded-xl">
                {selectedSizingType.general_fit_guide}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoomDiagram(false)}
                className="rounded-xl"
              >
                بستن
              </Button>
            </div>
          </div>
        </AdminModal>
      )}
    </AdminTableCard>
  );
}
