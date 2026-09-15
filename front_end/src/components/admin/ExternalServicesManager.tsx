"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Cable,
  Check,
  Copy,
  Eye,
  FileClock,
  KeyRound,
  Link2,
  PlugZap,
  RefreshCcw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import Button from "@/components/ui/Button";
import {
  AdminBadge,
  AdminEmpty,
  AdminError,
  AdminField,
  AdminFormGrid,
  AdminInput,
  AdminModal,
  AdminModalActions,
  AdminPageHeader,
  AdminStatCard,
  AdminSelect,
  AdminTableCard,
  AdminTd,
  AdminTh,
  type AdminBadgeTone,
} from "@/components/admin/ui";
import { useAuthStore } from "@/store/auth-store";

// ---------------------------------------------------------------------------
// Types mirroring handlers/external_services_admin.go responses
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { value: "telegram", label: "تلگرام" },
  { value: "bale", label: "بله" },
  { value: "instagram", label: "اینستاگرام" },
] as const;

const SCOPES = [
  { value: "identity:exchange", label: "تبادل هویت (صدور توکن)" },
  { value: "identity:bind_phone", label: "اتصال شماره موبایل" },
] as const;

const PHONE_METHODS = [
  { value: "telegram_contact", label: "اشتراک مخاطب تلگرام/بله" },
  { value: "sms_otp", label: "کد پیامکی (همیشه فعال است)" },
] as const;

const WEBHOOK_EVENTS = [
  { value: "payment.paid", label: "پرداخت موفق" },
  { value: "payment.failed", label: "پرداخت ناموفق" },
  { value: "order.status_changed", label: "تغییر وضعیت سفارش" },
  { value: "return_request.decided", label: "تصمیم درخواست مرجوعی" },
  { value: "identity.merged", label: "ادغام حساب‌ها" },
] as const;

const providerLabel = (p: string) => PROVIDERS.find(x => x.value === p)?.label ?? p;
const scopeLabel = (s: string) => SCOPES.find(x => x.value === s)?.label ?? s;
const methodLabel = (m: string) => PHONE_METHODS.find(x => x.value === m)?.label ?? m;
const eventLabel = (e: string) => WEBHOOK_EVENTS.find(x => x.value === e)?.label ?? e;

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fa-IR");
}

interface ServiceWebhook {
  url: string;
  events: string[];
  active: boolean;
  has_secret: boolean;
}

