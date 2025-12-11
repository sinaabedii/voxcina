"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Loader2,
} from "lucide-react";
import { useSellerStore } from "@/store/seller-store";
import { useAuthStore } from "@/store/auth-store";
import { Product } from "@/types/product";

export default function SellerProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const {
    products,
    fetchSellerProducts,
    deleteProduct,
    updateProduct,
    isLoading,
    pagination,
  } = useSellerStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (user?.role !== "seller") {
      router.push("/dashboard/become-seller");
      return;
    }
    fetchSellerProducts();

    // Check if we should open add modal
    if (searchParams.get("action") === "add") {
      setShowAddModal(true);
    }
  }, [user]);

  const handleToggleActive = async (product: Product) => {
    try {
      await updateProduct(product.id, { is_active: !product.is_active });
    } catch (error) {
      console.error("Failed to toggle product status:", error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm("آیا از حذف این محصول اطمینان دارید؟")) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
            محصولات من
          </h1>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
            مدیریت محصولات فروشگاه شما
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/seller/products/add")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          افزودن محصول جدید
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="جستجوی محصول..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-voxcina-blue/50 rounded-xl">
          <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
            هنوز محصولی ندارید
          </h3>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-4">
            اولین محصول خود را اضافه کنید
          </p>
          <button
            onClick={() => router.push("/dashboard/seller/products/add")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            افزودن محصول
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white dark:bg-voxcina-blue/50 rounded-xl overflow-hidden shadow-sm ${
                !product.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {!product.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                      غیرفعال
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-voxcina-blue dark:text-voxcina-cream mb-1 truncate">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {product.price.toLocaleString()} تومان
                </p>
                {product.originalPrice > product.price && (
                  <p className="text-sm text-gray-400 line-through">
                    {product.originalPrice.toLocaleString()} تومان
                  </p>
                )}

                {/* Stock Info */}
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.inStock
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {product.inStock ? "موجود" : "ناموجود"}
                  </span>
                  {product.variants?.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {product.variants.length} تنوع
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/seller/products/${product.id}/edit`)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    ویرایش
                  </button>
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`p-2 rounded-lg transition-colors ${
                      product.is_active
                        ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100"
                        : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100"
                    }`}
                    title={product.is_active ? "غیرفعال کردن" : "فعال کردن"}
                  >
                    {product.is_active ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => fetchSellerProducts(page)}
                className={`w-10 h-10 rounded-lg ${
                  pagination.currentPage === page
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
