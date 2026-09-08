"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Plus, FileText, Trash2, Eye } from "lucide-react";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { BlogPipelineRun } from "@/types/blog";
import { toast } from "react-hot-toast";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminToolbar,
  AdminBadge,
  AdminBadgeTone,
  AdminEmpty,
  AdminLoading,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminSelect,
} from "@/components/admin/ui";

export default function AdminBlogsPage() {
  const router = useRouter();
  const { currentRun, fetchRun, isLoading } = useBlogAdminStore();
  const [runs, setRuns] = useState<BlogPipelineRun[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BlogPipelineRun | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/blog-runs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch runs");
      }

      const data = await res.json();
      setRuns(data.data || []);
    } catch (err) {
      console.error("Error fetching runs:", err);
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesSearch = run.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const perPage = 10;
  const totalPages = Math.ceil(filteredRuns.length / perPage);
  const paginatedRuns = filteredRuns.slice((currentPage - 1) * perPage, currentPage * perPage);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      brief: "ایجاد خلاصه",
      researching: "در حال تحقیق",
      research_approved: "تحقیق تایید شد",
      writing: "در حال نگارش",
      content_approved: "محتوا تایید شد",
      prompts: "در حال تولید پرامپت",
      prompts_approved: "پرامپت تایید شد",
      media_pending: "در انتظار رسانه",
      ready: "آماده انتشار",
      published: "منتشر شده",
      archived: "بایگانی شده",
    };
    return labels[status] || status;
  };

  const getStatusTone = (status: string): AdminBadgeTone => {
    if (["research_approved", "content_approved", "prompts_approved", "ready", "published"].includes(status)) return "success";
    if (["researching", "writing", "prompts"].includes(status)) return "info";
    if (status === "media_pending") return "warning";
    if (status === "archived") return "neutral";
    return "neutral";
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-runs/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("کارگاه حذف شد");
        setDeleteTarget(null);
        fetchRuns();
      } else {
        toast.error("خطا در حذف");
      }
    } catch {
      toast.error("خطا در حذف");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="مدیریت مقالات هوش مصنوعی"
        icon={<FileText className="w-6 h-6" />}
        actions={
          <Button variant="primary" size="sm" onClick={() => router.push("/admin/blogs/new")} className="rounded-xl">
            <Plus className="w-4 h-4 ml-1" />
            مقاله جدید
          </Button>
        }
      />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجوی موضوع..."
        filtersAlwaysOpen
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5">
              وضعیت
            </label>
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="brief">ایجاد خلاصه</option>
              <option value="researching">در حال تحقیق</option>
              <option value="research_approved">تحقیق تایید شد</option>
              <option value="writing">در حال نگارش</option>
              <option value="content_approved">محتوا تایید شد</option>
              <option value="prompts">در حال تولید پرامپت</option>
              <option value="prompts_approved">پرامپت تایید شد</option>
              <option value="media_pending">در انتظار رسانه</option>
              <option value="ready">آماده انتشار</option>
              <option value="published">منتشر شده</option>
              <option value="archived">بایگانی شده</option>
            </AdminSelect>
          </div>
        </div>
      </AdminToolbar>

      {isLoading && paginatedRuns.length === 0 ? (
        <AdminLoading message="در حال بارگذاری کارگاه‌ها..." />
      ) : paginatedRuns.length === 0 ? (
        <AdminEmpty
          icon={FileText}
          title="کارگاهی یافت نشد"
          description="هنوز کارگاه تولید مقاله‌ای با این فیلتر ثبت نشده است."
          action={
            <Button variant="primary" size="sm" onClick={() => router.push("/admin/blogs/new")} className="rounded-xl">
              <Plus className="w-4 h-4 ml-1" />
              مقاله جدید
            </Button>
          }
        />
      ) : (
        <AdminTable
          head={
            <>
              <AdminTh>موضوع</AdminTh>
              <AdminTh>دسته</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh>تاریخ ایجاد</AdminTh>
              <AdminTh>عملیات</AdminTh>
            </>
          }
        >
          {paginatedRuns.map((run) => (
            <tr
              key={run.id}
              className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/10 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors"
            >
              <AdminTd className="whitespace-nowrap max-w-[220px] truncate font-medium">
                {run.topic}
              </AdminTd>
              <AdminTd className="whitespace-nowrap">{run.category}</AdminTd>
              <AdminTd className="whitespace-nowrap">
                <AdminBadge tone={getStatusTone(run.status)}>
                  {getStatusLabel(run.status)}
                </AdminBadge>
              </AdminTd>
              <AdminTd className="whitespace-nowrap">
                {new Date(run.createdAt).toLocaleDateString("fa-IR")}
              </AdminTd>
              <AdminTd className="whitespace-nowrap">
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/blogs/${run.id}`)}
                    className="rounded-xl"
                  >
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    مشاهده
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl !text-red-600 !border-red-300 hover:!bg-red-50 dark:!text-red-400 dark:!border-red-800/40 dark:hover:!bg-red-900/20"
                    onClick={() => setDeleteTarget(run)}
                  >
                    <Trash2 className="w-3.5 h-3.5 ml-1" />
                    حذف
                  </Button>
                </div>
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      )}

      <AdminPagination
        page={currentPage}
        totalPages={totalPages}
        onChange={setCurrentPage}
      />

      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف کارگاه تولید"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          آیا از حذف کارگاه «{deleteTarget?.topic}» اطمئنان دارید؟ این عمل قابل
          بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setDeleteTarget(null)}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            className="rounded-xl"
          >
            حذف کارگاه
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
