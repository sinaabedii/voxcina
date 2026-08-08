"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Clock3,
  Cpu,
  Image as ImageIcon,
  MessageCircle,
  Shirt,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BackendImage from "@/components/BackendImage";
import { useAuthStore } from "@/store/auth-store";
import {
  AdminAIUser,
  getAdminAIChat,
} from "@/lib/admin-tryon-chat-api";
import type {
  TryonChat,
  TryonChatMessage,
  VirtualTryon,
} from "@/lib/tryon-api";

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

const messageRoleLabels: Record<string, string> = {
  user: "کاربر",
  agent: "دستیار هوش مصنوعی",
  tool: "ابزار هوش مصنوعی",
  tryon: "نتیجه پرو مجازی",
  system: "سیستم",
};

const tryonStatusLabels: Record<string, string> = {
  processing: "در حال پردازش",
  done: "تکمیل‌شده",
  error: "ناموفق",
};

const tryonStatusClasses: Record<string, string> = {
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

function UserCard({ user }: { user?: AdminAIUser }) {
  return (
    <Card className="rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
          <User className="h-5 w-5" />
          اطلاعات کاربر
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
        <div className="flex items-center justify-between gap-3">
          <span>نام:</span>
          <span className="font-medium">{user?.name || "کاربر حذف‌شده"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>تلفن:</span>
          <span className="dir-ltr text-left">{user?.phone || "ثبت نشده"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>ایمیل:</span>
          <span className="max-w-[65%] truncate dir-ltr text-left">{user?.email || "ثبت نشده"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs dark:border-voxcina-blue/40">
          <span>شناسه:</span>
          <span className="font-mono">{user?.id || "نامشخص"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TryonResultCard({ tryon }: { tryon: VirtualTryon }) {
  const statusLabel = tryonStatusLabels[tryon.status] || tryon.status || "نامشخص";
  const statusClass = tryonStatusClasses[tryon.status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <Card className="overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
              <Shirt className="h-5 w-5" />
              {tryon.garment_product_name || "لباس انتخاب‌شده"}
            </CardTitle>
            <p className="mt-1 font-mono text-[11px] text-voxcina-blue/55 dark:text-voxcina-cream/55">{tryon.tryon_id}</p>
          </div>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${statusClass}`}>{statusLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {tryon.person_image_url && (
            <div>
              <p className="mb-2 text-xs text-voxcina-blue/65 dark:text-voxcina-cream/65">تصویر اولیه</p>
              <BackendImage
                src={tryon.person_image_url}
                alt="تصویر اولیه پرو"
                width={320}
                height={420}
                className="h-56 w-full rounded-xl border border-voxcina-cream/60 object-cover dark:border-voxcina-blue/30"
                sizes="(max-width: 768px) 50vw, 240px"
              />
            </div>
          )}
          {tryon.result_image_url ? (
            <div>
              <p className="mb-2 text-xs text-voxcina-blue/65 dark:text-voxcina-cream/65">نتیجه هوش مصنوعی</p>
              <BackendImage
                src={tryon.result_image_url}
                alt="نتیجه پرو مجازی"
                width={320}
                height={420}
                className="h-56 w-full rounded-xl border border-voxcina-cream/60 object-cover dark:border-voxcina-blue/30"
                sizes="(max-width: 768px) 50vw, 240px"
              />
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-voxcina-cream/70 text-center text-xs text-voxcina-blue/55 dark:border-voxcina-blue/40 dark:text-voxcina-cream/55">
              <ImageIcon className="mb-2 h-7 w-7" />
              نتیجه تصویر هنوز آماده نیست
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-dashed border-voxcina-cream/60 pt-3 text-xs text-voxcina-blue/75 dark:border-voxcina-blue/40 dark:text-voxcina-cream/75">
          <span>رنگ: {tryon.garment_color || "ثبت نشده"}</span>
          <span>سایز: {tryon.garment_size || "ثبت نشده"}</span>
          <span>نوع لباس: {tryon.garment_type || "ثبت نشده"}</span>
          <span>مدل: {tryon.model_used || "ثبت نشده"}</span>
          <span>زمان اجرا: {tryon.duration_ms ? `${tryon.duration_ms.toLocaleString("fa-IR")} میلی‌ثانیه` : "ثبت نشده"}</span>
          <span>تاریخ: {formatDate(tryon.created_at)}</span>
        </div>
        {tryon.error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">{tryon.error}</p>}
      </CardContent>
    </Card>
  );
}

function ChatMessage({ message }: { message: TryonChatMessage }) {
  const isUser = message.role === "user";
  const isTryon = message.role === "tryon";
  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[92%] rounded-2xl border px-4 py-3 shadow-sm ${
          isUser
            ? "border-voxcina-blue/50 bg-voxcina-blue text-white"
            : isTryon
              ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100"
              : "border-voxcina-cream/70 bg-white/90 text-voxcina-blue dark:border-voxcina-blue/40 dark:bg-voxcina-blue/25 dark:text-voxcina-cream"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] opacity-75">
          {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          <span>{messageRoleLabels[message.role] || message.role}</span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {formatDate(message.timestamp)}
          </span>
          {message.response_time_ms ? <span>{message.response_time_ms.toLocaleString("fa-IR")} ms</span> : null}
        </div>
        {message.content && <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>}
        {message.model_used && <p className="mt-2 text-[11px] opacity-70">مدل: {message.model_used}</p>}
        {message.tool_call && (
          <div className="mt-3 space-y-2 rounded-xl border border-current/10 bg-black/5 p-3 text-xs dark:bg-white/5">
            <p className="font-semibold">فراخوانی ابزار: {message.tool_call.name}</p>
            <pre className="overflow-x-auto whitespace-pre-wrap dir-ltr text-left opacity-80">
              {JSON.stringify(message.tool_call.result || message.tool_call.arguments || {}, null, 2)}
            </pre>
          </div>
        )}
        {message.tryon_data && (
          <div className="mt-3 rounded-xl border border-current/10 bg-black/5 p-3 text-xs dark:bg-white/5">
            <p className="font-semibold">{message.tryon_data.product_name || "نتیجه پرو"}</p>
            <p className="mt-1 opacity-75">
              رنگ: {message.tryon_data.color || "ثبت نشده"}، سایز: {message.tryon_data.size || "ثبت نشده"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAIChatDetailPage() {
  const { adminToken } = useAuthStore();
  const params = useParams<{ chatId: string }>();
  const chatId = params?.chatId;
  const [chat, setChat] = useState<TryonChat | null>(null);
  const [user, setUser] = useState<AdminAIUser | undefined>();
  const [tryons, setTryons] = useState<VirtualTryon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [adminToken, chatId]);

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">در حال بارگذاری جزئیات گفتگو...</div>;
  }

  if (error || !chat) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error || "گفتگو پیدا نشد"}</p>
        <Link href="/admin/ai-chats" className="mt-4 inline-block text-sm text-voxcina-blue hover:underline dark:text-voxcina-cream">
          بازگشت به فهرست گفتگوها
        </Link>
      </div>
    );
  }

  const metadata = chat.metadata;
  const messages = chat.messages || [];

  return (
    <div className="py-8 md:py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/ai-chats" className="mb-3 inline-flex items-center gap-1 text-sm text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream">
            <ArrowRight className="h-4 w-4" />
            بازگشت به گفتگوهای هوش مصنوعی
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
            <MessageCircle className="h-6 w-6" />
            {chat.title || "اتاق پرو مجازی"}
          </h1>
          <p className="mt-1 font-mono text-xs text-voxcina-blue/55 dark:text-voxcina-cream/55">{chat.chat_id}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
          onClick={() => window.history.back()}
        >
          بازگشت
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "کل پیام‌ها", value: metadata?.total_messages ?? messages.length, icon: MessageCircle },
          { label: "پیام‌های کاربر", value: metadata?.user_messages ?? 0, icon: User },
          { label: "پاسخ‌های هوش مصنوعی", value: metadata?.agent_messages ?? 0, icon: Bot },
          { label: "نتایج پرو", value: tryons.length, icon: Shirt },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border border-voxcina-cream bg-white/90 dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <Icon className="mb-2 h-5 w-5 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
              <p className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">{value.toLocaleString("fa-IR")}</p>
              <p className="mt-1 text-xs text-voxcina-blue/65 dark:text-voxcina-cream/65">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="order-2 rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10 xl:order-1 xl:col-span-2">
          <CardHeader className="border-b border-voxcina-cream/60 dark:border-voxcina-blue/40">
            <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
              <MessageCircle className="h-5 w-5" />
              متن کامل گفتگو
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[720px] space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-voxcina-blue/65 dark:text-voxcina-cream/65">پیامی در این گفتگو ثبت نشده است.</p>
            ) : (
              messages.map((message, index) => <ChatMessage key={message.id || `${message.timestamp}-${index}`} message={message} />)
            )}
          </CardContent>
        </Card>

        <div className="order-1 space-y-6 xl:order-2">
          <UserCard user={user} />
          <Card className="rounded-2xl border border-voxcina-cream bg-white/90 shadow-sm dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-voxcina-blue dark:text-voxcina-cream">
                <Cpu className="h-5 w-5" />
                اطلاعات جلسه
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
              <div className="flex justify-between gap-3"><span>وضعیت:</span><span className="font-medium">{chat.status}</span></div>
              <div className="flex justify-between gap-3"><span>دستگاه:</span><span>{metadata?.device_type || "ثبت نشده"}</span></div>
              <div className="flex justify-between gap-3"><span>مرورگر:</span><span>{metadata?.browser || "ثبت نشده"}</span></div>
              <div className="flex justify-between gap-3"><span>مدت جلسه:</span><span>{metadata?.duration_seconds ? `${metadata.duration_seconds.toLocaleString("fa-IR")} ثانیه` : "ثبت نشده"}</span></div>
              <div className="flex justify-between gap-3 border-t border-dashed border-voxcina-cream/60 pt-3 dark:border-voxcina-blue/40"><span>ایجاد:</span><span>{formatDate(chat.created_at)}</span></div>
              <div className="flex justify-between gap-3"><span>آخرین بروزرسانی:</span><span>{formatDate(chat.updated_at)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream" />
          <h2 className="text-xl font-semibold text-voxcina-blue dark:text-voxcina-cream">نتایج پرو مجازی</h2>
        </div>
        {tryons.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-voxcina-cream bg-white/70 dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center text-sm text-voxcina-blue/65 dark:text-voxcina-cream/65">نتیجه‌ای برای این گفتگو ثبت نشده است.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {tryons.map((tryon) => <TryonResultCard key={tryon.tryon_id} tryon={tryon} />)}
          </div>
        )}
      </section>
    </div>
  );
}
