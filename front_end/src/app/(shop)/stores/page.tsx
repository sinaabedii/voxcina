"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Store, MapPin, Star, Package, ChevronLeft } from "lucide-react";
import { useStoreStore } from "@/store/store-store";

export default function StoresPage() {
  const router = useRouter();
  const { stores, fetchStores, isLoading, pagination } = useStoreStore();

  useEffect(() => {
    fetchStores();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          فروشگاه‌ها
        </h1>
        <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
          فروشگاه‌های تایید شده را مرور کنید
        </p>
      </div>

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-voxcina-blue/50 rounded-xl">
          <Store className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
            هنوز فروشگاهی وجود ندارد
          </h3>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
            به زودی فروشگاه‌های جدید اضافه خواهند شد
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(`/stores/${store.slug}`)}
              className="bg-white dark:bg-voxcina-blue/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Store Banner */}
              <div className="relative h-32 bg-gradient-to-r from-green-400 to-green-600">
                {store.banner && (
                  <img
                    src={store.banner}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Store Logo */}
                <div className="absolute -bottom-8 right-4">
                  <div className="w-16 h-16 bg-white dark:bg-voxcina-blue rounded-xl shadow-lg flex items-center justify-center overflow-hidden border-4 border-white dark:border-voxcina-blue">
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-8 h-8 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Store Info */}
              <div className="p-4 pt-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {store.name}
                    </h3>
                    {store.is_verified && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        ✓ تایید شده
                      </span>
                    )}
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                </div>

                <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-3 line-clamp-2">
                  {store.description}
                </p>

                {/* Store Stats */}
                <div className="flex items-center gap-4 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{store.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>{store.product_count} محصول</span>
                  </div>
                </div>

                {/* Location */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {store.address.city}, {store.address.province}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => fetchStores(page)}
                className={`w-10 h-10 rounded-lg transition-colors ${
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
