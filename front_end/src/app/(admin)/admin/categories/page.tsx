"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Tags,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  PackageOpen,
  X,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { Category } from "@/types/category";
import { toast } from "react-hot-toast";

export default function AdminCategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: "",
    slug: "",
    description: "",
    parent_id: null,
    is_active: true,
    show_in_header: false,
  });
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [editingCategoryImage, setEditingCategoryImage] = useState<File | null>(null);

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

  // Sort categories (example: by name, adapt if order field exists)
  const sortedCategories = [...filteredCategories].sort((a: Category, b: Category) => {
    return a.name.localeCompare(b.name);
  });

  // Parent categories for dropdown
  const parentCategories = categories.filter((cat: Category) => !cat.parent_id);

  // Pagination
  const categoriesPerPage = 5;
  const totalPages = Math.ceil(sortedCategories.length / categoriesPerPage);
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = sortedCategories.slice(
    indexOfFirstCategory,
    indexOfLastCategory
  );

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Helper to get parent category name
  const getParentCategoryName = (parentId: string | null | undefined) => {
    if (!parentId) return "-";
    const parent = categories.find((cat: Category) => cat.id === parentId);
    return parent ? parent.name : "-";
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.name || !adminToken) return;

    const formData = new FormData();
    formData.append("name", newCategory.name);
    if (newCategory.slug) formData.append("slug", newCategory.slug);
    if (newCategory.description) formData.append("description", newCategory.description);
    if (newCategory.parent_id) formData.append("parent_id", newCategory.parent_id);
    formData.append("is_active", String(newCategory.is_active || true));
    formData.append("show_in_header", String(newCategory.show_in_header || false));
    if (newCategoryImage) {
      formData.append("image", newCategoryImage);
    }

    const result = await createCategory(formData, adminToken);
    if (result) {
      setNewCategory({
        name: "",
        slug: "",
        description: "",
        parent_id: null,
        is_active: true,
        show_in_header: false,
      });
      setNewCategoryImage(null);
      setIsAddModalOpen(false);
      fetchCategories(); // Re-fetch to update list
    }
  };

  // Update category
  const handleUpdateCategory = async () => {
    console.log("editingCategory", editingCategory);
    if (!editingCategory || !editingCategory.id || !adminToken) return;

    const formData = new FormData();
    formData.append("name", editingCategory.name);
    if (editingCategory.slug) formData.append("slug", editingCategory.slug);
    if (editingCategory.description) formData.append("description", editingCategory.description);
    if (editingCategory.parent_id) formData.append("parent_id", editingCategory.parent_id);
    // Ensure is_active is always a string "true" or "false" for FormData
    formData.append("is_active", String(editingCategory.is_active === undefined ? true : editingCategory.is_active));
    formData.append("show_in_header", String(editingCategory.show_in_header === undefined ? false : editingCategory.show_in_header));

    if (editingCategoryImage) {
      formData.append("image", editingCategoryImage);
    }
    // Note: If the backend expects the image field to be explicitly nulled or handled
    // when not sending a new image, that logic might need to be added here or in the backend.
    // For now, we only append the image if a new one is selected.

    const result = await updateCategory(editingCategory.id, formData, adminToken);
    if (result) {
      setEditingCategory(null);
      setEditingCategoryImage(null);
      setIsAddModalOpen(false); 
      fetchCategories(); 
      toast.success("دسته‌بندی با موفقیت به‌روزرسانی شد.");
    } else {
      toast.error(error || "خطا در به‌روزرسانی دسته‌بندی.");
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string | undefined) => {
    if (!id || !adminToken) return;
    if (window.confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟")) {
      const success = await deleteCategory(id, adminToken);
      if (success) {
        fetchCategories(); // Re-fetch
      }
    }
  };
  
  const handleOpenEditModal = (category: Category) => {
    setEditingCategory({ 
      ...category,
      // Ensure is_active is explicitly a boolean, defaulting to true if undefined from source
      is_active: category.is_active === undefined ? true : category.is_active,
      show_in_header: category.show_in_header === undefined ? false : category.show_in_header
    }); 
    setNewCategory({}); // Clear newCategory form when opening edit
    setEditingCategoryImage(null); 
    setIsAddModalOpen(true); 
  };


  // Move category up/down (Local state update, needs API integration for persistence)
  // These functions will need to be adapted if category order is managed by the backend
  const moveCategoryUp = (id: string | undefined) => {
    // Placeholder - implement with backend if reordering is a feature
    console.log("Move up:", id);
  };

  const moveCategoryDown = (id: string | undefined) => {
    // Placeholder - implement with backend if reordering is a feature
    console.log("Move down:", id);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  if (isLoading && categories.length === 0) { 
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
      </div>
    );
  }


  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">مدیریت دسته‌بندی‌ها</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <Button
          variant="primary"
          size="sm"
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
          onClick={() => {
            setEditingCategory(null); 
            setNewCategory({ name: "", slug: "", description: "", parent_id: null, is_active: true, show_in_header: false });
            setNewCategoryImage(null);
            setEditingCategoryImage(null); // Also reset editing image
            setIsAddModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 ml-1" />
          افزودن دسته‌بندی
        </Button>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          خطا در بارگذاری دسته‌بندی‌ها: {error}
          <Button onClick={() => fetchCategories()} variant="ghost" size="sm" className="mr-2">
            تلاش مجدد
          </Button>
        </motion.div>
      )}

      <motion.div
        className="mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
            placeholder="جستجوی دسته‌بندی..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Categories List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading && categories.length > 0 && ( 
          <div className="flex justify-center my-4">
            <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
          </div>
        )}
        {currentCategories.length > 0 ? (
          <div className="space-y-4">
            {currentCategories.map((category, index) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                className="transition-all duration-300"
              >
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0">
                        {category.image ? (
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
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {category.name}
                            </h3>
                            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {category.description || "بدون توضیحات"}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                category.is_active 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              {category.is_active ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center mt-2 text-sm">
                          <div className="flex items-center">
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              دسته والد: {getParentCategoryName(category.parent_id)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => handleOpenEditModal(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <Tags className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                {searchTerm ? "دسته‌بندی یافت نشد" : "هیچ دسته‌بندی وجود ندارد"}
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                {searchTerm
                  ? "هیچ دسته‌بندی با جستجوی مورد نظر یافت نشد"
                  : "ابتدا یک دسته‌بندی جدید اضافه کنید."}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                >
                  پاک کردن جستجو
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-1 space-x-reverse bg-white dark:bg-voxcina-blue/30 rounded-xl p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === 1
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (number) => (
                  <Button
                    key={number}
                    variant={currentPage === number ? "primary" : "ghost"}
                    size="sm"
                    className={`rounded-lg ${
                      currentPage === number
                        ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                        : "text-voxcina-blue dark:text-voxcina-cream"
                    }`}
                    onClick={() => paginate(number)}
                  >
                    {number}
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === totalPages
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                {editingCategory ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCategory(null);
                  setNewCategoryImage(null);
                  setEditingCategoryImage(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام دسته‌بندی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingCategory ? editingCategory.name : newCategory.name || ""}
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({ ...editingCategory, name: e.target.value })
                      : setNewCategory({ ...newCategory, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نامک (Slug)
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingCategory ? editingCategory.slug || "" : newCategory.slug || ""}
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({ ...editingCategory, slug: e.target.value })
                      : setNewCategory({ ...newCategory, slug: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  توضیحات
                </label>
                <textarea
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  rows={3}
                  value={
                    editingCategory
                      ? editingCategory.description || ""
                      : newCategory.description || ""
                  }
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({ ...editingCategory, description: e.target.value })
                      : setNewCategory({ ...newCategory, description: e.target.value })
                  }
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  دسته‌بندی والد
                </label>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={
                    editingCategory
                      ? editingCategory.parent_id || ""
                      : newCategory.parent_id || ""
                  }
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({
                          ...editingCategory,
                          parent_id: e.target.value || null,
                        })
                      : setNewCategory({ ...newCategory, parent_id: e.target.value || null })
                  }
                >
                  <option value="">بدون والد (دسته‌بندی اصلی)</option>
                  {isLoading ? (
                    <option value="" disabled>در حال بارگذاری دسته‌بندی‌ها...</option>
                  ) : (
                    categories
                      .filter((cat) => !editingCategory || cat.id !== editingCategory.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id!}>
                          {cat.name}
                        </option>
                      ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  تصویر دسته‌بندی
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-voxcina-blue dark:text-voxcina-cream file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-voxcina-cream/50 dark:file:bg-voxcina-blue/50 file:text-voxcina-blue dark:file:text-voxcina-cream hover:file:bg-voxcina-cream dark:hover:file:bg-voxcina-blue cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      if (editingCategory) {
                        setEditingCategoryImage(e.target.files[0]);
                      } else {
                        setNewCategoryImage(e.target.files[0]);
                      }
                    }
                  }}
                />
                {(editingCategory?.image && !editingCategoryImage) && (
                  <div className="mt-2">
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">تصویر فعلی:</p>
                    <img src={editingCategory.image} alt="Current category" className="w-20 h-20 rounded-md object-cover mt-1" />
                  </div>
                )}
                 {(editingCategoryImage || newCategoryImage) && (
                    <div className="mt-2">
                    <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">پیش‌نمایش تصویر جدید:</p>
                    <img 
                        src={URL.createObjectURL(editingCategoryImage || newCategoryImage!)} 
                        alt="New category preview" 
                        className="w-20 h-20 rounded-md object-cover mt-1" 
                    />
                    </div>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={editingCategory ? "isActiveEdit" : "isActive"}
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2 h-4 w-4"
                  checked={
                    editingCategory
                      ? editingCategory.is_active === undefined ? true : editingCategory.is_active 
                      : newCategory.is_active === undefined ? true : newCategory.is_active 
                  }
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({ ...editingCategory, is_active: e.target.checked })
                      : setNewCategory({ ...newCategory, is_active: e.target.checked })
                  }
                />
                <label
                  htmlFor={editingCategory ? "isActiveEdit" : "isActive"}
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer"
                >
                  دسته‌بندی فعال است
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={editingCategory ? "showInHeaderEdit" : "showInHeader"}
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2 h-4 w-4"
                  checked={
                    editingCategory
                      ? editingCategory.show_in_header === undefined
                        ? false
                        : editingCategory.show_in_header
                      : newCategory.show_in_header === undefined
                        ? false
                        : newCategory.show_in_header
                  }
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({ ...editingCategory, show_in_header: e.target.checked })
                      : setNewCategory({ ...newCategory, show_in_header: e.target.checked })
                  }
                />
                <label
                  htmlFor={editingCategory ? "showInHeaderEdit" : "showInHeader"}
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer"
                >
                  نمایش در هدر سایت
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCategory(null);
                  setNewCategoryImage(null);
                  setEditingCategoryImage(null);
                }}
                disabled={isLoading}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300 min-w-[80px]"
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={
                  isLoading ||
                  (editingCategory ? !editingCategory.name : !(newCategory.name))
                }
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : editingCategory ? (
                  "به‌روزرسانی"
                ) : (
                  "افزودن"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 