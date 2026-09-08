"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bot,
  ChevronLeft,
  Clock3,
  MessageCircle,
  Shirt,
  User,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  AdminAIChatSummary,
  listAdminAIChats,
} from "@/lib/admin-tryon-chat-api";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminToolbar,
  AdminBadge,
  AdminBadgeTone,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminSelect,
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

const statusLabels: Record<string, string> = {
  active: "فعال",
  archived: "بایگانی‌شده",
  deleted: "حذف‌شده",
};

const statusTones: Record<string, AdminBadgeTone> = {
  active: "success",
  archived: "warning",
  deleted: "danger",
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
  const statusTone = (chatStatus: string): AdminBadgeTone => statusTones[chatStatus] || "neutral";

  return (
    <div>
      <AdminPageHeader
        title="گفتگوهای هوش مصنوعی"
        subtitle="مشاهده گفتگوهای اتاق پرو مجازی، کاربران و نتایج تولیدشده"
        icon={<Bot className="h-7 w-7" />}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="جستجوی عنوان یا شناسه..."
        filtersAlwaysOpen
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
              وضعیت گفتگو
            </label>
            <AdminSelect
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="فیلتر وضعیت گفتگو"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="archived">بایگانی‌شده</option>
              <option value="deleted">حذف‌شده</option>
            </AdminSelect>
          </div>
        </div>
      </AdminToolbar>

      {total > 0 && !isLoading && !error && (
        <p className="mb-4 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
          تعداد گفتگوها: <span className="font-semibold">{total.toLocaleString("fa-IR")}</span>
        </p>
      )}

      {isLoading ? (
        <AdminLoading message="در حال بارگذاری گفتگوها..." />
      ) : error ? (
        <AdminError message={error} />
      ) : chats.length === 0 ? (
        <AdminEmpty
          icon={Bot}
          title="گفتگویی پیدا نشد"
          description="هنوز گفتگویی در اتاق پرو مجازی ثبت نشده است."
        />
      ) : (
        <AdminTable
          className="min-w-[920px]"
          head={
            <>
              <AdminTh>کاربر</AdminTh>
              <AdminTh>گفتگو</AdminTh>
              <AdminTh className="text-center">پیام‌ها</AdminTh>
              <AdminTh className="text-center">پرو مجازی</AdminTh>
              <AdminTh>آخرین پیام</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh />
            </>
          }
        >
          {chats.map((chat) => (
            <tr key={chat.chat_id} className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors">
              <AdminTd>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 shrink-0" />
                  <div>
                    <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">{chat.user?.name || "کاربر حذف‌شده"}</p>
                    <p className="mt-0.5 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      {chat.user?.phone || chat.user?.email || chat.user_id}
                    </p>
                  </div>
                </div>
              </AdminTd>
              <AdminTd className="max-w-xs">
                <p className="truncate font-medium text-voxcina-blue dark:text-voxcina-cream">{chat.title || "اتاق پرو مجازی"}</p>
                <p className="mt-1 font-mono text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50">{chat.chat_id}</p>
              </AdminTd>
              <AdminTd className="text-center">
                <div className="inline-flex items-center gap-1 font-semibold text-voxcina-blue dark:text-voxcina-cream">
                  <MessageCircle className="h-4 w-4" />
                  {chat.message_count.toLocaleString("fa-IR")}
                </div>
                <p className="mt-1 text-[11px] text-voxcina-blue/55 dark:text-voxcina-cream/55">
                  {chat.user_messages.toLocaleString("fa-IR")} کاربر / {chat.agent_messages.toLocaleString("fa-IR")} پاسخ
                </p>
              </AdminTd>
              <AdminTd className="text-center">
                <div className="inline-flex items-center gap-1 font-semibold text-voxcina-blue dark:text-voxcina-cream">
                  <Shirt className="h-4 w-4" />
                  {chat.tryon_count.toLocaleString("fa-IR")}
                </div>
              </AdminTd>
              <AdminTd className="max-w-xs">
                <p className="truncate">{chat.last_message || "بدون پیام"}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-voxcina-blue/55 dark:text-voxcina-cream/55">
                  <Clock3 className="h-3 w-3" />
                  {formatDate(chat.last_message_at || chat.updated_at)}
                </p>
              </AdminTd>
              <AdminTd>
                <AdminBadge tone={statusTone(chat.status)}>
                  {statusLabel(chat.status)}
                </AdminBadge>
              </AdminTd>
              <AdminTd className="text-left">
                <Link
                  href={`/admin/ai-chats/${encodeURIComponent(chat.chat_id)}`}
                  className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-voxcina-blue hover:underline dark:text-voxcina-cream"
                >
                  مشاهده جزئیات
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      )}

      {!isLoading && !error && (
        <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