interface ExternalServiceView {
  id: string;
  name: string;
  provider: string;
  status: string;
  scopes: string[];
  phone_methods?: string[];
  key_prefix: string;
  key_last4: string;
  previous_key_expires_at?: string | null;
  webhook?: ServiceWebhook | null;
  webhook_failure_count?: number;
  created_at: string;
  updated_at: string;
  last_used_at?: string | null;
  created_by?: string;
  identity_count?: number;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

/** A read-only, LTR chip for key prefixes and identifiers. */
function MonoChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      dir="ltr"
      className="inline-block rounded-lg bg-voxcina-cream/60 dark:bg-voxcina-blue/30 px-2 py-0.5 font-mono text-xs text-voxcina-blue dark:text-voxcina-cream"
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, AdminBadgeTone> = {
  active: "success",
  disabled: "neutral",
};

/** Copy-to-clipboard with a transient check mark. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("کپی خودکار ممکن نبود؛ مقدار را دستی کپی کنید");
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      className="rounded-xl shrink-0"
      aria-label={`کپی ${label}`}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

/**
 * One-time secret display. The plaintext key / webhook secret is shown here
 * exactly once — the backend stores only a SHA-256 hash and refuses to ever
 * return it again — so this dialog demands an explicit acknowledgment before
 * it can be dismissed.
 */
function OneTimeSecretDialog({
  isOpen,
  onClose,
  title,
  secrets,
  onContinue,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  secrets: { label: string; hint: string; value: string }[];
  onContinue: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (isOpen) setConfirmed(false);
  }, [isOpen]);
  // The acknowledgment gates the continue button so the dialog is read, not
  // clicked through. (X/Escape still dismiss — the backend enforces the real
  // guarantee by never showing the value again; recovery is a key rotation.)
  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={title} size="lg" >
      <div className="space-y-4">
        {secrets.map(secret => (
          <div
            key={secret.label}
            className="rounded-xl border border-amber-300 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/10 p-4"
          >
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
              {secret.label}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mb-3 leading-6">
              {secret.hint}
            </p>
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 overflow-x-auto rounded-lg bg-white dark:bg-voxcina-blue/40 px-3 py-2 font-mono text-xs text-voxcina-blue dark:text-voxcina-cream whitespace-nowrap"
              >
                {secret.value}
              </code>
              <CopyButton text={secret.value} label={secret.label} />
            </div>
          </div>
        ))}
        <label className="flex items-start gap-2 text-sm text-voxcina-blue dark:text-voxcina-cream cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
          />
          <span>کلید را در جای امنی ذخیره کردم و می‌دانم بعداً قابل مشاهده نیست.</span>
        </label>
      </div>
      <AdminModalActions
        onCancel={onContinue}
        cancelLabel={confirmed ? "متوجه شدم، ادامه" : "برای ادامه تیک تأیید را بزنید"}
      >
        <span className="hidden" aria-hidden />
      </AdminModalActions>
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

const EMPTY_CREATE = {
  name: "",
  provider: "",
  scopes: ["identity:exchange"] as string[],
  phoneMethods: [] as string[],
};

function CreateServiceDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (service: ExternalServiceView, apiKey: string, webhookSecret?: string) => void;
}) {
  const { adminToken } = useAuthStore();
  const [form, setForm] = useState(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(EMPTY_CREATE);
  }, [isOpen]);

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const submit = async () => {
    if (!adminToken) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/external-services", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          provider: form.provider,
          scopes: form.scopes,
          ...(form.provider === "telegram" || form.provider === "bale"
            ? { phone_methods: form.phoneMethods.filter(m => m !== "sms_otp") }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در ایجاد سرویس");
      onCreated(data as ExternalServiceView, data.api_key as string, data.webhook_secret as string | undefined);
      setForm(EMPTY_CREATE);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ایجاد سرویس");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title="سرویس خارجی جدید" size="lg">
      <div className="space-y-4">
        <AdminField label="نام سرویس" required hint="مثلاً «ربات اصلی تلگرام» — باید یکتا باشد.">
          <AdminInput
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ربات اصلی تلگرام"
            maxLength={120}
          />
        </AdminField>

        <AdminField
          label="پلتفرم"
          required
          hint="پس از ایجاد قابل تغییر نیست؛ سرویس و همه هویت‌های آن به همین پلتفرم گره می‌خورند."
        >
          <AdminSelect
            value={form.provider}
            onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
          >
            <option value="">انتخاب کنید…</option>
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </AdminSelect>
        </AdminField>

        <div>
          <p className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
            دسترسی‌ها <span className="text-red-500">*</span>
          </p>
          <div className="space-y-2">
            {SCOPES.map(scope => (
              <label key={scope.value} className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
                  checked={form.scopes.includes(scope.value)}
                  onChange={() => setForm(f => ({ ...f, scopes: toggleInList(f.scopes, scope.value) }))}
                />
                {scope.label}
              </label>
            ))}
          </div>
        </div>

        {(form.provider === "telegram" || form.provider === "bale") && (
          <div>
            <p className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
              روش تأیید شماره
            </p>
            <div className="space-y-2">
              {PHONE_METHODS.filter(m => m.value !== "sms_otp").map(method => (
                <label key={method.value} className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
                    checked={form.phoneMethods.includes(method.value)}
                    onChange={() =>
                      setForm(f => ({ ...f, phoneMethods: toggleInList(f.phoneMethods, method.value) }))
                    }
                  />
                  {method.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-1">
              کد پیامکی همیشه مجاز است و لازم نیست انتخاب شود.
            </p>
          </div>
        )}

        <AdminModalActions
          onCancel={onClose}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            isLoading={saving}
            disabled={saving || !form.name.trim() || !form.provider || form.scopes.length === 0}
            className="rounded-xl"
          >
            ایجاد سرویس و کلید
          </Button>
        </AdminModalActions>
      </div>
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// Edit dialog (also configures the webhook)
// ---------------------------------------------------------------------------

interface EditFormState {
  name: string;
  status: string;
  scopes: string[];
  phoneMethods: string[];
  webhookUrl: string;
  webhookEvents: string[];
  webhookActive: boolean;
}

function toEditForm(service: ExternalServiceView): EditFormState {
  return {
    name: service.name,
    status: service.status,
    scopes: service.scopes ?? [],
    phoneMethods: service.phone_methods ?? [],
    webhookUrl: service.webhook?.url ?? "",
    webhookEvents: service.webhook?.events ?? [],
    webhookActive: service.webhook?.active ?? true,
  };
}

function EditServiceDialog({
  isOpen,
  onClose,
  service,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ExternalServiceView | null;
  onSaved: (service: ExternalServiceView) => void;
}) {
  const { adminToken } = useAuthStore();
  // The dialog only renders when a service is set, so the initial value is a
  // placeholder that the effect immediately replaces with the real form.
  const [form, setForm] = useState<EditFormState>(() => ({
    name: "",
    status: "active",
    scopes: [],
    phoneMethods: [],
    webhookUrl: "",
    webhookEvents: [],
    webhookActive: true,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) setForm(toEditForm(service));
  }, [service, isOpen]);

  if (!service) return null;

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const submit = async () => {
    if (!adminToken || !service) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        status: form.status,
        scopes: form.scopes,
        phone_methods: form.phoneMethods,
        webhook: {
          url: form.webhookUrl.trim(),
          events: form.webhookEvents,
          active: form.webhookActive,
        },
      };
      const response = await fetch(`/api/admin/external-services/${service.id}`, {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در ذخیره تغییرات");
      if (data?.webhook_secret) {
        toast.success("تنظیمات ذخیره شد؛ رمز امضای وب‌هوک جدید در گفتگوی بعدی نمایش داده می‌شود", { duration: 5000 });
      } else {
        toast.success("تنظیمات ذخیره شد");
      }
      onSaved(data as ExternalServiceView);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ذخیره تغییرات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={`ویرایش «${service.name}»`} size="lg">
      <div className="space-y-4">
        <AdminFormGrid>
          <AdminField label="نام سرویس" required>
            <AdminInput
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={120}
            />
          </AdminField>
          <AdminField label="وضعیت" hint="سرویس غیرفعال اجازه احراز هویت ندارد.">
            <AdminSelect
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="active">فعال</option>
              <option value="disabled">غیرفعال</option>
            </AdminSelect>
          </AdminField>
        </AdminFormGrid>

        <div>
          <p className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
            دسترسی‌ها
          </p>
          <div className="space-y-2">
            {SCOPES.map(scope => (
              <label key={scope.value} className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
                  checked={form.scopes.includes(scope.value)}
                  onChange={() => setForm(f => ({ ...f, scopes: toggleInList(f.scopes, scope.value) }))}
                />
                {scope.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
            روش تأیید شماره
          </p>
          <div className="space-y-2">
            {PHONE_METHODS.map(method => (
              <label
                key={method.value}
                className={`flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 ${method.value === "sms_otp" ? "opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
                  disabled={method.value === "sms_otp"}
                  checked={method.value === "sms_otp" || form.phoneMethods.includes(method.value)}
                  onChange={() =>
                    setForm(f => ({ ...f, phoneMethods: toggleInList(f.phoneMethods, method.value) }))
                  }
                />
                {method.label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 p-4 space-y-4 bg-voxcina-cream/30 dark:bg-voxcina-blue/10">
          <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
            <Cable className="w-4 h-4" /> وب‌هوک رویدادها
          </p>
          <AdminField
            label="آدرس وب‌هوک (اختیاری)"
            hint="باید با https:// شروع شود. اولین پیکربندی، یک رمز امضا یک‌بار‌مصرف تولید می‌کند."
          >
            <AdminInput
              dir="ltr"
              value={form.webhookUrl}
              onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
              placeholder="https://bot.example.com/webhooks/voxcina"
            />
          </AdminField>
          <div>
            <p className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
              رویدادها
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map(event => (
                <label key={event.value} className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
                    checked={form.webhookEvents.includes(event.value)}
                    onChange={() =>
                      setForm(f => ({ ...f, webhookEvents: toggleInList(f.webhookEvents, event.value) }))
                    }
                  />
                  {event.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-voxcina-blue/30 accent-voxcina-blue"
              checked={form.webhookActive}
              onChange={e => setForm(f => ({ ...f, webhookActive: e.target.checked }))}
            />
            وب‌هوک فعال باشد
          </label>
        </div>

        <AdminModalActions onCancel={onClose}>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            isLoading={saving}
            disabled={saving || !form.name.trim() || form.scopes.length === 0}
            className="rounded-xl"
          >
            ذخیره تغییرات
          </Button>
        </AdminModalActions>
      </div>
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// Rotate key dialog
// ---------------------------------------------------------------------------

function RotateKeyDialog({
  isOpen,
  onClose,
  service,
  onRotated,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ExternalServiceView | null;
  onRotated: (service: ExternalServiceView, apiKey: string) => void;
}) {
  const { adminToken } = useAuthStore();
  const [saving, setSaving] = useState(false);

  if (!service) return null;

  const submit = async () => {
    if (!adminToken || !service) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/external-services/${service.id}/rotate-key`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در چرخش کلید");
      onRotated(data as ExternalServiceView, data.api_key as string);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در چرخش کلید");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={`چرخش کلید «${service.name}»`}>
      <div className="space-y-3 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 leading-6">
        <p>
          کلید جدید ساخته می‌شود و کلید فعلی تا <strong>۲۴ ساعت</strong> دیگر هم کار می‌کند
          (پنجره برای به‌روزرسانی سرور ربات). کلید جدید فقط یک‌بار نمایش داده می‌شود.
        </p>
        <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
          کلید فعلی: <MonoChip>{service.key_prefix}…{service.key_last4}</MonoChip>
        </p>
      </div>
      <AdminModalActions onCancel={onClose}>
        <Button variant="primary" size="sm" onClick={submit} isLoading={saving} disabled={saving} className="rounded-xl">
          ساخت کلید جدید
        </Button>
      </AdminModalActions>
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// Delete dialog
// ---------------------------------------------------------------------------

function DeleteServiceDialog({
  isOpen,
  onClose,
  service,
  onDeleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ExternalServiceView | null;
  onDeleted: () => void;
}) {
  const { adminToken } = useAuthStore();
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setConfirmText("");
  }, [isOpen, service]);

  if (!service) return null;

  const submit = async () => {
    if (!adminToken || !service) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/external-services/${service.id}`, {
        method: "DELETE",
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در حذف سرویس");
      toast.success("سرویس حذف شد");
      onDeleted();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در حذف سرویس");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={`حذف «${service.name}»`}>
      <div className="space-y-4 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 leading-6">
        <p>
          این سرویس برای همیشه حذف می‌شود و هرگز نمی‌تواند دوباره احراز هویت کند. کاربران
          متصل از طریق این سرویس دسترسی خود را از دست می‌دهند.
        </p>
        <AdminField
          label={`برای تأیید، نام سرویس را وارد کنید: ${service.name}`}
          required
        >
          <AdminInput
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={service.name}
          />
        </AdminField>
      </div>
      <AdminModalActions onCancel={onClose}>
        <Button
          variant="danger"
          size="sm"
          onClick={submit}
          isLoading={saving}
          disabled={saving || confirmText.trim() !== service.name}
          className="rounded-xl"
        >
          حذف قطعی
        </Button>
      </AdminModalActions>
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// Webhook test + identities + audit dialogs
// ---------------------------------------------------------------------------

interface IdentityRow {
  id: string;
  external_id: string;
  user_id: string;
  status: string;
  linked_via: string;
  linked_at: string;
  last_seen_at?: string | null;
  profile?: Record<string, unknown> | null;
}

function IdentitiesDialog({
  isOpen,
  onClose,
  service,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ExternalServiceView | null;
}) {
  const { adminToken } = useAuthStore();
  const [identities, setIdentities] = useState<IdentityRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!adminToken || !service) return;
    setError("");
    setIdentities(null);
    try {
      const response = await fetch(`/api/admin/external-services/${service.id}/identities`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در دریافت هویت‌ها");
      setIdentities(data.identities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت هویت‌ها");
    }
  }, [adminToken, service]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!service) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={`هویت‌های متصل «${service.name}»`} size="lg">
      {error && <AdminError message={error} onRetry={load} />}
      {identities === null && !error && (
        <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 py-6 text-center">در حال بارگذاری…</p>
      )}
      {identities !== null && identities.length === 0 && (
        <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 py-6 text-center">
          هنوز هیچ حساب متصلی از طریق این سرویس ثبت نشده است.
        </p>
      )}
      {identities !== null && identities.length > 0 && (
        <div className="max-h-96 overflow-y-auto rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30">
          <table className="w-full text-sm">
            <thead className="bg-voxcina-cream/40 dark:bg-voxcina-blue/20 sticky top-0">
              <tr>
                <AdminTh>شناسه خارجی</AdminTh>
                <AdminTh>وضعیت</AdminTh>
                <AdminTh>اتصال</AdminTh>
                <AdminTh>آخرین فعالیت</AdminTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/10">
              {identities.map(identity => (
                <tr key={identity.id}>
                  <AdminTd><MonoChip>{identity.external_id}</MonoChip></AdminTd>
                  <AdminTd>
                    <AdminBadge tone={identity.status === "active" ? "success" : "neutral"}>
                      {identity.status === "active" ? "فعال" : "لغو شده"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>{identity.linked_via}</AdminTd>
                  <AdminTd>{formatDateTime(identity.last_seen_at ?? identity.linked_at)}</AdminTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminModal>
  );
}

interface AuditEntry {
  action: string;
  detail?: string;
  admin_name?: string;
  created_at: string;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "ایجاد سرویس",
  updated: "ویرایش تنظیمات",
  deleted: "حذف سرویس",
  key_rotated: "چرخش کلید",
};

function AuditDialog({
  isOpen,
  onClose,
  service,
}: {
  isOpen: boolean;
  onClose: () => void;
  service: ExternalServiceView | null;
}) {
  const { adminToken } = useAuthStore();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!adminToken || !service) return;
    setError("");
    setEntries(null);
    try {
      const response = await fetch(`/api/admin/external-services/${service.id}/audit`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در دریافت سابقه");
      setEntries(data.audit ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت سابقه");
    }
  }, [adminToken, service]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!service) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={`سابقه تغییرات «${service.name}»`} size="lg">
      {error && <AdminError message={error} onRetry={load} />}
      {entries === null && !error && (
        <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 py-6 text-center">در حال بارگذاری…</p>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 py-6 text-center">سابقه‌ای ثبت نشده است.</p>
      )}
      {entries !== null && entries.length > 0 && (
        <ol className="space-y-3 max-h-96 overflow-y-auto pl-1">
          {entries.map((entry, index) => (
            <li
              key={index}
              className="rounded-xl border border-voxcina-cream dark:border-voxcina-blue/30 px-4 py-3 text-sm bg-voxcina-cream/20 dark:bg-voxcina-blue/10"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                  {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              {(entry.detail || entry.admin_name) && (
                <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
                  {entry.detail}
                  {entry.admin_name ? ` — توسط ${entry.admin_name}` : ""}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// Main manager
// ---------------------------------------------------------------------------

export default function ExternalServicesManager() {
  const { adminToken } = useAuthStore();
  const [services, setServices] = useState<ExternalServiceView[] | null>(null);
  const [stats, setStats] = useState<{ total: number; active: number; disabled: number } | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExternalServiceView | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ExternalServiceView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExternalServiceView | null>(null);
  const [identitiesTarget, setIdentitiesTarget] = useState<ExternalServiceView | null>(null);
  const [auditTarget, setAuditTarget] = useState<ExternalServiceView | null>(null);

  const [pendingSecrets, setPendingSecrets] = useState<{
    title: string;
    secrets: { label: string; hint: string; value: string }[];
  } | null>(null);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setError("");
    try {
      const response = await fetch("/api/admin/external-services", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در دریافت سرویس‌ها");
      setServices(data.services ?? []);
      setStats(data.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت سرویس‌ها");
    }
  }, [adminToken]);

  useEffect(() => {
    load();
  }, [load]);

  const testWebhook = async (service: ExternalServiceView) => {
    if (!adminToken) return;
    setBusyId(service.id);
    try {
      const response = await fetch(`/api/admin/external-services/${service.id}/webhooks/test`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "خطا در ارسال رویداد آزمایشی");
      toast.success("رویداد آزمایشی در صف ارسال قرار گرفت");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ارسال رویداد آزمایشی");
    } finally {
      setBusyId(null);
    }
  };

  // Mutations refetch instead of patching rows: list/detail responses do not
  // carry identity_count (only the list endpoint computes it), so a patched
  // row would silently lose that data.
  const handleCreated = (
    service: ExternalServiceView,
    apiKey: string,
    webhookSecret?: string,
  ) => {
    setServices(prev => (prev ? [service, ...prev] : [service]));
    setStats(prev => (prev ? { ...prev, total: prev.total + 1, active: prev.active + 1, disabled: prev.disabled } : prev));
    setCreateOpen(false);
    const secrets = [
      {
        label: "کلید API",
        hint: "در متغیر محیطی سرور ربات (مثلاً VOXCINA_API_KEY) نگه دارید. فقط همین یک‌بار نمایش داده می‌شود.",
        value: apiKey,
      },
      ...(webhookSecret
        ? [
            {
              label: "رمز امضای وب‌هوک",
              hint: "برای تأیید امضای HMAC رویدادهای ورودی کنار کلید ذخیره شود.",
              value: webhookSecret,
            },
          ]
        : []),
    ];
    setPendingSecrets({ title: `سرویس «${service.name}» ساخته شد`, secrets });
  };

  const handleRotated = (_service: ExternalServiceView, apiKey: string) => {
    load();
    setPendingSecrets({
      title: `کلید جدید «${_service.name}»`,
      secrets: [
        {
          label: "کلید API جدید",
          hint: "ابتدا روی سرور ربات به‌روزرسانی کنید؛ کلید قبلی تا ۲۴ ساعت دیگر کار می‌کند.",
          value: apiKey,
        },
      ],
    });
  };

  const handleDeleted = () => {
    // Stats derive from the same query; refetching keeps them exact without
    // replicating the backend's active/disabled bookkeeping client-side.
    load();
  };

  const isLoading = services === null && !error;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="سرویس‌های خارجی"
        subtitle="اتصال ربات‌ها و سرویس‌های بیرونی (تلگرام، بله، اینستاگرام) به فروشگاه از طریق کلید API و وب‌هوک."
        icon={<PlugZap className="w-6 h-6" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl"
          >
            <span className="inline-flex items-center gap-2">
              <Bot className="w-4 h-4" />
              سرویس جدید
            </span>
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminStatCard icon={Cable} label="همه سرویس‌ها" value={stats.total} />
          <AdminStatCard icon={PlugZap} label="فعال" value={stats.active} tone="green" />
          <AdminStatCard icon={KeyRound} label="غیرفعال" value={stats.disabled} tone="amber" />
        </div>
      )}

      {error && <AdminError message={error} onRetry={load} />}

      {isLoading && (
        <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 py-8 text-center">در حال بارگذاری…</p>
      )}

      {services !== null && services.length === 0 && !error && (
        <AdminEmpty
          icon={PlugZap}
          title="هنوز سرویس خارجی‌ای ثبت نشده"
          description="برای اتصال ربات تلگرام (یا بله/اینستاگرام) یک سرویس بسازید؛ کلید API یک‌بار نمایش داده می‌شود."
          action={
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} className="rounded-xl">
              ساخت اولین سرویس
            </Button>
          }
        />
      )}

      {services !== null && services.length > 0 && (
        <div className="space-y-4">
          {services.map(service => {
            const graceActive =
              service.previous_key_expires_at &&
              new Date(service.previous_key_expires_at).getTime() > Date.now();
            return (
              <AdminTableCard key={service.id} className="p-4 md:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">
                        {service.name}
                      </h3>
                      <AdminBadge tone={STATUS_TONE[service.status] ?? "neutral"}>
                        {service.status === "active" ? "فعال" : "غیرفعال"}
                      </AdminBadge>
                      <AdminBadge tone="info">{providerLabel(service.provider)}</AdminBadge>
                      {service.webhook?.url && (
                        <AdminBadge tone={service.webhook.active ? "success" : "warning"}>
                          {service.webhook.active ? "وب‌هوک فعال" : "وب‌هوک متوقف"}
                        </AdminBadge>
                      )}
                      {typeof service.webhook_failure_count === "number" && service.webhook_failure_count > 0 && (
                        <AdminBadge tone="danger">{service.webhook_failure_count} خطای ارسال متوالی</AdminBadge>
                      )}
                      {graceActive && (
                        <AdminBadge tone="violet">
                          کلید قبلی تا {formatDateTime(service.previous_key_expires_at)} معتبر است
                        </AdminBadge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <MonoChip>{service.key_prefix}…{service.key_last4}</MonoChip>
                      <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                        آخرین استفاده: {formatDateTime(service.last_used_at)}
                      </span>
                      {typeof service.identity_count === "number" && (
                        <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {service.identity_count} حساب متصل
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {service.scopes.map(scope => (
                        <AdminBadge key={scope} tone="neutral">{scopeLabel(scope)}</AdminBadge>
                      ))}
                      {(service.phone_methods ?? []).map(method => (
                        <AdminBadge key={method} tone="neutral">{methodLabel(method)}</AdminBadge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:w-72">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setEditTarget(service)}
                    >
                      <span className="inline-flex items-center gap-1.5"><Eye className="w-4 h-4" /> ویرایش</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setRotateTarget(service)}
                    >
                      <span className="inline-flex items-center gap-1.5"><RefreshCcw className="w-4 h-4" /> چرخش کلید</span>
                    </Button>
                    {service.webhook?.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={busyId === service.id}
                        onClick={() => testWebhook(service)}
                      >
                        <span className="inline-flex items-center gap-1.5"><Send className="w-4 h-4" /> تست وب‌هوک</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setIdentitiesTarget(service)}
                    >
                      <span className="inline-flex items-center gap-1.5"><Link2 className="w-4 h-4" /> هویت‌ها</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setAuditTarget(service)}
                    >
                      <span className="inline-flex items-center gap-1.5"><FileClock className="w-4 h-4" /> سابقه</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setDeleteTarget(service)}
                    >
                      <span className="inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> حذف</span>
                    </Button>
                  </div>
                </div>
              </AdminTableCard>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateServiceDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <EditServiceDialog
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        service={editTarget}
        onSaved={() => load()}
      />
      <RotateKeyDialog
        isOpen={rotateTarget !== null}
        onClose={() => setRotateTarget(null)}
        service={rotateTarget}
        onRotated={handleRotated}
      />
      <DeleteServiceDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        service={deleteTarget}
        onDeleted={handleDeleted}
      />
      <IdentitiesDialog
        isOpen={identitiesTarget !== null}
        onClose={() => setIdentitiesTarget(null)}
        service={identitiesTarget}
      />
      <AuditDialog
        isOpen={auditTarget !== null}
        onClose={() => setAuditTarget(null)}
        service={auditTarget}
      />
      <OneTimeSecretDialog
        isOpen={pendingSecrets !== null}
        onClose={() => setPendingSecrets(null)}
        title={pendingSecrets?.title ?? ""}
        secrets={pendingSecrets?.secrets ?? []}
        onContinue={() => setPendingSecrets(null)}
      />
    </div>
  );
}
