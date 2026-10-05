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
  Loader2,
  History,
  Eraser,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import {
  AdminTableCard,
  AdminBadge,
  AdminModal,
} from "@/components/admin/ui";
import {
  SizingType,
  SizingTypeSavedChart,
  SizingMeasurementDef,
} from "@/types/sizing-type";
import { ProductSizeMeasurement, ColorVariant } from "@/types/product";
import { useSizingTypeStore } from "@/store/sizing-type-store";
import { toPersianNumber } from "@/lib/utils";

/** Notice shown when values were loaded from one of a template's saved charts. */
const PRESET_NOTICE_TEXT =
  "مقادیر قبلی این قالب بارگذاری شد؛ می‌توانید ویرایش کنید";

/** Jalali, Persian-digit date (admin convention: toLocaleDateString("fa-IR")). */
const formatSavedChartDate = (dateString?: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("fa-IR");
};

/** Stable identity of a saved-table entry (its save timestamp). */
const savedEntryKey = (entry?: SizingTypeSavedChart): string =>
  String(entry?.updated_at ?? "");

/**
 * Usable saved tables of a template, newest first (backend contract order).
 * Entries without a timestamp or with an empty chart are unusable — they
 * cannot be picked or marked in the chooser.
 */
const getSavedSizeCharts = (type?: SizingType | null): SizingTypeSavedChart[] =>
  (type?.saved_size_charts ?? []).filter(
    (entry) =>
      !!entry?.updated_at &&
      Array.isArray(entry.size_chart) &&
      entry.size_chart.length > 0
  );

/** «جدول ۲ — ۱۴۰۴/۰۷/۱۲ (+ row-count hint)» label for a saved table. */
const savedEntryLabel = (
  entry: SizingTypeSavedChart,
  index: number,
  withCount: boolean
): string => {
  const date = formatSavedChartDate(entry?.updated_at);
  const base = `جدول ${toPersianNumber(index + 1)}${date ? ` — ${date}` : ""}`;
  if (!withCount) return base;
  const rows = Array.isArray(entry?.size_chart) ? entry.size_chart.length : 0;
  return `${base} (${toPersianNumber(rows)} ردیف)`;
};

export interface ProductSizingSectionProps {
  sizingTypeId?: string;
  sizeChart?: ProductSizeMeasurement[];
  colorVariants?: ColorVariant[];
  onChangeSizingTypeId: (id: string) => void;
  onChangeSizeChart: (chart: ProductSizeMeasurement[]) => void;
  adminToken?: string;
  aiModel?: string;
}

