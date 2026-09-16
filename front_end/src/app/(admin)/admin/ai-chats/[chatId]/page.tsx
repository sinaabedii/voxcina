"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  ChevronDown,
  Clock3,
  Cpu,
  Image as ImageIcon,
  Maximize2,
  MessageCircle,
  Monitor,
  Shirt,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BackendImage from "@/components/BackendImage";
import CompareModal, { ComparePair } from "@/components/tryon/CompareModal";
import { useAuthStore } from "@/store/auth-store";
import {
  AdminAIUser,
  getAdminAIChat,
} from "@/lib/admin-tryon-chat-api";
import { TryonChat, VirtualTryon } from "@/lib/tryon-api";
import { restoreChatMessages } from "@/lib/tryon-transcript";
import AiChatTranscript from "@/components/admin/AiChatTranscript";
import {
  AdminPageHeader,
  AdminStatCard,
  AdminBadge,
  AdminBadgeTone,
  AdminLoading,
  AdminError,
  AdminEmpty,
} from "@/components/admin/ui";

const formatDate = (value?: string) => {
  if (!value) return "بدون تاریخ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "بدون تاریخ";
  return date.toLocaleString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const chatStatusLabels: Record<string, string> = {
  active: "فعال",
  archived: "بایگانی‌شده",
  deleted: "حذف‌شده",
};

const chatStatusTones: Record<string, AdminBadgeTone> = {
  active: "success",
  archived: "warning",
  deleted: "danger",
};

const tryonStatusLabels: Record<string, string> = {
  processing: "در حال پردازش",
  done: "تکمیل‌شده",
  error: "ناموفق",
};

const tryonStatusTones: Record<string, AdminBadgeTone> = {
  processing: "warning",
  done: "success",
  error: "danger",
};

const garmentTypeLabels: Record<string, string> = {
  upper_body: "بالاتنه",
  lower_body: "پایین تنه",
  dresses: "لباس",
};

function Row({
  label,
  children,
  truncate = true,
}: {
  label: string;
  children: React.ReactNode;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0">{label}:</span>
      <span className={`font-medium min-w-0 text-left ${truncate ? "truncate" : ""}`}>{children}</span>
    </div>
  );
}

function UserCard({ user }: { user?: AdminAIUser }) {
  return (
    <Card className="rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
          <User className="h-5 w-5" />
          اطلاعات کاربر
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
        <div className="flex items-center gap-2 flex-wrap">
          {user && <AdminBadge tone={user.is_active ? "success" : "danger"}>{user.is_active ? "فعال" : "غیرفعال"}</AdminBadge>}
          {user?.role && <AdminBadge tone="info">{user.role === "admin" ? "مدیر" : "مشتری"}</AdminBadge>}
        </div>
        <Row label="نام">{user?.name || "کاربر حذف‌شده"}</Row>
        <Row label="تلفن"><span className="dir-ltr">{user?.phone || "ثبت نشده"}</span></Row>
        <Row label="ایمیل"><span className="max-w-[65%] truncate dir-ltr">{user?.email || "ثبت نشده"}</span></Row>
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs dark:border-voxcina-blue/40">
          <span>شناسه:</span>
          <span className="font-mono">{user?.id || "نامشخص"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({ chat, tryonCount }: { chat: TryonChat; tryonCount: number }) {
  const metadata = chat.metadata;
  const recommended = metadata?.products_recommended || [];
  const coupons = metadata?.coupons_offered || [];

  return (
    <Card className="rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
          <Cpu className="h-5 w-5" />
          اطلاعات جلسه
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
        <Row label="وضعیت" truncate={false}>
          <AdminBadge tone={chatStatusTones[chat.status] || "neutral"}>
            {chatStatusLabels[chat.status] || chat.status || "نامشخص"}
          </AdminBadge>
        </Row>
        <Row label="دستگاه"><span className="inline-flex items-center gap-1"><Monitor className="h-3.5 w-3.5 opacity-60" />{metadata?.device_type || "ثبت نشده"}</span></Row>
        <Row label="مرورگر">{metadata?.browser || "ثبت نشده"}</Row>
        <Row label="سیستم‌عامل">{metadata?.os || "ثبت نشده"}</Row>
        <Row label="مدت جلسه">{metadata?.duration_seconds ? `${metadata.duration_seconds.toLocaleString("fa-IR")} ثانیه` : "ثبت نشده"}</Row>
        <Row label="پیام‌های ابزار">{(metadata?.tool_messages ?? 0).toLocaleString("fa-IR")}</Row>
        {recommended.length > 0 && (
          <div className="space-y-1.5 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs dark:border-voxcina-blue/40">
            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">محصولات پیشنهادی ({recommended.length.toLocaleString("fa-IR")}):</span>
            <div className="flex flex-wrap gap-1">
              {recommended.map((name, idx) => (
                <span key={`${name}-${idx}`} className="rounded-md bg-voxcina-cream/60 px-1.5 py-0.5 text-[10px] text-voxcina-blue dark:bg-voxcina-blue/25 dark:text-voxcina-cream/90">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {coupons.length > 0 && (
          <div className="space-y-1.5 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs dark:border-voxcina-blue/40">
            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">کدهای تخفیف ارائه‌شده:</span>
            <div className="flex flex-wrap gap-1">
              {coupons.map((code, idx) => (
                <span key={`${code}-${idx}`} className="rounded-md bg-purple-100 px-1.5 py-0.5 font-mono text-[10px] text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs dark:border-voxcina-blue/40">
          <div className="flex justify-between gap-3"><span>ایجاد:</span><span>{formatDate(chat.created_at)}</span></div>
          <div className="flex justify-between gap-3"><span>آخرین بروزرسانی:</span><span>{formatDate(chat.updated_at)}</span></div>
          <div className="flex justify-between gap-3">
            <span>اولین پیام:</span>
            <span>{formatDate(metadata?.first_message_at || chat.created_at)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>آخرین پیام:</span>
            <span>{formatDate(metadata?.last_message_at || chat.updated_at)}</span>
          </div>
          <div className="flex justify-between gap-3"><span>پروهای جلسه:</span><span>{tryonCount.toLocaleString("fa-IR")}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

function TryonThumb({
  src,
  label,
  alt,
  onOpen,
}: {
  src?: string;
  label: string;
  alt: string;
  onOpen?: () => void;
}) {
  const body = src ? (
    <BackendImage
      src={src}
      alt={alt}
      width={200}
      height={260}
      className="h-full w-full object-cover"
      sizes="(max-width: 768px) 30vw, 150px"
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-voxcina-blue/30 dark:text-voxcina-cream/30">
      <ImageIcon className="h-6 w-6" />
      <span className="text-[10px]">{onOpen ? "نتیجه آماده نیست" : "بدون تصویر"}</span>
    </div>
  );

  const content = (
    <>
      {body}
      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-background/85 dark:bg-voxcina-blue/85 px-2 py-0.5 text-[10px] text-voxcina-blue dark:text-voxcina-cream backdrop-blur-sm">
        {label}
      </span>
      {onOpen && src && (
        <div className="absolute inset-0 flex items-center justify-center bg-voxcina-blue/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Maximize2 className="h-5 w-5 text-voxcina-cream" />
        </div>
      )}
    </>
  );

  if (onOpen && src) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="مقایسه اصلی و نتیجه"
        className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-voxcina-cream/60 dark:border-voxcina-blue/30"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-voxcina-cream/60 dark:border-voxcina-blue/30">
      {content}
    </div>
  );
}

function TryonRecordCard({
  tryon,
  onCompare,
}: {
  tryon: VirtualTryon;
  onCompare: (beforeImage: string, afterImage: string) => void;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const statusLabel = tryonStatusLabels[tryon.status] || tryon.status || "نامشخص";
  const statusTone = tryonStatusTones[tryon.status] || "neutral";

  return (
    <Card className="overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
              <Shirt className="h-5 w-5 shrink-0" />
              {tryon.garment_product_name || "لباس انتخاب‌شده"}
            </CardTitle>
            <p className="mt-1 font-mono text-[11px] text-voxcina-blue/55 dark:text-voxcina-cream/55">{tryon.tryon_id}</p>
          </div>
          <AdminBadge tone={statusTone}>{statusLabel}</AdminBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <TryonThumb src={tryon.person_image_url} label="اصلی" alt="تصویر اولیه پرو" />
          <TryonThumb src={tryon.garment_image_url} label="لباس" alt="تصویر لباس" />
          <TryonThumb
            src={tryon.result_image_url}
            label="نتیجه"
            alt="نتیجه پرو مجازی"
            onOpen={tryon.result_image_url ? () => onCompare(tryon.person_image_url, tryon.result_image_url || "") : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs text-voxcina-blue/75 dark:border-voxcina-blue/40 dark:text-voxcina-cream/75">
          <span>رنگ: {tryon.garment_color || "ثبت نشده"}</span>
          <span>سایز: {tryon.garment_size || "ثبت نشده"}</span>
          <span>نوع لباس: {garmentTypeLabels[tryon.garment_type] || tryon.garment_type || "ثبت نشده"}</span>
          <span>مدل: {tryon.model_used || "ثبت نشده"}</span>
          <span>زمان اجرا: {tryon.duration_ms ? `${tryon.duration_ms.toLocaleString("fa-IR")} میلی‌ثانیه` : "ثبت نشده"}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5 opacity-60" />
            {formatDate(tryon.created_at)}
          </span>
          {tryon.completed_at && <span>تکمیل: {formatDate(tryon.completed_at)}</span>}
        </div>

        {tryon.prompt_text && (
          <div className="text-xs">
            <button
              type="button"
              onClick={() => setPromptOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] text-voxcina-blue/55 dark:text-voxcina-cream/55 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
            >
              پرامپت تولید تصویر
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${promptOpen ? "rotate-180" : ""}`} />
            </button>
            {promptOpen && (
              <p className="mt-2 break-words dir-ltr rounded-xl bg-voxcina-blue/[0.04] dark:bg-voxcina-cream/[0.04] p-2.5 text-left leading-5 text-voxcina-blue/75 dark:text-voxcina-cream/75">
                {tryon.prompt_text}
              </p>
            )}
          </div>
        )}
        {tryon.error && (
          <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {tryon.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAIChatDetailPage() {
  const { adminToken } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ chatId: string }>();
  const chatId = params?.chatId;
  const [chat, setChat] = useState<TryonChat | null>(null);
  const [user, setUser] = useState<AdminAIUser | undefined>();
  const [tryons, setTryons] = useState<VirtualTryon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparePair, setComparePair] = useState<ComparePair | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!adminToken || !chatId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getAdminAIChat(chatId)
      .then((response) => {
        if (cancelled) return;
        setChat(response.chat);
        setUser(response.user);
        setTryons(response.tryons || []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.error("Failed to fetch AI chat:", fetchError);
        setError("خطا در بارگذاری جزئیات گفتگو");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adminToken, chatId, reloadToken]);

  // The stored room read back exactly the way the fitting room does it, so the
  // admin sees the same bubbles, try-on cards and product cards the user saw.
  const restoredMessages = useMemo(
    () => (chat ? restoreChatMessages(chat.messages || [], tryons) : []),
    [chat, tryons]
  );

  if (isLoading) {
    return <AdminLoading message="در حال بارگذاری جزئیات گفتگو..." />;
  }

  if (error || !chat) {
    return (
      <div className="py-8">
        <AdminError message={error || "گفتگو پیدا نشد"} onRetry={error ? () => setReloadToken((t) => t + 1) : undefined} />
        <Link href="/admin/ai-chats" className="text-sm text-voxcina-blue hover:underline dark:text-voxcina-cream">
          بازگشت به فهرست گفتگوها
        </Link>
      </div>
    );
  }

  const metadata = chat.metadata;
  const storedMessages = chat.messages || [];

  return (
    <div className="py-8 md:py-12">
      <AdminPageHeader
        title={chat.title || "اتاق پرو مجازی"}
        subtitle={`شناسه گفتگو: ${chat.chat_id}`}
        icon={<MessageCircle className="h-7 w-7" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
            onClick={() => router.push("/admin/ai-chats")}
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به فهرست
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStatCard icon={MessageCircle} label="کل پیام‌ها" value={(metadata?.total_messages ?? storedMessages.length).toLocaleString("fa-IR")} />
        <AdminStatCard icon={User} label="پیام‌های کاربر" value={(metadata?.user_messages ?? 0).toLocaleString("fa-IR")} />
        <AdminStatCard icon={Bot} label="پاسخ‌های هوش مصنوعی" value={(metadata?.agent_messages ?? 0).toLocaleString("fa-IR")} />
        <AdminStatCard icon={Shirt} label="نتایج پرو" value={tryons.length.toLocaleString("fa-IR")} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="order-2 flex flex-col overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10 xl:order-1 xl:col-span-2">
          <CardHeader className="border-b border-voxcina-cream/60 pb-3 dark:border-voxcina-blue/40">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
                <MessageCircle className="h-5 w-5" />
                متن کامل گفتگو
              </CardTitle>
              <span className="flex items-center gap-1 text-xs text-voxcina-blue/55 dark:text-voxcina-cream/55">
                <Clock3 className="h-3.5 w-3.5" />
                {storedMessages.length.toLocaleString("fa-IR")} پیام
              </span>
            </div>
          </CardHeader>
          <CardContent className="max-h-[720px] flex-1 overflow-y-auto p-3">
            <AiChatTranscript
              messages={restoredMessages}
              storedMessages={storedMessages}
              onCompare={(beforeImage, afterImage) => setComparePair({ beforeImage, afterImage })}
            />
          </CardContent>
        </Card>

        <div className="order-1 space-y-6 xl:order-2">
          <UserCard user={user} />
          <SessionCard chat={chat} tryonCount={tryons.length} />
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream" />
          <h2 className="text-xl font-semibold text-voxcina-blue dark:text-voxcina-cream">نتایج پرو مجازی</h2>
        </div>
        {tryons.length === 0 ? (
          <AdminEmpty
            icon={Shirt}
            title="نتیجه‌ای ثبت نشده است"
            description="هیچ پرو مجازی به این گفتگو متصل نیست."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {tryons.map((tryon) => (
              <TryonRecordCard
                key={tryon.tryon_id}
                tryon={tryon}
                onCompare={(beforeImage, afterImage) => setComparePair({ beforeImage, afterImage })}
              />
            ))}
          </div>
        )}
      </section>

      <CompareModal pair={comparePair} onClose={() => setComparePair(null)} />
    </div>
  );
}
