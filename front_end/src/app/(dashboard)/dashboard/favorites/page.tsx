'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/store/product-store';
import { useDashboardStore } from '@/store/dashboard-store';
import { Card, CardContent } from '@/components/ui/Card';
import { Heart, ShoppingCart, Trash2, Search, Clock, Filter, ArrowRight } from 'lucide-react';
import { Product } from '@/types/product';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { getBrandName, getCategoryName } from "@/lib/utils";

export default function FavoritesPage() {
  const { products, isLoading ,brands, categories} = useProductStore();
  const { favorites, removeFromFavorites } = useDashboardStore();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && products.length > 0) {
      const favoriteProductsList = products.filter(product => 
        favorites.some(fav => fav.productId === product.id)
      );
      
      let filteredProducts = favoriteProductsList;
      if (searchQuery.trim() !== '') {
        filteredProducts = filteredProducts.filter(product => {
          const brandName = getBrandName(product.brand_id, brands);
          const categoryName = getCategoryName(product.category_ids, categories);
          return (
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            categoryName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        });
      }
      
      switch (sortOption) {
        case 'newest':
          filteredProducts.sort((a, b) => 
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
          );
          break;
        case 'oldest':
          filteredProducts.sort((a, b) => 
            new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
          );
          break;
        case 'price-asc':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        default:
          break;
      }
      
      setFavoriteProducts(filteredProducts);
    }
  }, [favorites, products, isLoading, searchQuery, sortOption]);

  const handleRemoveFavorite = (productId: string) => {
    setIsRemoving(productId);
    setTimeout(() => {
      removeFromFavorites(productId);
      setIsRemoving(null);
    }, 300);
  };

  const handleNavigateToShop = () => {
    router.push('/products');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  const skeletonLoaders = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="container py-8 md:py-12">
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent flex items-center">
          <Heart className="w-6 h-6 text-pink-500 ml-2" />
          محصولات موردعلاقه
        </h1>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو در علاقه‌مندی‌ها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400"
            />
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="h-10 pr-4 pl-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 text-sm appearance-none cursor-pointer"
            >
              <option value="newest">جدیدترین</option>
              <option value="oldest">قدیمی‌ترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
            </select>
            <Filter className="w-5 h-5 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </motion.div>
      
      {isLoading ? (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {skeletonLoaders.map((index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="border-0 shadow-md overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                    <div className="pt-2 flex justify-between items-center">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : favoriteProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-pink-100 dark:bg-pink-900/20 rounded-full animate-ping opacity-30"></div>
                <div className="relative bg-pink-50 dark:bg-pink-900/30 p-4 rounded-full">
                  <Heart className="w-16 h-16 text-pink-500" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                {searchQuery 
                  ? 'محصولی با این مشخصات یافت نشد' 
                  : 'هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                {searchQuery 
                  ? 'جستجوی دیگری را امتحان کنید یا فیلترها را تغییر دهید.' 
                  : 'با کلیک روی آیکون قلب در صفحه محصولات، آنها را به لیست علاقه‌مندی‌های خود اضافه کنید.'}
              </p>
              
              {!searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    onClick={handleNavigateToShop}
                    variant="primary"
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                  >
                    <ShoppingCart className="w-4 h-4 ml-2" />
                    مشاهده فروشگاه
                  </Button>
                </motion.div>
              )}
              
              {searchQuery && (
                <Button 
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  className="mt-2 rounded-xl"
                >
                  پاک کردن جستجو
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 flex justify-between items-center"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {favoriteProducts.length} محصول یافت شد
            </p>
            
            {favoriteProducts.length > 0 && favorites.length > favoriteProducts.length && searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchQuery('')}
                className="text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              >
                نمایش همه ({favorites.length})
              </Button>
            )}
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {favoriteProducts.map((product) => (
              <motion.div 
                key={product.id} 
                variants={itemVariants}
                className={isRemoving === product.id ? 'scale-95 opacity-50' : ''}
                transition={{ duration: 0.3 }}
              >
                <Card className="group border-0 shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <CardContent className="p-0 relative">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                      {product.images && product.images[0] && (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      
                      <button
                        disabled={!product.id}
                        onClick={() => product.id && handleRemoveFavorite(product.id)}
                        className="absolute top-2 left-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-pink-50 dark:hover:bg-pink-900/30"
                        aria-label="حذف از علاقه‌مندی‌ها"
                        title="حذف از علاقه‌مندی‌ها"
                      >
                        <Trash2 className="w-4 h-4 text-pink-500" />
                      </button>
                      
                      <div className="absolute top-2 right-2 p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                        <Clock className="w-4 h-4 text-pink-500" />
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {getBrandName(product.brand_id, brands)}
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('fa-IR').format(product.price)} تومان
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-2 text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-full"
                          onClick={() => router.push(`/products/${product.id}`)}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full rounded-xl border-pink-200 text-pink-700 dark:border-pink-800 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                        >
                          <ShoppingCart className="w-4 h-4 ml-2" />
                          افزودن به سبد خرید
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}