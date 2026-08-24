"use client";

import { VariantAIMetadata } from "@/types/product";

// Comma-separated list fields stay controlled through raw draft strings held
// by the parent (so trailing commas survive typing) while the canonical
// VariantAIMetadata arrays are updated on every keystroke.
export type VariantAIListField = "season" | "keywords" | "tags" | "occasionTags";

export const VARIANT_AI_LIST_FIELDS: VariantAIListField[] = ["season", "keywords", "tags", "occasionTags"];

export type VariantAIListDrafts = Record<VariantAIListField, string>;

export const emptyVariantAIListDrafts = (): VariantAIListDrafts => ({
  season: "",
  keywords: "",
  tags: "",
  occasionTags: "",
});

export const parseVariantAIList = (raw: string): string[] =>
  raw.split(",").map(s => s.trim()).filter(Boolean);

export const listDraftsFromMetadata = (
  meta?: VariantAIMetadata
): VariantAIListDrafts => ({
  season: (meta?.season || []).join(", "),
  keywords: (meta?.keywords || []).join(", "),
  tags: (meta?.tags || []).join(", "),
  occasionTags: (meta?.occasionTags || []).join(", "),
});

interface VariantAIMetadataEditorProps {
  metadata: VariantAIMetadata;
  listDrafts: VariantAIListDrafts;
  disabled?: boolean;
  /**
   * Receives the raw input value for list fields (parent splits on commas)
   * and the plain value for scalar fields.
   */
  onChange: (field: keyof VariantAIMetadata, value: string) => void;
}

const FIT_TYPE_OPTIONS = [
  { value: "معمولی", label: "معمولی (Regular)" },
  { value: "تنگ", label: "تنگ (Slim)" },
  { value: "گشاد", label: "گشاد (Oversized)" },
];

const GENDER_OPTIONS = ["مردانه", "زنانه", "یونیسکس"];

export default function VariantAIMetadataEditor({
  metadata,
  listDrafts,
  disabled,
  onChange,
}: VariantAIMetadataEditorProps) {
  const fitType = metadata.fitType || "";
  const variantGender = metadata.gender || "";

  const updatedAtLabel = (() => {
    if (!metadata.updatedAt) return "";
    const date = new Date(metadata.updatedAt);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("fa-IR");
  })();

  const hasTechnicalInfo =
    (typeof metadata.confidence === "number" && metadata.confidence > 0) ||
    !!metadata.embeddingModel ||
    !!updatedAtLabel;

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1">نوع محصول (فارسی)</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={metadata.productTypePersian || ""}
            disabled={disabled}
            onChange={e => onChange("productTypePersian", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">نوع محصول (استاندارد)</label>
          <input
            className="input text-sm"
            dir="ltr"
            placeholder="shirt"
            value={metadata.productTypeStandard || ""}
            disabled={disabled}
            onChange={e => onChange("productTypeStandard", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1">جنس (فارسی)</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={metadata.materialPersian || ""}
            disabled={disabled}
            onChange={e => onChange("materialPersian", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">استایل (فارسی)</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={metadata.stylePersian || ""}
            disabled={disabled}
            onChange={e => onChange("stylePersian", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1">طرح (فارسی)</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={metadata.patternPersian || ""}
            disabled={disabled}
            onChange={e => onChange("patternPersian", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">خانواده رنگ</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={metadata.colorFamily || ""}
            disabled={disabled}
            onChange={e => onChange("colorFamily", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1">نوع برازش</label>
          <select
            className="input text-sm"
            value={fitType}
            disabled={disabled}
            onChange={e => onChange("fitType", e.target.value)}
          >
            <option value="">انتخاب کنید</option>
            {fitType && !FIT_TYPE_OPTIONS.some(o => o.value === fitType) && (
              <option value={fitType}>{fitType}</option>
            )}
            {FIT_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block mb-1">جنسیت</label>
          <select
            className="input text-sm"
            value={variantGender}
            disabled={disabled}
            onChange={e => onChange("gender", e.target.value)}
          >
            <option value="">انتخاب کنید</option>
            {variantGender && !GENDER_OPTIONS.includes(variantGender) && (
              <option value={variantGender}>{variantGender}</option>
            )}
            {GENDER_OPTIONS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1">فصل‌ها (با کاما جدا شوند)</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={listDrafts.season}
            disabled={disabled}
            onChange={e => onChange("season", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1">موقعیت‌های استفاده (با کاما جدا شوند)</label>
          <input
            className="input text-sm"
            dir="rtl"
            value={listDrafts.occasionTags}
            disabled={disabled}
            onChange={e => onChange("occasionTags", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block mb-1">کلمات کلیدی این رنگ (با کاما جدا شوند)</label>
        <input
          className="input text-sm"
          dir="rtl"
          value={listDrafts.keywords}
          disabled={disabled}
          onChange={e => onChange("keywords", e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1">برچسب‌های این رنگ (با کاما جدا شوند)</label>
        <input
          className="input text-sm"
          dir="rtl"
          value={listDrafts.tags}
          disabled={disabled}
          onChange={e => onChange("tags", e.target.value)}
        />
      </div>
      {hasTechnicalInfo && (
        <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-2">
          {typeof metadata.confidence === "number" && metadata.confidence > 0 && (
            <span>اطمینان مدل: {Math.round(metadata.confidence * 100)}٪</span>
          )}
          {metadata.embeddingModel && <span>مدل بردار: {metadata.embeddingModel}</span>}
          {updatedAtLabel && <span>آخرین به‌روزرسانی: {updatedAtLabel}</span>}
        </div>
      )}
      <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-2">
        بردار تعبیه این رنگ به‌صورت خودکار توسط سرور مدیریت می‌شود.
      </p>
    </div>
  );
}
