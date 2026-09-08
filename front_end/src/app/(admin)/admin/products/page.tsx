"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Package,
  Plus,
  Filter,
  Trash2,
  Edit,
  Eye,
  Upload,
  Loader2,
  ImageIcon,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { Product, ColorVariant } from "@/types/product";
import { Category } from "@/types/category";
import Link from "next/link";
import toast from "react-hot-toast";
import { describeCartReconciliation } from "@/lib/cart-reconciliation";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminSelect,
} from "@/components/admin/ui";

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [stockFilter, setStockFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    adminProducts,
    fetchAdminProducts,
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
      fetchAdminProducts();
      fetchCategories();
      fetchBrands();
    }
  }, [adminToken, fetchAdminProducts, fetchCategories, fetchBrands]);

  const getBrandNameById = (brandId: string | undefined): string => {
    if (!brandId) return "N/A";
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : "N/A";
  };

  const filteredProducts = adminProducts.filter((product: Product) => {
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

  // Helper function to calculate total inventory from color variants
  const getTotalInventory = (product: Product): number => {
    if (!product.colorVariants || product.colorVariants.length === 0) return 0;
    return product.colorVariants.reduce((total, cv) => {
      return total + (cv.sizes?.reduce((sum, s) => sum + s.quantity, 0) || 0);
    }, 0);
  };

  // Helper function to get display image (mainImages first, then first color's image)
  const getDisplayImage = (product: Product): string | null => {
    if (product.mainImages && product.mainImages.length > 0) {
      return product.mainImages[0];
    }
    if (product.colorVariants && product.colorVariants.length > 0) {
      const firstColorWithImage = product.colorVariants.find(cv => cv.images && cv.images.length > 0);
      if (firstColorWithImage) {
        return firstColorWithImage.images[0];
      }
    }
    return null;
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "priceAsc":
        return a.price - b.price;
      case "priceDesc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name);
      case "stock":
        return getTotalInventory(a) - getTotalInventory(b);
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

  const handleDeleteProduct = async () => {
    if (!deleteTarget?.id || !adminToken) return;
    // The product row, its images and its cart lines all go for good, so the
    // confirmation says so rather than asking about a reversible "حذف".
    setIsDeleting(true);
    const result = await deleteProduct(deleteTarget.id, adminToken);
    setIsDeleting(false);
    if (result) {
      setDeleteTarget(null);
      toast.success("محصول برای همیشه حذف شد.");
      if (result.cartReconciliation) {
        toast(describeCartReconciliation(result.cartReconciliation), { icon: "🛒", duration: 6000 });
      }
      fetchAdminProducts();
    } else {
      toast.error(productsError || "خطا در حذف محصول.");
    }
  };

  const clearFilters = () => {
    setSelectedCategoryFilter("all");
    setStockFilter("all");
    setSortBy("newest");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategoryFilter !== "all" ||
    stockFilter !== "all" ||
    sortBy !== "newest" ||
    searchTerm !== "";

  const getProductCategoryNames = (categoryIds: string[] | undefined): string => {
    if (!categoryIds || categoryIds.length === 0) return "بدون دسته بندی";
    return categoryIds.map(id => getCategoryName(id)).join(", ");
  };

  if ((isLoadingProducts || isLoadingCategories) && adminProducts.length === 0) {
    return <AdminLoading message="در حال بارگذاری محصولات..." />;
  }

  return (
    <div>
      <AdminPageHeader
        title="مدیریت محصولات"
        actions={
          <div className="flex gap-2">
            <Link href="/admin/products/import">
              <Button variant="outline" size="sm" className="rounded-xl">
                <Upload className="w-4 h-4 ml-1" />
                ورود اطلاعات
              </Button>
            </Link>
            <Link href="/admin/products/add">
              <Button variant="primary" size="sm" className="rounded-xl">
                <Plus className="w-4 h-4 ml-1" />
                افزودن محصول
              </Button>
            </Link>
          </div>
        }
      />

      {(productsError || categoriesError) && (
        <AdminError
          message={`خطا در بارگذاری: ${[productsError, categoriesError].filter(Boolean).join(" / ")}`}
          onRetry={() => { fetchAdminProducts(); fetchCategories(); fetchBrands(); }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters - Desktop */}
        <div className="hidden lg:block col-span-1">
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 sticky top-28">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                <Filter className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80 ml-2" />
                فیلترها
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <AdminField label="دسته‌بندی">
                <AdminSelect
                  value={selectedCategoryFilter}
                  onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">همه دسته‌بندی‌ها</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id || "all"}>
                      {category.name}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="موجودی">
                <AdminSelect
                  value={stockFilter}
                  onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">همه</option>
                  <option value="inStock">موجود</option>
                  <option value="outOfStock">ناموجود</option>
                </AdminSelect>
              </AdminField>

              <AdminField label="مرتب‌سازی">
                <AdminSelect
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">جدیدترین</option>
                  <option value="name">نام محصول</option>
                  <option value="priceAsc">قیمت (کم به زیاد)</option>
                  <option value="priceDesc">قیمت (زیاد به کم)</option>
                  <option value="stock">موجودی (کم به زیاد)</option>
                </AdminSelect>
              </AdminField>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl !border-red-200 !text-red-500 hover:!bg-red-50 dark:!border-red-800/40 dark:!text-red-400 dark:hover:!bg-red-900/20"
                  onClick={clearFilters}
                >
                  <X className="w-4 h-4 ml-1" />
                  پاک کردن فیلترها
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <div className="col-span-1 lg:col-span-3">
          <div className="lg:hidden">
            <AdminToolbar
              searchValue={searchTerm}
              onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
              searchPlaceholder="جستجوی محصول..."
              filterOpen={isFilterOpen}
              onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={() => { clearFilters(); setIsFilterOpen(false); }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminField label="دسته‌بندی">
                  <AdminSelect
                    value={selectedCategoryFilter}
                    onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">همه دسته‌بندی‌ها</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id || "all"}>
                        {category.name}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
                <AdminField label="موجودی">
                  <AdminSelect
                    value={stockFilter}
                    onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">همه</option>
                    <option value="inStock">موجود</option>
                    <option value="outOfStock">ناموجود</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="مرتب‌سازی">
                  <AdminSelect
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="newest">جدیدترین</option>
                    <option value="name">نام محصول</option>
                    <option value="priceAsc">قیمت (کم به زیاد)</option>
                    <option value="priceDesc">قیمت (زیاد به کم)</option>
                    <option value="stock">موجودی (کم به زیاد)</option>
                  </AdminSelect>
                </AdminField>
              </div>
            </AdminToolbar>
          </div>
          <div className="hidden lg:block">
            <AdminToolbar
              searchValue={searchTerm}
              onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
              searchPlaceholder="جستجوی محصول..."
            />
          </div>
          
          {(isLoadingProducts || isLoadingCategories) && currentProducts.length > 0 && (
            <div className="flex justify-center my-4">
                <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
            </div>
          )}

          {/* Products Grid or Empty State */}
          {currentProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentProducts.map((product) => (
                <div key={product.id}>
                  <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 h-full flex flex-col justify-between">
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0 flex items-center justify-center">
                          {getDisplayImage(product) ? (
                            <img
                              src={getDisplayImage(product)!}
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
                          {/* Color Swatches */}
                          {product.colorVariants && product.colorVariants.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1">
                                {product.colorVariants.length} رنگ:
                              </span>
                              <div className="flex gap-0.5">
                                {product.colorVariants.slice(0, 5).map((cv: ColorVariant, idx: number) => (
                                  <div
                                    key={idx}
                                    className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden"
                                    style={!cv.swatchImage && cv.color?.startsWith("#") ? { backgroundColor: cv.color } : undefined}
                                    title={cv.colorName || cv.color}
                                  >
                                    {cv.swatchImage && (
                                      <img src={cv.swatchImage} alt={cv.colorName} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                ))}
                                {product.colorVariants.length > 5 && (
                                  <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">+{product.colorVariants.length - 5}</span>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <AdminBadge tone={product.inStock ? "success" : "danger"}>
                              {product.inStock
                                ? `${getTotalInventory(product)} عدد`
                                : "ناموجود"}
                            </AdminBadge>
                            <AdminBadge tone={product.is_active ? "info" : "neutral"}>
                              {product.is_active ? "فعال" : "غیرفعال"}
                            </AdminBadge>
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
                          aria-label="حذف محصول"
                          className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                          onClick={() => setDeleteTarget(product)}
                          disabled={isLoadingProducts}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmpty
              icon={Package}
              title="محصولی یافت نشد"
              description={
                hasActiveFilters
                  ? "هیچ محصولی با فیلترهای انتخاب شده یافت نشد"
                  : "هیچ محصولی برای نمایش وجود ندارد. ابتدا یک محصول اضافه کنید."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
                    پاک کردن فیلترها
                  </Button>
                ) : (
                  <Link href="/admin/products/add">
                    <Button variant="primary" size="sm" className="rounded-xl">
                      <Plus className="w-4 h-4 ml-1" />
                      افزودن محصول
                    </Button>
                  </Link>
                )
              }
            />
          )}

          {/* Pagination */}
          <AdminPagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
        </div>
      </div>

      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف محصول"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          «{deleteTarget?.name}» برای همیشه از پایگاه داده حذف می‌شود و از سبد
          خرید همه مشتریان خارج خواهد شد. این کار قابل بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setDeleteTarget(null)}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteProduct}
            disabled={isDeleting}
            isLoading={isDeleting}
            className="rounded-xl"
          >
            حذف برای همیشه
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
