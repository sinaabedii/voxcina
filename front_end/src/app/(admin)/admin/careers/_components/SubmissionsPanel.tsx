"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Download,
  FileText,
  Handshake,
  Inbox,
  Link2,
  Mail,
  NotebookPen,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useCareerStore } from "@/store/career-store";
import {
  CAREER_STATUS_BADGE,
  CAREER_STATUS_LABELS,
  formatFileSize,
} from "@/lib/careers";
import { toPersianNumber } from "@/lib/utils";
import {
  CareerSubmission,
  CareerSubmissionStatus,
  CareerSubmissionType,
} from "@/types/career";

const TYPE_FILTERS: { value: CareerSubmissionType | ""; label: string }[] = [
  { value: "", label: "همه" },
  { value: "job", label: "درخواست شغلی" },
  { value: "partnership", label: "همکاری تجاری" },
];

const STATUS_FILTERS: { value: CareerSubmissionStatus | ""; label: string }[] = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "new", label: "جدید" },
  { value: "reviewing", label: "در حال بررسی" },
  { value: "accepted", label: "پذیرفته شده" },
  { value: "rejected", label: "رد شده" },
];

const STATUS_OPTIONS: CareerSubmissionStatus[] = [
  "new",
  "reviewing",
  "accepted",
  "rejected",
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString("fa-IR")} — ${date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function SubmissionsPanel() {
  const {
    submissions,
    stats,
    pagination,
    isLoading,
    error,
    downloadingId,
    fetchSubmissions,
    updateSubmission,
    deleteSubmission,
    downloadResume,
  } = useCareerStore();

  const [typeFilter, setTypeFilter] = useState<CareerSubmissionType | "">("");
  const [statusFilter, setStatusFilter] = useState<CareerSubmissionStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<CareerSubmission | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CareerSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce typing so a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchSubmissions({ type: typeFilter, status: statusFilter, search, page });
  }, [typeFilter, statusFilter, search, page, fetchSubmissions]);

  const headerCounts = useMemo(
    () => [
      { label: "کل درخواست‌ها", value: stats?.total ?? 0, icon: Inbox },
      { label: "بررسی‌نشده", value: stats?.new ?? 0, icon: NotebookPen },
      { label: "درخواست شغلی", value: stats?.job ?? 0, icon: Briefcase },
      { label: "همکاری تجاری", value: stats?.partnership ?? 0, icon: Handshake },
    ],
    [stats]
  );

  const refresh = () =>
    fetchSubmissions({ type: typeFilter, status: statusFilter, search, page });

  const handleStatusChange = async (
    submission: CareerSubmission,
    status: CareerSubmissionStatus
  ) => {
    if (status === submission.status) return;
    await updateSubmission(submission.id, { status });
  };

  const handleSaveNote = async () => {
    if (!noteTarget) return;
    setSavingNote(true);
    const ok = await updateSubmission(noteTarget.id, { admin_note: noteDraft.trim() });
    setSavingNote(false);
    if (ok) {
      setNoteTarget(null);
      setNoteDraft("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteSubmission(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      // The page may now be short a row; re-read so pagination stays honest.
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headerCounts.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <item.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-bold">
                  {toPersianNumber(item.value)}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {item.label}
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => {
                setTypeFilter(filter.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="جستجو: کد پیگیری، نام، ایمیل، موبایل"
              className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary sm:w-72"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as CareerSubmissionStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="فیلتر وضعیت"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading && submissions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                تلاش مجدد
              </Button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Inbox className="mb-3 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                درخواستی با این فیلتر یافت نشد
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {submissions.map((submission) => {
                const isExpanded = expandedId === submission.id;
                const isJob = submission.type === "job";

                return (
                  <div key={submission.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              CAREER_STATUS_BADGE[submission.status]
                            }`}
                          >
                            {CAREER_STATUS_LABELS[submission.status]}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
                            {isJob ? (
                              <Briefcase className="h-3 w-3" />
                            ) : (
                              <Handshake className="h-3 w-3" />
                            )}
                            {isJob ? "درخواست شغلی" : "همکاری تجاری"}
                          </span>
                          <code className="font-mono text-[11px] text-gray-400">
                            {submission.reference_code}
                          </code>
                          <span className="text-[11px] text-gray-400">
                            {formatDateTime(submission.created_at)}
                          </span>
                        </div>

                        <p className="text-sm font-semibold">
                          {submission.full_name}
                          {isJob && submission.position && (
                            <span className="font-normal text-gray-500 dark:text-gray-400">
                              {" — "}
                              {submission.position}
                            </span>
                          )}
                          {!isJob && submission.company_name && (
                            <span className="font-normal text-gray-500 dark:text-gray-400">
                              {" — "}
                              {submission.company_name}
                            </span>
                          )}
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <a
                            href={`tel:${submission.phone}`}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span dir="ltr">{submission.phone}</span>
                          </a>
                          <a
                            href={`mailto:${submission.email}`}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span dir="ltr">{submission.email}</span>
                          </a>
                          {submission.resume && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              {formatFileSize(submission.resume.size)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
                        {submission.resume ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => downloadResume(submission)}
                            isLoading={downloadingId === submission.id}
                            className="flex items-center gap-1 !px-3"
                          >
                            <Download className="h-3.5 w-3.5" />
                            دانلود رزومه
                          </Button>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            بدون رزومه
                          </span>
                        )}

                        <select
                          value={submission.status}
                          onChange={(e) =>
                            handleStatusChange(
                              submission,
                              e.target.value as CareerSubmissionStatus
                            )
                          }
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          aria-label={`وضعیت درخواست ${submission.reference_code}`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {CAREER_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setNoteTarget(submission);
                            setNoteDraft(submission.admin_note || "");
                          }}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-zinc-800"
                          aria-label="یادداشت داخلی"
                          title="یادداشت داخلی"
                        >
                          <NotebookPen className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(submission)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          aria-label="حذف درخواست"
                          title="حذف درخواست"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : submission.id)
                          }
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "بستن جزئیات" : "نمایش جزئیات"}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2.5 rounded-lg bg-secondary/30 p-3 text-xs">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {!isJob && submission.business_type && (
                            <p>
                              <span className="font-medium">نوع کسب‌وکار: </span>
                              {submission.business_type}
                            </p>
                          )}
                          {isJob && submission.experience_years ? (
                            <p>
                              <span className="font-medium">سابقه کار: </span>
                              {toPersianNumber(submission.experience_years)} سال
                            </p>
                          ) : null}
                          {isJob && submission.portfolio_url && (
                            <p className="flex items-center gap-1">
                              <Link2 className="h-3.5 w-3.5 text-gray-400" />
                              <a
                                href={submission.portfolio_url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                dir="ltr"
                                className="truncate text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {submission.portfolio_url}
                              </a>
                            </p>
                          )}
                          {submission.resume && (
                            <p className="truncate">
                              <span className="font-medium">فایل: </span>
                              {submission.resume.file_name}
                            </p>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap leading-relaxed text-gray-600 dark:text-gray-300">
                          <span className="font-medium">متن درخواست: </span>
                          {submission.message}
                        </p>

                        {submission.admin_note && (
                          <p className="leading-relaxed text-amber-700 dark:text-amber-400">
                            <span className="font-medium">یادداشت داخلی: </span>
                            {submission.admin_note}
                          </p>
                        )}

                        {submission.reviewer_name && submission.reviewed_at && (
                          <p className="text-[11px] text-gray-400">
                            آخرین بررسی توسط {submission.reviewer_name} —{" "}
                            {formatDateTime(submission.reviewed_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            قبلی
          </Button>
          <span className="text-xs text-gray-500">
            صفحه {toPersianNumber(pagination.currentPage)} از{" "}
            {toPersianNumber(pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            بعدی
          </Button>
        </div>
      )}

      {/* Internal note */}
      <Modal
        isOpen={!!noteTarget}
        onClose={() => setNoteTarget(null)}
        title="یادداشت داخلی"
        contentClassName="max-w-sm"
      >
        {noteTarget && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              یادداشت فقط برای تیم داخلی است و به متقاضی نمایش داده نمی‌شود.
            </p>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder={`یادداشت درباره ${noteTarget.full_name}`}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setNoteTarget(null)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSaveNote}
                isLoading={savingNote}
              >
                ذخیره
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف درخواست"
        contentClassName="max-w-sm"
      >
        {deleteTarget && (
          <>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              درخواست {deleteTarget.reference_code} از {deleteTarget.full_name}
              {deleteTarget.resume ? " به همراه فایل رزومه" : ""} برای همیشه حذف
              می‌شود. این عمل قابل بازگشت نیست.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setDeleteTarget(null)}>
                انصراف
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleDelete}
                isLoading={deleting}
              >
                حذف نهایی
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
