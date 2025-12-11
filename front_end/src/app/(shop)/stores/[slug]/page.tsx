"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Store as StoreIcon,
  MapPin,
  Star,
  Package,
  Phone,
  Mail,
  CheckCircle,
  ShoppingCart,
  Heart,
} from "lucide-react";
import { useStoreStore } from "@/store/store-store";
import { useCartStore } from "@/store/cart-store";
import { Product } from "@/types/product";
import BackendImage from "@/components/BackendImage";

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { currentStore, storeProducts, fetchStoreById, fetchStoreProducts, isLoading } =
    useStoreStore();
  const { addItem } = useCartStore();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (slug) {
      fetchStoreById(slug);
      fetchStoreProducts(slug);
    }
  }, [slug]);

  const handleAddToCart = (product: Product) => {
    // For simplicity, add first variant or default
    const variant = product.variants?.[0];
    if (variant) {
      addItem(product, 1, variant.size, variant.color);
    }
  };

  if (isLoading || !currentStore) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-voxcina-blue/95">
      {/* Store Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-64 bg-gradient-to-r from-green-400 to-green-600 relative">
          {currentStore.banner && (
            <BackendImage
              src={currentStore.banner}
              alt={currentStore.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        {/* Store Info */}
        <div className="container mx-auto px-4">
          <div className="relative -mt-20">
            <div className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Logo */}
                <div className="w-32 h-32 bg-white dark:bg-voxcina-blue rounded-xl shadow-lg flex items-center justify-center overflow-hidden border-4 border-white dark:border-voxcina-blue flex-shrink-0">
                  {currentStore.logo ? (
                    <BackendImage
                      src={currentStore.logo}
                      alt={currentStore.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon className="w-16 h-16 text-green-500" />
                  )}
                </div>

                {/* Store Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
                        {currentStore.name}
                      </h1>
                      {currentStore.is_verified && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          فروشگاه تایید شده
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-4">
                    {currentStore.description}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-voxcina-blue dark:text-voxcina-cream">
                        {currentStore.rating.toFixed(1)}
                      </span>
                      <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        ({currentStore.review_count} نظر)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      <span className="text-voxcina-blue dark:text-voxcina-cream">
                        {currentStore.product_count} محصول
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-green-500" />
                      <span className="text-voxcina-blue dark:text-voxcina-cream">
                        {currentStore.total_sales} فروش
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {currentStore.address.city}, {currentStore.address.province}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      <Phone className="w-4 h-4" />
                      <span>{currentStore.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      <Mail className="w-4 h-4" />
                      <span>{currentStore.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-6">
          محصولات فروشگاه
        </h2>

        {storeProducts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-voxcina-blue/50 rounded-xl">
            <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
              این فروشگاه هنوز محصولی ندارد
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {storeProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-voxcina-blue/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                {/* Product Image */}
                <div
                  className="relative aspect-square bg-gray-100 dark:bg-gray-800 cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  {product.images?.[0] ? (
                    <BackendImage
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {product.originalPrice > product.price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {Math.round(
                        ((product.originalPrice - product.price) / product.originalPrice) * 100
                      )}
                      % تخفیف
                    </div>
                  )}
                  <button
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-voxcina-blue/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add to wishlist logic
                    }}
                  >
                    <Heart className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3
                    className="font-semibold text-voxcina-blue dark:text-voxcina-cream mb-2 line-clamp-2 cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {product.price.toLocaleString()} تومان
                      </p>
                      {product.originalPrice > product.price && (
                        <p className="text-sm text-gray-400 line-through">
                          {product.originalPrice.toLocaleString()} تومان
                        </p>
                      )}
                    </div>
                    {product.inStock ? (
                      <span className="text-xs text-green-600 dark:text-green-400">موجود</span>
                    ) : (
                      <span className="text-xs text-red-600 dark:text-red-400">ناموجود</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.inStock}
                    className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    افزودن به سبد
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
