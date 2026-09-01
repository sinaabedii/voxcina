"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Clock,
  Eye,
  EyeOff,
  Inbox,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useJobPositionStore } from "@/store/job-position-store";
import { JobPosition, JobPositionInput } from "@/types/career";
import { toPersianNumber } from "@/lib/utils";
import PositionFormModal from "./PositionFormModal";

const STATUS_FILTERS: { value: "" | "active" | "inactive"; label: string }[] = [
  { value: "", label: "همه" },
  { value: "active", label: "منتشرشده" },
  { value: "inactive", label: "غیرفعال" },
];

export default function PositionsPanel() {
  const {
    positions,
    stats,
    isLoading,
    isSaving,
    error,
    fetchPositions,
    createPosition,
    updatePosition,
    deletePosition,
  } = useJobPositionStore();

  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobPosition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobPosition | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce typing so a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchPositions({ status: statusFilter, search });
  }, [statusFilter, search, fetchPositions]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (position: JobPosition) => {
    setEditTarget(position);
    setFormOpen(true);
  };

  const handleSubmit = async (input: JobPositionInput) =>
    editTarget
      ? updatePosition(editTarget.id, input)
      : createPosition(input);

  const handleToggle = async (position: JobPosition) => {
    setTogglingId(position.id);
    await updatePosition(position.id, { is_active: !position.is_active });
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deletePosition(deleteTarget.id);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "کل موقعیت‌ها", value: stats?.total ?? 0, icon: Briefcase },
          { label: "منتشرشده", value: stats?.active ?? 0, icon: Eye },
          { label: "غیرفعال", value: stats?.inactive ?? 0, icon: EyeOff },
        ].map((item) => (
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

      {/* Filters + create */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === filter.value
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
              placeholder="جستجو: عنوان، واحد، موقعیت مکانی"
              className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary sm:w-72"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            موقعیت جدید
          </Button>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading && positions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPositions({ status: statusFilter, search })}
              >
                تلاش مجدد
              </Button>
            </div>
          ) : positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Inbox className="mb-3 h-10 w-10 text-gray-400" />
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                {search || statusFilter
                  ? "موقعیتی با این فیلتر یافت نشد"
                  : "هنوز موقعیت شغلی ثبت نشده است"}
              </p>
              {!search && !statusFilter && (
                <Button variant="primary" size="sm" onClick={openCreate}>
                  ثبت نخستین موقعیت
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {positions.map((position) => (
                <div key={position.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            position.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400"
                          }`}
                        >
                          {position.is_active ? "منتشرشده" : "غیرفعال"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          ترتیب: {toPersianNumber(position.display_order)}
                        </span>
                        {position.application_count > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            <Users className="h-3 w-3" />
                            {toPersianNumber(position.application_count)} درخواست
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold">{position.title}</p>

                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {position.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {position.employment_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {position.location}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {position.summary}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(position)}
                        isLoading={togglingId === position.id}
                        className="flex items-center gap-1 !px-3"
                      >
                        {position.is_active ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        {position.is_active ? "غیرفعال کردن" : "انتشار"}
                      </Button>

                      <button
                        type="button"
                        onClick={() => openEdit(position)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-zinc-800"
                        aria-label={`ویرایش ${position.title}`}
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(position)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        aria-label={`حذف ${position.title}`}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PositionFormModal
        isOpen={formOpen}
        position={editTarget}
        isSaving={isSaving}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف موقعیت شغلی"
        contentClassName="max-w-sm"
      >
        {deleteTarget && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              موقعیت «{deleteTarget.title}» برای همیشه حذف می‌شود و از صفحه
              «همکاری با ما» برداشته خواهد شد.
            </p>
            {deleteTarget.application_count > 0 && (
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                {toPersianNumber(deleteTarget.application_count)} درخواست برای این
                موقعیت ثبت شده است. درخواست‌ها و رزومه‌ها حذف نمی‌شوند و عنوان
                موقعیت در آن‌ها باقی می‌ماند. اگر فقط می‌خواهید موقعیت از سایت
                برداشته شود، به‌جای حذف آن را غیرفعال کنید.
              </p>
            )}
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
