"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { BlogCategory } from "@/types/blog";
import { toast } from "react-hot-toast";

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", order: 0 });

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/blog-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      toast.error("خطا در دریافت دسته‌ها");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("نام دسته الزامی است");
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/blog-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("دسته ایجاد شد");
        setFormData({ name: "", description: "", order: 0 });
        setShowCreate(false);
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.error || "خطا در ایجاد دسته");
      }
    } catch {
      toast.error("خطا در ایجاد دسته");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      toast.error("نام دسته الزامی است");
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("دسته بروزرسانی شد");
        setEditingId(null);
        setFormData({ name: "", description: "", order: 0 });
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.error || "خطا در بروزرسانی دسته");
      }
    } catch {
      toast.error("خطا در بروزرسانی دسته");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این دسته اطمینان دارید؟")) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("دسته حذف شد");
        fetchCategories();
      } else {
        toast.error("خطا در حذف دسته");
      }
    } catch {
      toast.error("خطا در حذف دسته");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/blog-categories/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("دسته بازیابی شد");
        fetchCategories();
      } else {
        toast.error("خطا در بازیابی دسته");
      }
    } catch {
      toast.error("خطا در بازیابی دسته");
    }
  };

  const handleRecount = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/admin/blog-categories/recount", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("تعداد مقالات بروزرسانی شد");
        fetchCategories();
      } else {
        toast.error("خطا در بروزرسانی تعداد");
      }
    } catch {
      toast.error("خطا در بروزرسانی تعداد");
    }
  };

  const startEdit = (cat: BlogCategory) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, description: cat.description || "", order: cat.order });
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", order: 0 });
  };

  if (isLoading) {
    return <div className="py-8 text-center">در حال بارگذاری...</div>;
  }

  return (
    <div className="py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مدیریت دسته‌های مقاله</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecount}>
            بروزرسانی تعداد
          </Button>
          <Button onClick={() => { setShowCreate(!showCreate); setEditingId(null); setFormData({ name: "", description: "", order: 0 }); }}>
            {showCreate ? "لغو" : "دسته جدید"}
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ایجاد دسته جدید</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 font-medium text-sm">نام *</label>
                <input
                  className="input w-full"
                  placeholder="نام دسته"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-sm">توضیحات</label>
                <input
                  className="input w-full"
                  placeholder="توضیحات اختیاری"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-sm">ترتیب نمایش</label>
                <input
                  className="input w-full"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleCreate}>ایجاد</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              هنوز دسته‌ای تعریف نشده است
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    !cat.isActive ? "opacity-50 bg-gray-50" : "bg-white"
                  }`}
                >
                  {editingId === cat.id ? (
                    <>
                      <input
                        className="input flex-1"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                      <input
                        className="input flex-1"
                        placeholder="توضیحات"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                      <input
                        className="input w-20"
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      />
                      <Button size="sm" onClick={() => handleUpdate(cat.id)}>
                        ذخیره
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        لغو
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs text-gray-500 mr-2">({cat.slug})</span>
                        {cat.description && (
                          <p className="text-sm text-gray-600 mt-1">{cat.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {cat.postCount} مقاله
                      </span>
                      <span className="text-xs text-gray-400">
                        ترتیب: {cat.order}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(cat)}>
                          ویرایش
                        </Button>
                        {cat.isActive ? (
                          <Button size="sm" variant="outline" onClick={() => handleDelete(cat.id)}>
                            غیرفعال
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleRestore(cat.id)}>
                            فعال
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
