"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircle,
  Search,
  Shirt,
  User,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  AdminAIChatSummary,
  listAdminAIChats,
} from "@/lib/admin-tryon-chat-api";

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

const statusLabels: Record<string, string> = {
  active: "فعال",
  archived: "بایگانی‌شده",
  deleted: "حذف‌شده",
};

const statusClasses: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  archived: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

export default function AdminAIChatsPage() {
  const { adminToken } = useAuthStore();
  const [chats, setChats] = useState<AdminAIChatSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminToken) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await listAdminAIChats(page, 20, search, status);
        if (cancelled) return;
        setChats(response.chats || []);
        setTotal(response.total || 0);
        setTotalPages(Math.max(response.pages || 1, 1));
      } catch (fetchError) {
        if (cancelled) return;
        console.error("Failed to fetch AI chats:", fetchError);
        setChats([]);
        setError("خطا در بارگذاری گفتگوهای هوش مصنوعی");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [adminToken, page, search, status]);

  const statusLabel = (chatStatus: string) => statusLabels[chatStatus] || chatStatus || "نامشخص";
  const statusClass = (chatStatus: string) =>
    statusClasses[chatStatus] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="py-8 md:py-12">
      <motion.div
        className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="relative inline-flex items-center gap-2 text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream md:text-3xl">
            <Bot className="h-7 w-7" />
            گفتگوهای هوش مصنوعی
          </h1>
          <p className="mt-2 text-sm text-voxcina-blue/65 dark:text-voxcina-cream/65">
            مشاهده گفتگوهای اتاق پرو مجازی، کاربران و نتایج تولیدشده
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="جستجوی عنوان یا شناسه..."
              className="w-full rounded-xl border border-voxcina-cream/60 bg-white px-9 py-2.5 text-sm text-voxcina-blue shadow-sm outline-none focus:border-voxcina-blue/50 dark:border-voxcina-blue/40 dark:bg-voxcina-blue/20 dark:text-voxcina-cream"
            />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-voxcina-cream/60 bg-white px-3 py-2.5 text-sm text-voxcina-blue shadow-sm outline-none dark:border-voxcina-blue/40 dark:bg-voxcina-blue/20 dark:text-voxcina-cream"
            aria-label="فیلتر وضعیت گفتگو"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="archived">بایگانی‌شده</option>
            <option value="deleted">حذف‌شده</option>
          </select>
        </div>
      </motion.div>

      {total > 0 && !isLoading && !error && (
        <p className="mb-4 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
          تعداد گفتگوها: <span className="font-semibold">{total.toLocaleString("fa-IR")}</span>
        </p>
      )}

      <Card className="overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-md dark:border-voxcina-blue/20 dark:bg-voxcina-blue/10">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-voxcina-blue/20 border-t-voxcina-blue dark:border-voxcina-cream/20 dark:border-t-voxcina-cream" />
              در حال بارگذاری گفتگوها...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : chats.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="mx-auto mb-3 h-10 w-10 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
              <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">گفتگویی پیدا نشد</p>
              <p className="mt-1 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                هنوز گفتگویی در اتاق پرو مجازی ثبت نشده است.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-voxcina-cream/45 dark:bg-voxcina-blue/30">
                  <tr>
                    <th className="p-4 text-right font-medium text-voxcina-blue/75 dark:text-voxcina-cream/75">کاربر</th>
                    <th className="p-4 text-right font-medium text-voxcina-blue/75 dark:text-voxcina-cream/75">گفتگو</th>
                    <th className="p-4 text-center font-medium text-voxcina-blue/75 dark:text-voxcina-cream/75">پیام‌ها</th>
                    <th className="p-4 text-center font-medium text-voxcina-blue/75 dark:text-voxcina-cream/75">پرو مجازی</th>
                    <th className="p-4 text-right font-medium text-voxcina-blue/75 dark:text-voxcina-cream/75">آخرین پیام</th>
                    <th className="p-4 text-right font-medium text-voxcina-blue/75 dark:text-voxcina-cream/75">وضعیت</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/20">
                  {chats.map((chat) => (
                    <tr key={chat.chat_id} className="transition-colors hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20">
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-voxcina-blue dark:text-voxcina-cream">
                          <User className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                          <div>
                            <p className="font-medium">{chat.user?.name || "کاربر حذف‌شده"}</p>
                            <p className="mt-0.5 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {chat.user?.phone || chat.user?.email || chat.user_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs p-4">
                        <p className="truncate font-medium text-voxcina-blue dark:text-voxcina-cream">{chat.title || "اتاق پرو مجازی"}</p>
                        <p className="mt-1 font-mono text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">{chat.chat_id}</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1 font-semibold text-voxcina-blue dark:text-voxcina-cream">
                          <MessageCircle className="h-4 w-4" />
                          {chat.message_count.toLocaleString("fa-IR")}
                        </div>
                        <p className="mt-1 text-[11px] text-voxcina-blue/55 dark:text-voxcina-cream/55">
                          {chat.user_messages.toLocaleString("fa-IR")} کاربر / {chat.agent_messages.toLocaleString("fa-IR")} پاسخ
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1 font-semibold text-voxcina-blue dark:text-voxcina-cream">
                          <Shirt className="h-4 w-4" />
                          {chat.tryon_count.toLocaleString("fa-IR")}
                        </div>
                      </td>
                      <td className="max-w-xs p-4">
                        <p className="truncate text-voxcina-blue/75 dark:text-voxcina-cream/75">{chat.last_message || "بدون پیام"}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-voxcina-blue/55 dark:text-voxcina-cream/55">
                          <Clock3 className="h-3 w-3" />
                          {formatDate(chat.last_message_at || chat.updated_at)}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${statusClass(chat.status)}`}>
                          {statusLabel(chat.status)}
                        </span>
                      </td>
                      <td className="p-4 text-left">
                        <Link
                          href={`/admin/ai-chats/${encodeURIComponent(chat.chat_id)}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-voxcina-blue hover:underline dark:text-voxcina-cream"
                        >
                          مشاهده جزئیات
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-voxcina-cream/50 bg-white/70 p-3 dark:border-voxcina-blue/20 dark:bg-voxcina-blue/10">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl text-voxcina-blue dark:text-voxcina-cream"
          >
            <ChevronRight className="ml-1 h-4 w-4" />
            قبلی
          </Button>
          <span className="flex items-center gap-1 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
            <Calendar className="h-4 w-4" />
            صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-xl text-voxcina-blue dark:text-voxcina-cream"
          >
            بعدی
            <ChevronLeft className="mr-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
