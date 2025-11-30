"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  ChevronRight,
  ChevronLeft,
  X,
  SlidersHorizontal,
  Upload,
  ArrowDownUp,
  Loader2,
  ImageIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { Product } from "@/types/product";
import { Category } from "@/types/category";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [stockFilter, setStockFilter] = useState("all");

  const {
    products,
    fetchProducts,
    deleteProduct,
    isLoading: isLoadingProducts,
    error: productsError,
    brands,
    fetchBrands,
  } = useProductStore();

  const {
    categories,
    fetchCategories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    getCategoryName,
  } = useCategoryStore();

  const { adminToken } = useAuthStore();

  useEffect(() => {
    if (adminToken) {
      fetchProducts();
      fetchCategories();
      fetchBrands();
    }
  }, [adminToken, fetchProducts, fetchCategories, fetchBrands]);

  const getBrandNameById = (brandId: string | undefined): string => {
    if (!brandId) return "N/A";
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : "N/A";
  };

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === "all" ||
      product.category_ids?.includes(selectedCategoryFilter);

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "inStock" && product.inStock) ||
      (stockFilter === "outOfStock" && !product.inStock);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "priceAsc":
        return a.price - b.price;
      case "priceDesc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name);
      case "stock":
        return (a.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0) - 
               (b.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0);
      case "newest":
      default:
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
  });

  const productsPerPage = 6;
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleDeleteProduct = async (productId: string | undefined) => {
    if (!productId || !adminToken) return;
    if (window.confirm("آیا از حذف این محصول اطمینان دارید؟")) {
      const success = await deleteProduct(productId, adminToken);
      if (success) {
        toast.success("محصول با موفقیت حذف شد.");
        fetchProducts();
      } else {
        toast.error(productsError || "خطا در حذف محصول.");
      }
    }
  };

  const getProductCategoryNames = (categoryIds: string[] | undefined): string => {
    if (!categoryIds || categoryIds.length === 0) return "بدون دسته بندی";
    return categoryIds.map(id => getCategoryName(id)).join(", ");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  };

  if ((isLoadingProducts || isLoadingCategories) && products.length === 0) {
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
          <span className="relative z-10">مدیریت محصولات</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <div className="flex gap-2">
          <Link href="/admin/products/import">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            >
              <Upload className="w-4 h-4 ml-1" />
              ورود اطلاعات
            </Button>
          </Link>
          <Link href="/admin/products/add">
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Plus className="w-4 h-4 ml-1" />
              افزودن محصول
            </Button>
          </Link>
        </div>
      </motion.div>

      {(productsError || categoriesError) && (
        <motion.div 
            className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl shadow"
            initial={{opacity: 0}} animate={{opacity: 1}}
        >
            {productsError && <p>خطا در بارگذاری محصولات: {productsError}</p>}
            {categoriesError && <p>خطا در بارگذاری دسته‌بندی‌ها: {categoriesError}</p>}
            <Button onClick={() => { fetchProducts(); fetchCategories(); fetchBrands(); }} variant="ghost" size="sm" className="mr-2">
                تلاش مجدد
            </Button>
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Filters - Desktop */}
        <motion.div
          className="hidden lg:block col-span-1"
          variants={itemVariants}
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 sticky top-28">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                <Filter className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                فیلترها
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">
                  دسته‌بندی
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="categoryFilter"
                      value="all"
                      checked={selectedCategoryFilter === "all"}
                      onChange={() => setSelectedCategoryFilter("all")}
                      className="rounded-full text-voxcina-blue focus:ring-voxcina-blue mr-2"
                    />
                    <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      همه دسته‌بندی‌ها
                    </span>
                  </label>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        name="categoryFilter"
                        value={category.id}
                        checked={selectedCategoryFilter === category.id}
                        onChange={() => setSelectedCategoryFilter(category.id || "all")}
                        className="rounded-full text-voxcina-blue focus:ring-voxcina-blue mr-2"
                      />
                      <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">
                  موجودی
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="stockFilter"
                      value="all"
                      checked={stockFilter === "all"}
                      onChange={() => setStockFilter("all")}
                      className="rounded-full text-voxcina-blue focus:ring-voxcina-blue mr-2"
                    />
                    <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      همه
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="stockFilter"
                      value="inStock"
                      checked={stockFilter === "inStock"}
                      onChange={() => setStockFilter("inStock")}
                      className="rounded-full text-voxcina-blue focus:ring-voxcina-blue mr-2"
                    />
                    <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      موجود
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="stockFilter"
                      value="outOfStock"
                      checked={stockFilter === "outOfStock"}
                      onChange={() => setStockFilter("outOfStock")}
                      className="rounded-full text-voxcina-blue focus:ring-voxcina-blue mr-2"
                    />
                    <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                      ناموجود
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">
                  مرتب‌سازی
                </h3>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">جدیدترین</option>
                  <option value="name">نام محصول</option>
                  <option value="priceAsc">قیمت (کم به زیاد)</option>
                  <option value="priceDesc">قیمت (زیاد به کم)</option>
                  <option value="stock">موجودی (کم به زیاد)</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                onClick={() => {
                  setSelectedCategoryFilter("all");
                  setStockFilter("all");
                  setSortBy("newest");
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
              >
                <X className="w-4 h-4 ml-1" />
                پاک کردن فیلترها
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products List */}
        <motion.div className="col-span-1 lg:col-span-3" variants={itemVariants}>
          <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <input
                type="text"
                className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
                placeholder="جستجوی محصول..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <SlidersHorizontal className="w-4 h-4 ml-1" />
              فیلترها (موبایل)
            </Button>
          </div>

          {/* Mobile Filter Panel */}
          {isFilterOpen && (
            <motion.div
              className="lg:hidden mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between text-voxcina-blue dark:text-voxcina-cream">
                        فیلترهای محصولات
                        <Button variant="ghost" size="sm" onClick={() => setIsFilterOpen(false)} className="rounded-full p-1">
                            <X className="w-4 h-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                        دسته‌بندی
                      </h3>
                      <select
                        className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                        value={selectedCategoryFilter}
                        onChange={(e) => {setSelectedCategoryFilter(e.target.value); setCurrentPage(1);}}
                      >
                        <option value="all">همه دسته‌بندی‌ها</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id || "all"}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                        موجودی
                      </h3>
                      <select
                        className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                        value={stockFilter}
                        onChange={(e) => {setStockFilter(e.target.value); setCurrentPage(1);}}
                      >
                        <option value="all">همه</option>
                        <option value="inStock">موجود</option>
                        <option value="outOfStock">ناموجود</option>
                      </select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                        مرتب‌سازی
                      </h3>
                      <select
                        className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                        value={sortBy}
                        onChange={(e) => {setSortBy(e.target.value); setCurrentPage(1);}}
                      >
                        <option value="newest">جدیدترین</option>
                        <option value="name">نام محصول</option>
                        <option value="priceAsc">قیمت (کم به زیاد)</option>
                        <option value="priceDesc">قیمت (زیاد به کم)</option>
                        <option value="stock">موجودی (کم به زیاد)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                      onClick={() => {
                        setSelectedCategoryFilter("all");
                        setStockFilter("all");
                        setSortBy("newest");
                        setSearchTerm("");
                        setIsFilterOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      <X className="w-4 h-4 ml-1" />
                      پاک کردن فیلترها
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {(isLoadingProducts || isLoadingCategories) && currentProducts.length > 0 && (
            <div className="flex justify-center my-4">
                <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
            </div>
          )}

          {/* Products Grid or Empty State */}
          {currentProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 h-full flex flex-col justify-between">
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0 flex items-center justify-center">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                          )}
                        </div>
                        <div className="mr-3 flex-grow">
                          <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream leading-tight">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {getProductCategoryNames(product.category_ids)}
                            </span>
                            <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                           <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
                                برند: {getBrandNameById(product.brand_id)}
                            </div>
                          <div className="flex items-center justify-between mt-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                product.inStock
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              {product.inStock
                                ? `${product.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0} عدد`
                                : "ناموجود"}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                product.is_active
                                  ? "bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream/90"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                              }`}
                            >
                              {product.is_active ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                      </div>
                      </CardContent>
                      <div className="flex justify-end p-2 border-t border-voxcina-cream/20 dark:border-voxcina-blue/30 space-x-1 space-x-reverse bg-white/50 dark:bg-voxcina-blue/5">
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/products/${product.id}`} target="_blank">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={isLoadingProducts}
                        >
                          {isLoadingProducts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 lg:col-span-3">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                  <Package className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  محصولی یافت نشد
                </h3>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                  {searchTerm || selectedCategoryFilter !== 'all' || stockFilter !== 'all' 
                    ? "هیچ محصولی با فیلترهای انتخاب شده یافت نشد"
                    : "هیچ محصولی برای نمایش وجود ندارد. ابتدا یک محصول اضافه کنید."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategoryFilter("all");
                    setStockFilter("all");
                    setSortBy("newest");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                >
                  پاک کردن فیلترها
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
      </motion.div>
    </div>
  );
} 