"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Users, Loader2 } from "lucide-react";
import {
  NOTIFICATION_TYPES,
  SEGMENT_FIELDS,
  TARGET_TYPES,
  createCampaign,
  previewAudience,
} from "@/lib/notifications-admin-api";

/**
 * ComposePanel — write one notification, pick the audience, see the count
 * BEFORE sending. The count preview is not a nicety: fanning a mistake out to
 * every user writes a row each and cannot be recalled.
 */

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export default function ComposePanel({ onSent }: { onSent: () => void }) {
  const [type, setType] = useState("announcement");
  const [audienceKind, setAudienceKind] = useState<"all" | "segment" | "user">("all");
  const [audienceUser, setAudienceUser] = useState("");
  const [segment, setSegment] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [targetExtra, setTargetExtra] = useState("");
  const [schedule, setSchedule] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetMeta = TARGET_TYPES.find((t) => t.value === targetType);
  const needsObjectId = targetMeta?.needsId === "objectid";
  const showsTargetId = targetMeta?.needsId !== "none" && targetType !== "";

  const runPreview = useCallback(async () => {
    setPreviewing(true);
    setError(null);
    try {
      const count = await previewAudience({
        audience_kind: audienceKind,
        audience_user: audienceKind === "user" ? audienceUser.trim() : undefined,
        segment: audienceKind === "segment" ? segment : undefined,
      });
      setPreviewCount(count);
    } catch (err) {
      setPreviewCount(null);
      setError(err instanceof Error ? err.message : "پیش‌نمایش ناموفق بود");
    } finally {
      setPreviewing(false);
    }
  }, [audienceKind, audienceUser, segment]);

  const send = async () => {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError("عنوان و متن فارسی الزامی است");
      return;
    }
    if (needsObjectId && !OBJECT_ID_RE.test(targetId.trim())) {
      setError("شناسه هدف باید یک شناسه معتبر ۲۴ رقمی باشد");
      return;
    }
    if (audienceKind === "user" && !OBJECT_ID_RE.test(audienceUser.trim())) {
      setError("شناسه کاربر باید یک شناسه معتبر ۲۴ رقمی باشد");
      return;
    }
    setSending(true);
    try {
      await createCampaign(
        {
          audience_kind: audienceKind,
          audience_user: audienceKind === "user" ? audienceUser.trim() : undefined,
          segment: audienceKind === "segment" ? segment : undefined,
        },
        {
          type,
          title: title.trim(),
          body: body.trim(),
          image: image.trim() || undefined,
          target_type: targetType || undefined,
          target_id: targetId.trim() || undefined,
          target_extra: targetExtra.trim() || undefined,
          send_at: schedule ? new Date(schedule).toISOString() : null,
        },
      );
      setType("announcement");
      setTitle("");
      setBody("");
      setImage("");
      setTargetType("");
      setTargetId("");
      setTargetExtra("");
      setSchedule("");
      setPreviewCount(null);
      setSegment({});
      setAudienceKind("all");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت کمپین ناموفق بود");
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 block">
              <span className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                نوع اعلان
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                {NOTIFICATION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 block">
              <span className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                زمان ارسال
              </span>
              <input
                type="datetime-local"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
              عنوان (فارسی)
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="مثلاً: فروش ویژه نوروز"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
              متن (فارسی)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={400}
              rows={3}
              className={inputClass}
              placeholder="متن اعلانی که کاربر در صندوق خود می‌بیند"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
              تصویر (مسیر نسبی آپلود — اختیاری)
            </span>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className={inputClass}
              placeholder="/uploads/campaigns/nowruz.jpg"
            />
          </label>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
              مقصد (لینک اعلان)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 block">
                <span className="block text-xs text-gray-500 dark:text-gray-400">نوع مقصد</span>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    setTargetId("");
                    setTargetExtra("");
                  }}
                  className={inputClass}
                >
                  {TARGET_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {targetMeta?.needsId !== "none" && (
                <label className="space-y-1.5 block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {targetMeta?.needsId === "objectid" ? "شناسه (۲۴ رقمی)" : "شناسه یا متن"}
                  </span>
                  <input
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              {targetType === "product_detail" && (
                <label className="space-y-1.5 block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    رنگ (کد هگز)
                  </span>
                  <input
                    value={targetExtra}
                    onChange={(e) => setTargetExtra(e.target.value)}
                    className={inputClass}
                    placeholder="#1A3C69"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              اعلان مقصد را به‌صورت نام می‌برد، نه آدرس — اپلیکیشن خودش نام را به صفحه ترجمه می‌کند.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">مخاطبان</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "all", label: "همه" },
                { id: "segment", label: "بخشی از کاربران" },
                { id: "user", label: "یک کاربر" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setAudienceKind(option.id);
                  setPreviewCount(null);
                }}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  audienceKind === option.id
                    ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                    : "bg-muted text-voxcina-blue/70 dark:text-voxcina-cream/70"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {audienceKind === "user" && (
            <label className="space-y-1.5 block">
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                شناسه کاربر (۲۴ رقمی)
              </span>
              <input
                value={audienceUser}
                onChange={(e) => {
                  setAudienceUser(e.target.value);
                  setPreviewCount(null);
                }}
                className={inputClass}
                dir="ltr"
              />
            </label>
          )}

          {audienceKind === "segment" && (
            <SegmentBuilder
              value={segment}
              onChange={(next) => {
                setSegment(next);
                setPreviewCount(null);
              }}
            />
          )}

          <button
            type="button"
            onClick={runPreview}
            disabled={previewing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            پیش‌نمایش تعداد مخاطبان
          </button>

          {previewCount !== null && (
            <p className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-center text-sm font-medium text-blue-700 dark:text-blue-300">
              {previewCount.toLocaleString("fa-IR")} کاربر دریافت می‌کنند
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={send}
          disabled={sending || previewCount === null}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-voxcina-blue px-3 py-2.5 text-sm font-medium text-white hover:bg-voxcina-blue/90 disabled:opacity-50 dark:bg-voxcina-cream dark:text-voxcina-blue"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {schedule ? "زمان‌بندی ارسال" : "ارسال در صف"}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ارسال پس از دیدن تعداد مخاطبان فعال می‌شود؛ صف‌بندی به‌صورت گروه‌گروه در پس‌زمینه انجام می‌گیرد.
        </p>
      </div>
    </div>
  );
}

function SegmentBuilder({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [field, setField] = useState(SEGMENT_FIELDS[0].value);
  const meta = SEGMENT_FIELDS.find((f) => f.value === field)!;
  const [fieldValue, setFieldValue] = useState("");

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <div className="flex gap-2">
        <select
          value={field}
          onChange={(e) => {
            setField(e.target.value);
            setFieldValue("");
          }}
          className={inputClass}
        >
          {SEGMENT_FIELDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {meta.kind !== "flag" && (
          <input
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className={inputClass}
            dir="ltr"
            placeholder={meta.kind === "days" ? "۳۰" : ""}
          />
        )}
        <button
          type="button"
          onClick={() => {
            const next = { ...value };
            if (meta.kind === "flag") next[field] = true;
            else if (meta.kind === "days") {
              const days = parseInt(fieldValue, 10);
              if (Number.isFinite(days) && days > 0) next[field] = days;
              else return;
            } else if (fieldValue.trim()) next[field] = fieldValue.trim();
            else return;
            onChange(next);
            setFieldValue("");
          }}
          className="shrink-0 rounded-lg bg-voxcina-blue px-3 text-xs font-medium text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
        >
          افزودن
        </button>
      </div>
      {Object.keys(value).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(value).map(([key, entryValue]) => (
            <span
              key={key}
              className="flex items-center gap-1 rounded-full bg-voxcina-blue/10 px-2.5 py-1 text-[11px] text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream"
            >
              {SEGMENT_FIELDS.find((f) => f.value === key)?.label ?? key}
              {typeof entryValue === "number" || typeof entryValue === "string"
                ? `: ${String(entryValue)}`
                : ""}
              <button
                type="button"
                onClick={() => {
                  const next = { ...value };
                  delete next[key];
                  onChange(next);
                }}
                className="font-bold"
                aria-label="حذف شرط"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
