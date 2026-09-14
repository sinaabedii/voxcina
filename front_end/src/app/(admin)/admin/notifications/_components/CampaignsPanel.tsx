"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, RefreshCw, Megaphone } from "lucide-react";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPagination,
  AdminTh,
  AdminTd,
} from "@/components/admin/ui";
import { deleteCampaign, listCampaigns, type NotificationCampaign } from "@/lib/notifications-admin-api";

/**
 * CampaignsPanel — the history tab: per campaign what was composed, who it
 * went to, and the fanned-out → pushed → delivered → read funnel.
 */

const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  queued: "در صف",
  sending: "در حال ارسال",
  sent: "ارسال شده",
  failed: "ناموفق",
  canceled: "لغو شده",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "همه کاربران",
  segment: "بخشی از کاربران",
  user: "یک کاربر",
};

export default function CampaignsPanel({ refreshKey }: { refreshKey: number }) {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listCampaigns(targetPage);
      setCampaigns(data.campaigns || []);
      setTotalPages(data.pagination?.total_pages || 1);
      setPage(data.pagination?.current_page || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت تاریخچه ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load, refreshKey]);

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCampaign(id);
      setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "حذف کمپین ناموفق بود");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => load(page)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {isLoading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} onRetry={() => load(page)} />
      ) : campaigns.length === 0 ? (
        <AdminEmpty
          icon={Megaphone}
          title="کمپینی ثبت نشده"
          description="اولین اعلان را از زبانه «ارسال» بسازید"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-gray-500 dark:text-gray-400">
                <AdminTh>عنوان</AdminTh>
                <AdminTh>مخاطب</AdminTh>
                <AdminTh>وضعیت</AdminTh>
                <AdminTh>مخاطب / فن‌اوت</AdminTh>
                <AdminTh>پوش / تحویل</AdminTh>
                <AdminTh>خوانده‌شده</AdminTh>
                <AdminTh>تاریخ</AdminTh>
                <AdminTh> </AdminTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <AdminTd>
                    <span className="block font-medium">{campaign.title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {campaign.body}
                    </span>
                    {campaign.error && (
                      <span className="block text-[11px] text-red-600 dark:text-red-400">
                        {campaign.error}
                      </span>
                    )}
                  </AdminTd>
                  <AdminTd>{AUDIENCE_LABELS[campaign.audience_kind] ?? campaign.audience_kind}</AdminTd>
                  <AdminTd>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        campaign.status === "sent"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : campaign.status === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </span>
                  </AdminTd>
                  <AdminTd dir="ltr">
                    {campaign.fanned_out}
                  </AdminTd>
                  <AdminTd dir="ltr">
                    {campaign.pushed} / {campaign.delivered}
                  </AdminTd>
                  <AdminTd dir="ltr">{campaign.read}</AdminTd>
                  <AdminTd dir="ltr">
                    {new Date(campaign.created_at).toLocaleDateString("fa-IR")}
                  </AdminTd>
                  <AdminTd>
                    <button
                      type="button"
                      onClick={() => remove(campaign.id)}
                      disabled={deleting === campaign.id}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                      aria-label="حذف کمپین"
                    >
                      {deleting === campaign.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} onChange={(next) => load(next)} />
    </div>
  );
}
