"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Volume2, VolumeX } from "lucide-react";
import { AdminError, AdminLoading } from "@/components/admin/ui";
import {
  listTemplates,
  resetTemplate,
  updateTemplate,
  type NotificationTemplate,
} from "@/lib/notifications-admin-api";

/**
 * TemplatesPanel — the effective copy for every event-driven notification.
 * Rows the admin has overridden live in notification_templates (effective
 * immediately); deleting an override falls back to the deployed config file,
 * then to the built-in copy.
 */

const TYPE_LABELS: Record<string, string> = {
  order_placed: "ثبت سفارش",
  order_status_changed: "تغییر وضعیت سفارش",
  payment_succeeded: "پرداخت موفق",
  payment_failed: "پرداخت ناموفق",
  return_decided: "نتیجه مرجوعی",
  ticket_replied: "پاسخ پشتیبانی",
  tryon_reply: "پاسخ اتاق پرو",
  voucher_granted: "اعطای کد تخفیف",
  voucher_expiring: "انقضای کد تخفیف",
  coupon_offer: "پیشنهاد کد تخفیف",
  cart_reminder: "یادآوری سبد خرید",
  price_drop: "کاهش قیمت",
  back_in_stock: "موجود شدن",
  promotion: "پروموشن (کمپین)",
  announcement: "اعلامیه (کمپین)",
};

export default function TemplatesPanel() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, NotificationTemplate>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listTemplates();
      setTemplates(data);
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت قالب‌ها ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchDraft = (template: NotificationTemplate, patch: Partial<NotificationTemplate>) => {
    setDrafts((current) => ({
      ...current,
      [template.type]: { ...template, ...patch },
    }));
  };

  const save = async (template: NotificationTemplate) => {
    setSavingType(template.type);
    setError(null);
    try {
      await updateTemplate(template);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره قالب ناموفق بود");
    } finally {
      setSavingType(null);
    }
  };

  const reset = async (type: string) => {
    setSavingType(type);
    setError(null);
    try {
      await resetTemplate(type);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حذف قالب ناموفق بود");
    } finally {
      setSavingType(null);
    }
  };

  if (isLoading) return <AdminLoading />;
  if (error && templates.length === 0) return <AdminError message={error} onRetry={load} />;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        متغیرها: {"{{order_number}}"}, {"{{status}}"}, {"{{code}}"}, {"{{valid_until}}"},
        {" {{ticket_number}}"}, {"{{product_name}}"}, {"{{decision}}"}
      </p>

      {templates.map((template) => {
        const draft = drafts[template.type] ?? template;
        const dirty = draft.title !== template.title || draft.body !== template.body;
        return (
          <div
            key={template.type}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                {TYPE_LABELS[template.type] ?? template.type}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patchDraft(template, { enabled: !draft.enabled })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    draft.enabled
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {draft.enabled ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" />
                  )}
                  {draft.enabled ? "فعال" : "بی‌صدا"}
                </button>
                <button
                  type="button"
                  onClick={() => save(draft)}
                  disabled={savingType === template.type}
                  className="flex items-center gap-1.5 rounded-lg bg-voxcina-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-voxcina-cream dark:text-voxcina-blue"
                >
                  {savingType === template.type ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  ذخیره
                </button>
                {dirty && (
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((current) => {
                        const next = { ...current };
                        delete next[template.type];
                        return next;
                      })
                    }
                    className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-muted"
                  >
                    انصراف
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => reset(template.type)}
                  disabled={savingType === template.type}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-muted disabled:opacity-50"
                  aria-label="بازگشت به پیش‌فرض"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={draft.title}
                onChange={(e) => patchDraft(template, { title: e.target.value })}
                className={inputClass}
                placeholder="عنوان"
              />
              <input
                value={draft.body}
                onChange={(e) => patchDraft(template, { body: e.target.value })}
                className={inputClass}
                placeholder="متن"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
