"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Plus, FileText, Search, Filter } from "lucide-react";
import { useBlogAdminStore } from "@/store/blog-admin-store";
import { BlogPipelineRun } from "@/types/blog";
import { toast } from "react-hot-toast";

export default function AdminBlogsPage() {
  const router = useRouter();
  const { currentRun, fetchRun, isLoading } = useBlogAdminStore();
  const [runs, setRuns] = useState<BlogPipelineRun[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      brief: "bg-gray-100 text-gray-800",
      researching: "bg-blue-100 text-blue-800",
      research_approved: "bg-green-100 text-green-800",
      writing: "bg-yellow-100 text-yellow-800",
      content_approved: "bg-green-100 text-green-800",
      prompts: "bg-purple-100 text-purple-800",
      prompts_approved: "bg-green-100 text-green-800",
      media_pending: "bg-orange-100 text-orange-800",
      ready: "bg-green-100 text-green-800",
      published: "bg-emerald-100 text-emerald-800",
      archived: "bg-gray-100 text-gray-600",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          مدیریت مقالات هوش مصنوعی
        </h1>
        <Button onClick={() => router.push("/admin/blogs/new")} className="flex gap-1">
          <Plus className="w-4 h-4" />
          مقاله جدید
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          className="input flex-1"
          placeholder="جستجو..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">همه وضعیتها</option>
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
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست کارگاههای تولید</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-right">موضوع</th>
                  <th className="px-3 py-2 text-right">دسته</th>
                  <th className="px-3 py-2 text-right">وضعیت</th>
                  <th className="px-3 py-2 text-right">تاریخ ایجاد</th>
                  <th className="px-3 py-2 text-right">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuns.map((run) => (
                  <tr key={run.id} className="border-b">
                    <td className="px-3 py-2 whitespace-nowrap max-w-[220px] truncate">
                      {run.topic}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{run.category}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(run.status)}`}>
                        {getStatusLabel(run.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(run.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/blogs/${run.id}`)}
                        >
                          مشاهده
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={async () => {
                            if (!confirm("آیا از حذف این کارگاه اطمینان دارید؟")) return;
                            const token = localStorage.getItem("authToken");
                            const res = await fetch(`/api/admin/blog-runs/${run.id}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) {
                              toast.success("کارگاه حذف شد");
                              fetchRuns();
                            } else {
                              toast.error("خطا در حذف");
                            }
                          }}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRuns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      {isLoading ? "در حال بارگذاری..." : "کارگاهی یافت نشد"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`px-3 py-1 rounded ${num === currentPage ? "bg-voxcina-blue text-white" : "bg-gray-200"}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
