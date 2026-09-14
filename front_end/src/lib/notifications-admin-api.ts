/**
 * Notification admin API — the client for /api/admin/notifications/*.
 *
 * The backend is admin-only (routes/routes.go: these routes sit on
 * adminRouter, never staffRouter), and every campaign is fanned out by a
 * background worker AFTER the admin sees the audience count — which is why the
 * preview call is a first-class part of this module rather than a nicety.
 */

export interface NotificationCampaign {
  id: string;
  type: string;
  audience_kind: string;
  audience_user?: string;
  segment?: Record<string, unknown>;
  title: string;
  body: string;
  image?: string;
  target_type?: string;
  target_id?: string;
  target_extra?: string;
  send_at?: string | null;
  status: string;
  fanned_out: number;
  pushed: number;
  delivered: number;
  read: number;
  error?: string;
  sent_at?: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  type: string;
  enabled: boolean;
  title: string;
  body: string;
}

export interface AudienceRule {
  audience_kind: "all" | "segment" | "user";
  audience_user?: string;
  segment?: Record<string, unknown>;
}

const authHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${
    typeof window === "undefined" ? "" : localStorage.getItem("authToken")
  }`,
  "Content-Type": "application/json",
});

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" && data.error ? data.error : fallback;
}

export async function previewAudience(rule: AudienceRule): Promise<number> {
  const response = await fetch("/api/admin/notifications/campaigns/preview", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(rule),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "پیش‌نمایش مخاطبان ناموفق بود"));
  const data = await response.json();
  return typeof data.count === "number" ? data.count : 0;
}

export async function createCampaign(
  rule: AudienceRule,
  content: {
    type: string;
    title: string;
    body: string;
    image?: string;
    target_type?: string;
    target_id?: string;
    target_extra?: string;
    send_at?: string | null;
  },
): Promise<NotificationCampaign> {
  const response = await fetch("/api/admin/notifications/campaigns", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...rule, ...content }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "ثبت کمپین ناموفق بود"));
  const data = await response.json();
  return data.campaign;
}

export async function listCampaigns(page = 1): Promise<{
  campaigns: NotificationCampaign[];
  pagination: { current_page: number; total_pages: number; total_count: number; page_size: number };
}> {
  const response = await fetch(
    `/api/admin/notifications/campaigns?page=${page}`,
    { headers: authHeaders() },
  );
  if (!response.ok) throw new Error(await errorMessage(response, "دریافت تاریخچه ناموفق بود"));
  return response.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/admin/notifications/campaigns/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "حذف کمپین ناموفق بود"));
}

export async function listTemplates(): Promise<NotificationTemplate[]> {
  const response = await fetch("/api/admin/notifications/templates", {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "دریافت قالب‌ها ناموفق بود"));
  const data = await response.json();
  return data.templates || [];
}

export async function updateTemplate(template: NotificationTemplate): Promise<void> {
  const response = await fetch("/api/admin/notifications/templates", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "ذخیره قالب ناموفق بود"));
}

export async function resetTemplate(type: string): Promise<void> {
  const response = await fetch(`/api/admin/notifications/templates/${type}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "حذف قالب ناموفق بود"));
}

export async function listUserNotifications(
  userId: string,
  page = 1,
): Promise<{ notifications: Array<Record<string, unknown>>; pagination: Record<string, number> }> {
  const response = await fetch(
    `/api/admin/users/${userId}/notifications?page=${page}`,
    { headers: authHeaders() },
  );
  if (!response.ok) throw new Error(await errorMessage(response, "دریافت نوتیفیکیشن‌های کاربر ناموفق بود"));
  return response.json();
}

/** The closed §5 deep-link vocabulary the target picker offers. */
export const TARGET_TYPES: Array<{ value: string; label: string; needsId: "objectid" | "none" | "free" }> = [
  { value: "", label: "بدون لینک", needsId: "none" },
  { value: "home", label: "خانه", needsId: "none" },
  { value: "orders", label: "لیست سفارش‌ها", needsId: "free" },
  { value: "order_detail", label: "جزئیات سفارش", needsId: "objectid" },
  { value: "tickets", label: "تیکت‌ها", needsId: "none" },
  { value: "ticket_detail", label: "جزئیات تیکت", needsId: "objectid" },
  { value: "returns", label: "مرجوعی‌ها", needsId: "none" },
  { value: "vouchers", label: "کدهای تخفیف", needsId: "none" },
  { value: "cart", label: "سبد خرید", needsId: "free" },
  { value: "product_detail", label: "جزئیات محصول", needsId: "objectid" },
  { value: "products", label: "لیست محصولات", needsId: "free" },
  { value: "collection", label: "کالکشن‌ها", needsId: "none" },
  { value: "tryon", label: "اتاق پرو", needsId: "none" },
  { value: "notifications", label: "صندوق اعلان‌ها", needsId: "none" },
];

/** The notification types the compose form offers. */
export const NOTIFICATION_TYPES: Array<{ value: string; label: string }> = [
  { value: "promotion", label: "پروموشن" },
  { value: "announcement", label: "اعلامیه" },
  { value: "voucher_granted", label: "اعطای کد تخفیف" },
  { value: "coupon_offer", label: "پیشنهاد کد تخفیف" },
  { value: "cart_reminder", label: "یادآوری سبد خرید" },
  { value: "price_drop", label: "کاهش قیمت" },
  { value: "back_in_stock", label: "موجود شدن" },
];

/** The segment fields the audience builder offers (server-validated). */
export const SEGMENT_FIELDS: Array<{ value: string; label: string; kind: "days" | "flag" | "text" | "product" }> = [
  { value: "bought_within_days", label: "خرید در N روز گذشته", kind: "days" },
  { value: "never_bought", label: "هرگز خرید نکرده", kind: "flag" },
  { value: "has_abandoned_cart", label: "سبد خرید رهاشده دارد", kind: "flag" },
  { value: "owns_unused_voucher", label: "کد تخفیف استفاده‌نشده دارد", kind: "flag" },
  { value: "favourited_product", label: "این محصول را علاقه‌مند شده", kind: "product" },
  { value: "city", label: "شهر", kind: "text" },
  { value: "province", label: "استان", kind: "text" },
  { value: "last_open_within_days", label: "باز شدن اپ در N روز گذشته", kind: "days" },
];