export default function ProductSizingSection({
  sizingTypeId = "",
  sizeChart = [],
  colorVariants = [],
  onChangeSizingTypeId,
  onChangeSizeChart,
  adminToken,
  aiModel,
}: ProductSizingSectionProps) {
  const {
    sizingTypes,
    fetchAdminSizingTypes,
    fetchPublicSizingTypes,
    extrapolateSizeChart,
    isLoading,
  } = useSizingTypeStore();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [zoomDiagram, setZoomDiagram] = useState(false);
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const [isExtrapolating, setIsExtrapolating] = useState(false);
  // Set when measurement values were loaded from one of the template's saved
  // size charts — drives the inline, non-error notice near the table.
  const [presetNoticeText, setPresetNoticeText] = useState<string | null>(null);
  // Key of the saved table currently loaded into the chart (marks the loaded
  // entry in the notice/picker). Reset alongside the notice on stale events.
  const [loadedSavedChartKey, setLoadedSavedChartKey] = useState<string | null>(null);

  // Shared stale-state reset: template change/deselect, chart cleared, last
  // row removed, or the AI rewrite — clears both the notice and the marker.
  const resetPresetFeedback = () => {
    setPresetNoticeText(null);
    setLoadedSavedChartKey(null);
  };

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

  // ── Reusable filled size chart (prefill from the template's last save) ─────
  // Row matching: size labels compared after trimming and lowercasing, so
  // a saved "M" matches chart rows "M", "m" and " M ".
  const normalizeSizeKey = (value: unknown): string =>
    String(value ?? "").trim().toLowerCase();

  const rowHasAnyValue = (row: ProductSizeMeasurement): boolean =>
    Object.values(row?.values || {}).some((v) => String(v ?? "").trim() !== "");

  const hasAnyChartValue = (chart: ProductSizeMeasurement[]): boolean =>
    chart.some(rowHasAnyValue);

  // Merge preset values into chart rows. Existing non-empty values are never
  // touched; rows whose size label has no preset counterpart stay empty-valued.
  const applyPresetToRows = (
    preset: ProductSizeMeasurement[],
    rows: ProductSizeMeasurement[]
  ): { rows: ProductSizeMeasurement[]; changed: boolean } => {
    const known = preset
      .filter((p) => p && normalizeSizeKey(p.size))
      .map((p) => ({ key: normalizeSizeKey(p.size), values: p.values || {} }));
    const next = rows.map((row) => {
      if (rowHasAnyValue(row)) return row;
      const match = known.find((p) => p.key === normalizeSizeKey(row?.size));
      if (!match) return row;
      const presetValues: Record<string, string> = {};
      for (const [key, value] of Object.entries(match.values || {})) {
        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        ) {
          presetValues[key] = String(value);
        }
      }
      if (Object.keys(presetValues).length === 0) return row;
      return { ...row, values: presetValues };
    });
    return { rows: next, changed: next.some((row, i) => row !== rows[i]) };
  };

  // Fill `rows` from ONE saved table entry; existing non-empty values are
  // never touched (applyPresetToRows enforces that). Returns true when the
  // chart changed. `markKey=false` keeps the "currently loaded" marker intact
  // (used by auxiliary fills such as the variant sync).
  const tryApplySavedEntry = (
    entry: SizingTypeSavedChart | undefined,
    rows: ProductSizeMeasurement[],
    markKey = true
  ): boolean => {
    if (!entry?.size_chart?.length) return false;
    const { rows: merged, changed } = applyPresetToRows(entry.size_chart, rows);
    if (!changed) return false;
    onChangeSizeChart(merged);
    setPresetNoticeText(PRESET_NOTICE_TEXT);
    if (markKey) setLoadedSavedChartKey(savedEntryKey(entry));
    return true;
  };

  // Clear action for the preset notice: keep the rows, empty every cell; the
  // saved-tables picker stays available for loading a different table.
  const handleClearChartValues = () => {
    onChangeSizeChart(
      sizeChart.map((row) => ({ ...row, values: {} as Record<string, string> }))
    );
    resetPresetFeedback();
  };

  // Seed fresh rows directly from a saved table (size labels + values).
  const seedRowsFromEntry = (
    entry: SizingTypeSavedChart
  ): ProductSizeMeasurement[] =>
    (entry.size_chart || [])
      .filter((p) => p && String(p.size ?? "").trim())
      .map((p) => ({
        size: String(p.size),
        values: Object.fromEntries(
          Object.entries(p.values || {}).filter(
            ([, v]) =>
              v !== null && v !== undefined && String(v).trim() !== ""
          )
        ),
      }));

  // Keep variant-governed seeded rows even when nothing matched (rows stay
  // empty-valued exactly as they would without a saved table).
  const seedRowsWithSavedEntry = (
    entry: SizingTypeSavedChart,
    seededRows: ProductSizeMeasurement[]
  ) => {
    if (!tryApplySavedEntry(entry, seededRows)) {
      onChangeSizeChart(seededRows);
    }
  };

  // No rows and no variant sizes: seed the rows straight from the table.
  const seedChartFromSavedEntry = (entry: SizingTypeSavedChart) => {
    const presetRows = seedRowsFromEntry(entry);
    onChangeSizeChart(presetRows);
    if (presetRows.length > 0 && hasAnyChartValue(presetRows)) {
      setPresetNoticeText(PRESET_NOTICE_TEXT);
      setLoadedSavedChartKey(savedEntryKey(entry));
    }
  };

  // Handle Sizing Type selection
  const handleSelectSizingType = (newId: string) => {
    onChangeSizingTypeId(newId);
    resetPresetFeedback();

    if (!newId) {
      onChangeSizeChart([]);
      return;
    }

    // selectedSizingType still reflects the previous selection in this closure,
    // so resolve the newly chosen template directly from the store list. Its
    // saved_size_charts (admin responses only; absent on the public fallback)
    // may prefill the chart — the NEWEST table loads automatically, and only
    // while the chart contains no measurement values.
    const newType = sizingTypes.find((st) => st.id === newId);
    const newestSaved = getSavedSizeCharts(newType)[0];

    // Rows already exist: keep their order/labels as governed by the variant
    // sync; the table only fills values into an otherwise fully empty chart.
    if (sizeChart.length > 0) {
      if (newestSaved && !hasAnyChartValue(sizeChart)) {
        tryApplySavedEntry(newestSaved, sizeChart);
      }
      return;
    }

    // Empty chart with variant sizes: seed rows from the variant sizes (as
    // today), then fill the values from the newest saved table.
    if (variantSizes.length > 0) {
      const seededRows: ProductSizeMeasurement[] = variantSizes.map((size) => ({
        size,
        values: {},
      }));
      if (newestSaved) {
        seedRowsWithSavedEntry(newestSaved, seededRows);
      } else {
        onChangeSizeChart(seededRows);
      }
      return;
    }

    if (newestSaved) {
      seedChartFromSavedEntry(newestSaved);
    }
  };

  // Picker action: load the admin-chosen saved table into the current chart
  // (same fill rules as the automatic prefill; the picker is only reachable
  // while the chart carries no values, so existing cells are never lost).
  const handleLoadSavedChartEntry = (entry: SizingTypeSavedChart) => {
    if (sizeChart.length > 0) {
      if (hasAnyChartValue(sizeChart)) return;
      tryApplySavedEntry(entry, sizeChart);
      return;
    }

    if (variantSizes.length > 0) {
      seedRowsWithSavedEntry(
        entry,
        variantSizes.map((size) => ({ size, values: {} }))
      );
      return;
    }

    seedChartFromSavedEntry(entry);
  };

  // Synchronize size rows with product color variant sizes
  const handleSyncWithVariants = () => {
    if (variantSizes.length === 0) return;

    const normalize = (value: unknown) => String(value ?? "").trim();

    // Sizes already present in the chart (null-safe: rows can be partially filled)
    const existingSizes = new Set(
      sizeChart.map((row) => normalize(row?.size)).filter(Boolean)
    );

    // Fill the size column with every color-variant size that is still missing
    const missing = variantSizes.filter((vSize) => !existingSizes.has(normalize(vSize)));

    if (missing.length === 0) {
      toast.info("سایزهای جدول از قبل با سایزهای تنوع محصول همگام است");
      return;
    }

    const withMissing = [
      ...sizeChart,
      ...missing.map((size) => ({ size, values: {} as Record<string, string> })),
    ];

    // Rows appended by the sync start empty; when the template has saved
    // tables, matching empty rows are filled from the NEWEST table (existing
    // values are never overwritten). Otherwise unchanged behaviour.
    if (!tryApplySavedEntry(getSavedSizeCharts(selectedSizingType)[0], withMissing)) {
      onChangeSizeChart(withMissing);
    }
    toast.success(
      `${toPersianNumber(missing.length)} سایز از تنوع محصول به جدول ابعاد اضافه شد`
    );
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
    const next = sizeChart.filter((_, idx) => idx !== rowIndex);
    onChangeSizeChart(next);
    if (next.length === 0) resetPresetFeedback();
  };

  // AI Measurement Extrapolation
  const handleExtrapolateMeasurements = async () => {
    if (!selectedSizingType || measurements.length === 0) return;
    if (sizeChart.length === 0) {
      toast.warn("ابتدا حداقل یک ردیف سایز ایجاد کنید");
      return;
    }

    const hasAnyValue = sizeChart.some((row) =>
      Object.values(row.values || {}).some((v) => v && v.trim() !== "")
    );
    if (!hasAnyValue) {
      toast.warn("برای دقت گرادینگ، لطفاً حداقل ابعاد یک سایز پایه را وارد نمایید");
      return;
    }

    setIsExtrapolating(true);
    try {
      const newChart = await extrapolateSizeChart(
        {
          clothing_type: selectedSizingType.name,
          measurements,
          size_chart: sizeChart,
          model: aiModel,
        },
        adminToken
      );

      if (newChart && newChart.length > 0) {
        onChangeSizeChart(newChart);
        // The AI rewrote the cells; the notice and "loaded" marker are stale now.
        resetPresetFeedback();
        toast.success("اندازه‌های خالی بر اساس اصول گرادینگ با موفقیت تکمیل شدند");
      }
    } catch {
      toast.error("خطا در تکمیل خودکار جدول سایزبندی");
    } finally {
      setIsExtrapolating(false);
    }
  };

  const measurements: SizingMeasurementDef[] = selectedSizingType?.measurements || [];

  // Saved-tables strip state: the chooser appears when the template has an
  // archive and the chart is value-less (fresh, cleared, or unmatched).
  const savedChartEntries = getSavedSizeCharts(selectedSizingType);
  const showSavedChartsPicker =
    savedChartEntries.length > 0 && !hasAnyChartValue(sizeChart);
  // The entry currently occupying the chart — shown as a small badge in the
  // notice when something was loaded (auto-prefill or a picker choice).
  let loadedSavedBadge: string | null = null;
  if (loadedSavedChartKey) {
    const loadedIndex = savedChartEntries.findIndex(
      (entry) => savedEntryKey(entry) === loadedSavedChartKey
    );
    if (loadedIndex >= 0) {
      loadedSavedBadge = savedEntryLabel(savedChartEntries[loadedIndex], loadedIndex, false);
    }
  }

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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExtrapolateMeasurements}
                disabled={isExtrapolating || sizeChart.length === 0}
                className="rounded-xl text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 shadow-2xs font-semibold"
                title="تکمیل خودکار مقادیر خالی برای سایر سایزها بر اساس سایزهای وارد شده و استاندارد گرادینگ (۱ تا ۳ سانتی‌متر اختلاف در هر پله سایز)"
              >
                {isExtrapolating ? (
                  <>
                    <Loader2 className="w-3 h-3 ml-1.5 animate-spin text-purple-600 dark:text-purple-400" />
                    در حال تکمیل هوشمند...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 ml-1.5 text-amber-500" />
                    تکمیل هوشمند اندازه‌ها (AI)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Archive strip: loaded-table notice (top) and saved-tables chooser when empty */}
          {(presetNoticeText || showSavedChartsPicker) && (
            <div className="flex flex-col gap-2">
              {/* Loaded notice: subtle, informational — kept until values are cleared */}
              {presetNoticeText && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-sky-700 dark:text-sky-300 font-medium">
                    <History className="w-3.5 h-3.5 shrink-0" />
                    {presetNoticeText}
                    {loadedSavedBadge && (
                      <span className="rounded-md bg-sky-100/80 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-700/50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:text-sky-200">
                        {loadedSavedBadge}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearChartValues}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700/80 dark:text-sky-400/80 hover:text-sky-700 dark:hover:text-sky-300 transition-colors shrink-0"
                  >
                    <Eraser className="w-3 h-3" />
                    پاک کردن مقادیر
                  </button>
                </div>
              )}

              {/* Saved-tables chooser: reachable whenever the chart is value-less */}
              {showSavedChartsPicker && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60">
                  <span className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-300 shrink-0">
                    <History className="w-3.5 h-3.5 shrink-0" />
                    بارگذاری جدول ذخیره‌شده
                  </span>
                  <select
                    value=""
                    onChange={(e) => {
                      const picked = savedChartEntries.find(
                        (entry) => savedEntryKey(entry) === e.target.value
                      );
                      if (picked) handleLoadSavedChartEntry(picked);
                    }}
                    className="flex-1 min-w-[200px] rounded-lg border border-sky-200 dark:border-sky-800/60 bg-white/90 dark:bg-voxcina-blue/40 px-2.5 py-1.5 text-xs text-voxcina-blue dark:text-voxcina-cream focus:outline-none"
                  >
                    <option value="">انتخاب از آرشیو این قالب…</option>
                    {savedChartEntries.map((entry, idx) => (
                      <option
                        key={`${savedEntryKey(entry) || "saved"}-${idx}`}
                        value={savedEntryKey(entry)}
                      >
                        {savedEntryLabel(entry, idx, true)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Table Container */}
          {activeTab === "edit" ? (
            /* Mode 1: Edit Mode */
            <div className="overflow-x-auto rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 bg-white/60 dark:bg-voxcina-blue/20">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-voxcina-cream/40 dark:bg-voxcina-blue/40 border-b border-voxcina-cream/60 dark:border-voxcina-blue/30">
                    <th className="p-3 font-bold text-voxcina-blue dark:text-voxcina-cream w-28 min-w-[120px] whitespace-nowrap">
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
                            className="w-full min-w-[88px] text-xs font-bold text-voxcina-blue dark:text-voxcina-cream bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream/80 dark:border-voxcina-blue/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-voxcina-blue/60"
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
                        <td className="p-3 font-bold text-voxcina-blue dark:text-voxcina-cream whitespace-nowrap">
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
