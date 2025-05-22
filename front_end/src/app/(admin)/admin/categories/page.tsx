"use client";

import { useState } from "react";
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
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function AdminCategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    isActive: true,
  });

  // Mock categories data - would be fetched from API in real application
  const [categories, setCategories] = useState([
    {
      id: "cat-1",
      name: "الکترونیک",
      slug: "electronics",
      description: "محصولات الکترونیکی مانند موبایل، لپ تاپ و...",
      parentId: null,
      isActive: true,
      productsCount: 120,
      image: "https://placehold.co/60x60",
      subcategories: 8,
    },
    {
      id: "cat-2",
      name: "موبایل و تبلت",
      slug: "mobile-tablets",
      description: "انواع گوشی موبایل و تبلت",
      parentId: "cat-1",
      isActive: true,
      productsCount: 85,
      image: "https://placehold.co/60x60",
      subcategories: 4,
    },
    {
      id: "cat-3",
      name: "لپ تاپ و کامپیوتر",
      slug: "laptops-computers",
      description: "انواع لپ تاپ، کامپیوتر و لوازم جانبی",
      parentId: "cat-1",
      isActive: true,
      productsCount: 35,
      image: "https://placehold.co/60x60",
      subcategories: 4,
    },
    {
      id: "cat-4",
      name: "مد و پوشاک",
      slug: "fashion",
      description: "انواع لباس و پوشاک مردانه، زنانه و بچگانه",
      parentId: null,
      isActive: true,
      productsCount: 240,
      image: "https://placehold.co/60x60",
      subcategories: 12,
    },
    {
      id: "cat-5",
      name: "لباس مردانه",
      slug: "mens-clothing",
      description: "انواع لباس مردانه",
      parentId: "cat-4",
      isActive: true,
      productsCount: 95,
      image: "https://placehold.co/60x60",
      subcategories: 0,
    },
    {
      id: "cat-6",
      name: "لباس زنانه",
      slug: "womens-clothing",
      description: "انواع لباس زنانه",
      parentId: "cat-4",
      isActive: true,
      productsCount: 145,
      image: "https://placehold.co/60x60",
      subcategories: 0,
    },
    {
      id: "cat-7",
      name: "خانه و آشپزخانه",
      slug: "home-kitchen",
      description: "لوازم خانه و آشپزخانه",
      parentId: null,
      isActive: true,
      productsCount: 78,
      image: "https://placehold.co/60x60",
      subcategories: 6,
    },
    {
      id: "cat-8",
      name: "لوازم آشپزخانه",
      slug: "kitchen-appliances",
      description: "انواع لوازم آشپزخانه",
      parentId: "cat-7",
      isActive: true,
      productsCount: 45,
      image: "https://placehold.co/60x60",
      subcategories: 0,
    },
    {
      id: "cat-9",
      name: "کتاب و لوازم التحریر",
      slug: "books-stationery",
      description: "کتاب، مجله و لوازم التحریر",
      parentId: null,
      isActive: false,
      productsCount: 56,
      image: "https://placehold.co/60x60",
      subcategories: 3,
    },
    {
      id: "cat-10",
      name: "زیبایی و سلامت",
      slug: "beauty-health",
      description: "محصولات آرایشی، بهداشتی و سلامت",
      parentId: null,
      isActive: true,
      productsCount: 92,
      image: "https://placehold.co/60x60",
      subcategories: 5,
    },
  ]);

  // Filter categories by search term
  const filteredCategories = categories.filter((category: any) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sort categories by order
  const sortedCategories = [...filteredCategories].sort((a: any, b: any) => {
    return a.order - b.order;
  });

  // Parent categories for dropdown
  const parentCategories = categories.filter((cat: any) => cat.parentId === null);

  // Pagination
  const categoriesPerPage = 5;
  const totalPages = Math.ceil(filteredCategories.length / categoriesPerPage);
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstCategory, indexOfLastCategory);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Helper to get parent category name
  const getParentCategoryName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = categories.find((cat: any) => cat.id === parentId);
    return parent ? parent.name : "-";
  };

  // Add new category
  const handleAddCategory = () => {
    const newCategoryWithId = {
      ...newCategory,
      id: `cat-${categories.length + 1}`,
      productsCount: 0,
      image: "https://placehold.co/60x60",
      subcategories: 0,
    };
    
    setCategories([...categories, newCategoryWithId]);
    setNewCategory({
      name: "",
      slug: "",
      description: "",
      parentId: "",
      isActive: true,
    });
    setIsAddModalOpen(false);
  };

  // Update category
  const handleUpdateCategory = () => {
    if (!editingCategory) return;
    
    const updatedCategories = categories.map((cat: any) =>
      cat.id === editingCategory.id ? editingCategory : cat
    );
    setCategories(updatedCategories);
    setEditingCategory(null);
    setIsAddModalOpen(false);
  };

  // Delete category
  const handleDeleteCategory = (id: string) => {
    if (window.confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟")) {
      const updatedCategories = categories.filter((cat: any) => cat.id !== id);
      setCategories(updatedCategories);
    }
  };

  // Move category up in order
  const moveCategoryUp = (id: string) => {
    const updatedCategories = [...categories];
    const index = updatedCategories.findIndex((cat: any) => cat.id === id);
    if (index > 0) {
      // Swap with the category above
      [updatedCategories[index], updatedCategories[index - 1]] = [
        updatedCategories[index - 1],
        updatedCategories[index],
      ];
      setCategories(updatedCategories);
    }
  };

  // Move category down in order
  const moveCategoryDown = (id: string) => {
    const updatedCategories = [...categories];
    const index = updatedCategories.findIndex((cat: any) => cat.id === id);
    if (index < updatedCategories.length - 1) {
      // Swap with the category below
      [updatedCategories[index], updatedCategories[index + 1]] = [
        updatedCategories[index + 1],
        updatedCategories[index],
      ];
      setCategories(updatedCategories);
    }
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
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 ml-1" />
          افزودن دسته‌بندی
        </Button>
      </motion.div>

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
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mr-3 flex-grow">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {category.name}
                            </h3>
                            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {category.description}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                category.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              {category.isActive ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center mt-2 text-sm">
                          <div className="flex items-center ml-4">
                            <PackageOpen className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {category.productsCount} محصول
                            </span>
                          </div>
                          <div className="flex items-center ml-4">
                            <Tags className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {category.subcategories} زیردسته
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              دسته والد: {getParentCategoryName(category.parentId)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col space-y-1 mr-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => moveCategoryUp(category.id)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => moveCategoryDown(category.id)}
                          disabled={index === currentCategories.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
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
                دسته‌بندی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ دسته‌بندی با جستجوی مورد نظر یافت نشد
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                پاک کردن جستجو
              </Button>
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

      {/* Add Category Modal */}
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
                افزودن دسته‌بندی جدید
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام دسته‌بندی
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نامک (Slug)
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  توضیحات
                </label>
                <textarea
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  rows={3}
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  دسته‌بندی والد
                </label>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newCategory.parentId}
                  onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value })}
                >
                  <option value="">بدون والد (دسته‌بندی اصلی)</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
                  checked={newCategory.isActive}
                  onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.checked })}
                />
                <label
                  htmlFor="isActive"
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                >
                  دسته‌بندی فعال است
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setIsAddModalOpen(false)}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleAddCategory}
                disabled={!newCategory.name || !newCategory.slug}
              >
                افزودن دسته‌بندی
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                ویرایش دسته‌بندی
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setEditingCategory(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام دسته‌بندی
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نامک (Slug)
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  توضیحات
                </label>
                <textarea
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  rows={3}
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  دسته‌بندی والد
                </label>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingCategory.parentId || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, parentId: e.target.value || null })}
                >
                  <option value="">بدون والد (دسته‌بندی اصلی)</option>
                  {parentCategories
                    .filter((cat: any) => cat.id !== editingCategory.id)
                    .map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
                  checked={editingCategory.isActive}
                  onChange={(e) => setEditingCategory({ ...editingCategory, isActive: e.target.checked })}
                />
                <label
                  htmlFor="isActiveEdit"
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                >
                  دسته‌بندی فعال است
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setEditingCategory(null)}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleUpdateCategory}
                disabled={!editingCategory.name || !editingCategory.slug}
              >
                به‌روزرسانی
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 