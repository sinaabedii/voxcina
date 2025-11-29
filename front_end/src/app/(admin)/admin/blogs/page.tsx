"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Plus, Edit, Trash2, Search, FileText } from "lucide-react";
import { useBlogStore } from "../../../../store/blog-store";
import { BlogPost } from "@/types/blog";
import { toast } from "react-hot-toast";

export default function AdminBlogsPage() {
  const {
    posts,
    fetchPosts,
    createBlog,
    updateBlog,
    deleteBlog,
    isLoading,
  } = useBlogStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    category: "",
    tags: [],
    readTime: 5,
    isPublished: false,
  } as any);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Derived list filtered by search
  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const perPage = 7;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImage: "",
      category: "",
      tags: [],
      readTime: 5,
      isPublished: false,
    } as any);
    setCoverImageFile(null);
  };

  // Handlers
  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("عنوان و محتوا الزامی است");
      return;
    }

    const tagsArray = typeof formData.tags === "string"
      ? (formData.tags as unknown as string).split(",").map((t) => t.trim())
      : (formData.tags as string[]);

    const blogForm = new FormData();
    blogForm.append("title", formData.title!);
    blogForm.append("slug", formData.slug || "");
    blogForm.append("excerpt", formData.excerpt || "");
    blogForm.append("content", formData.content || "");
    blogForm.append("category", formData.category || "");
    blogForm.append("tags", JSON.stringify(tagsArray));
    blogForm.append("readTime", formData.readTime?.toString() || "5");
    blogForm.append("isPublished", formData.isPublished ? "true" : "false");
    if (coverImageFile) {
      blogForm.append("coverImage", coverImageFile);
    } else if (editingPost && formData.coverImage) {
      blogForm.append("coverImage", formData.coverImage);
    }

    let success = null;
    if (editingPost) {
      success = await updateBlog(editingPost.id || editingPost._id!, blogForm);
    } else {
      success = await createBlog(blogForm);
    }

    if (success) {
      toast.success(editingPost ? "مقاله بروزرسانی شد" : "مقاله ایجاد شد");
      setIsModalOpen(false);
      setEditingPost(null);
      resetForm();
    } else {
      toast.error("عملیات انجام نشد");
    }
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      ...post,
      tags: post.tags.join(", "),
    } as any);
    setCoverImageFile(null);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    resetForm();
    setEditingPost(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("آیا از حذف این مقاله اطمینان دارید؟")) {
      const ok = await deleteBlog(id);
      if (ok) toast.success("مقاله حذف شد");
      else toast.error("حذف ناموفق بود");
    }
  };

  return (
    <div className="py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          مقالات
        </h1>
        <Button onClick={openAdd} className="flex gap-1">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست مقالات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-right">عنوان</th>
                  <th className="px-3 py-2 text-right">دسته</th>
                  <th className="px-3 py-2 text-right">وضعیت</th>
                  <th className="px-3 py-2 text-right">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((post) => (
                  <tr key={post.id || post._id} className="border-b">
                    <td className="px-3 py-2 whitespace-nowrap max-w-[220px] truncate">
                      {post.title}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{post.category}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {post.isPublished ? "منتشر شده" : "پیشنویس"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(post)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(post.id || post._id!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      {isLoading ? "در حال بارگذاری..." : "مقاله‌ای یافت نشد"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`px-3 py-1 rounded ${num === currentPage ? "bg-voxcina-blue text-white" : "bg-gray-200"
                    }`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editingPost ? "ویرایش مقاله" : "ایجاد مقاله"}
            </h2>

            {/* Form Fields */}
            <div className="space-y-3">
              <input
                className="input w-full"
                placeholder="عنوان *"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <input
                className="input w-full"
                placeholder="نامک (slug)"
                value={formData.slug || ""}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
              <input
                className="input w-full"
                placeholder="دسته"
                value={formData.category || ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <label className="block mb-1">کاور مقاله *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                className="input w-full"
              />
              {coverImageFile && (
                <span className="text-xs text-gray-600">{coverImageFile.name}</span>
              )}
              <textarea
                className="input w-full h-24"
                placeholder="خلاصه"
                value={formData.excerpt || ""}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              />
              <textarea
                className="input w-full h-40"
                placeholder="محتوا (HTML) *"
                value={formData.content || ""}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
              <input
                className="input w-full"
                placeholder="برچسب‌ها (با کاما جدا کنید)"
                value={Array.isArray(formData.tags) ? (formData.tags as any).join(", ") : (formData.tags as unknown as string) || ""}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value.split(",").map((t) => t.trim()) })
                }
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isPublished)}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                />
                انتشار مقاله
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingPost(null); }}>
                لغو
              </Button>
              <Button onClick={handleSubmit}>
                {editingPost ? "ذخیره تغییرات" : "ایجاد"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 