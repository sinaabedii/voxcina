"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { Category } from "@/types/category";
import { toast } from "react-hot-toast";
import CategoryModal from "@/components/admin/CategoryModal";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
} from "@/components/admin/ui";

export default function AdminCategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    categories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    isLoading,
    error,
  } = useCategoryStore();
  const { adminToken } = useAuthStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter categories by search term
  const filteredCategories = categories.filter((category: Category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description &&
        category.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Sort categories by name
  const sortedCategories = [...filteredCategories].sort((a: Category, b: Category) => {
    return a.name.localeCompare(b.name);
  });

  // Pagination
  const categoriesPerPage = 5;
  const totalPages = Math.ceil(sortedCategories.length / categoriesPerPage);
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = sortedCategories.slice(
    indexOfFirstCategory,
    indexOfLastCategory
  );

  // Helper to get parent category name
  const getParentCategoryName = (parentId: string | null | undefined) => {
    if (!parentId) return "-";
    const parent = categories.find((cat: Category) => cat.id === parentId);
    return parent ? parent.name : "-";
  };

  // Add new category
  const handleAddCategory = async (formData: FormData) => {
    if (!adminToken) {
      toast.error("دسترسی ادمین ندارید");
      return;
    }
    const result = await createCategory(formData, adminToken);
    if (result) {
      setIsAddModalOpen(false);
      setEditingCategory(null);
      fetchCategories(); // Re-fetch to update list
    }
  };

  // Update category
  const handleUpdateCategory = async (formData: FormData) => {
    if (!editingCategory || !editingCategory.id) return;
    if (!adminToken) {
      toast.error("دسترسی ادمین ندارید");
      return;
    }

    const result = await updateCategory(editingCategory.id, formData, adminToken);
    if (result) {
      setEditingCategory(null);
      setIsAddModalOpen(false);
      fetchCategories();
      toast.success("دسته‌بندی با موفقیت به‌روزرسانی شد.");
    } else {
      toast.error(error || "خطا در به‌روزرسانی دسته‌بندی.");
    }
  };

  // Delete category
  const handleDeleteCategory = async () => {
    if (!deleteTarget?.id || !adminToken) return;
    setIsDeleting(true);
    const success = await deleteCategory(deleteTarget.id, adminToken);
    setIsDeleting(false);
    if (success) {
      setDeleteTarget(null);
      fetchCategories(); // Re-fetch
    }
  };
  
  const handleOpenEditModal = (category: Category) => {
    setEditingCategory({ 
      ...category,
      // Ensure is_active is explicitly a boolean, defaulting to true if undefined from source
      is_active: category.is_active === undefined ? true : category.is_active,
      show_in_header: category.show_in_header === undefined ? false : category.show_in_header
    }); 
    setIsAddModalOpen(true); 
  };


  // Animation variants
  if (isLoading && categories.length === 0) {
    return <AdminLoading message="در حال بارگذاری دسته‌بندی‌ها..." />;
  }


  return (
    <div>
      <AdminPageHeader
        title="مدیریت دسته‌بندی‌ها"
        actions={
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              setEditingCategory(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 ml-1" />
            افزودن دسته‌بندی
          </Button>
        }
      />

      {error && (
        <AdminError
          message={`خطا در بارگذاری دسته‌بندی‌ها: ${error}`}
          onRetry={() => fetchCategories()}
        />
      )}

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجوی دسته‌بندی..."
      />

      {/* Categories List */}
      <div>
        {isLoading && categories.length > 0 && (
          <div className="flex justify-center my-4">
            <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
          </div>
        )}
        {currentCategories.length > 0 ? (
          <div className="space-y-4">
            {currentCategories.map((category) => (
              <div key={category.id}>
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0">
                        {category.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                          </div>
                        )}
                      </div>
                      <div className="mr-3 flex-grow">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {category.name}
                            </h3>
                            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {category.description || "بدون توضیحات"}
                            </p>
                          </div>
                          <AdminBadge tone={category.is_active ? "success" : "danger"}>
                            {category.is_active ? "فعال" : "غیرفعال"}
                          </AdminBadge>
                        </div>
                        <div className="flex flex-wrap items-center mt-2 text-sm">
                          <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            دسته والد: {getParentCategoryName(category.parent_id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="ویرایش دسته‌بندی"
                          className="rounded-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                          onClick={() => handleOpenEditModal(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="حذف دسته‌بندی"
                          className="rounded-lg text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400"
                          onClick={() => setDeleteTarget(category)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmpty
            icon={Tags}
            title={searchTerm ? "دسته‌بندی یافت نشد" : "هیچ دسته‌بندی وجود ندارد"}
            description={
              searchTerm
                ? "هیچ دسته‌بندی با جستجوی مورد نظر یافت نشد"
                : "ابتدا یک دسته‌بندی جدید اضافه کنید."
            }
            action={
              searchTerm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="rounded-xl"
                >
                  پاک کردن جستجو
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsAddModalOpen(true);
                  }}
                  className="rounded-xl"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  افزودن دسته‌بندی
                </Button>
              )
            }
          />
        )}

        {/* Pagination */}
        <AdminPagination
          page={currentPage}
          totalPages={totalPages}
          onChange={(p) => {
            if (p > 0 && p <= totalPages) setCurrentPage(p);
          }}
        />
      </div>

      {/* Add/Edit Category Modal */}
      <CategoryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
        categories={categories}
        isLoading={isLoading}
      />

      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف دسته‌بندی"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          آیا از حذف دسته‌بندی «{deleteTarget?.name}» اطمینان دارید؟ این عمل قابل
          بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setDeleteTarget(null)}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteCategory}
            disabled={isDeleting}
            isLoading={isDeleting}
            className="rounded-xl"
          >
            حذف دسته‌بندی
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
} 
