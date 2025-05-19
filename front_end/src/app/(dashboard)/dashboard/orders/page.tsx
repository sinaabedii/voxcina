'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/store/product-store';
import { useDashboardStore } from '@/store/dashboard-store';
import { Card, CardContent } from '@/components/ui/Card';
import { Heart, ShoppingCart, Trash2, Search, Clock, Filter, ArrowRight } from 'lucide-react';
import { Product } from '@/types/product';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { getBrandName, getCategoryName } from "@/lib/utils";

export default function FavoritesPage() {
  const { products, isLoading, brands, categories} = useProductStore();
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
  }, [favorites, products, isLoading, searchQuery, sortOption, brands, categories]);

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

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0 text-voxcina-blue dark:text-secondary-200 relative">
          <span className="relative z-10 flex items-center">
            <Heart className="w-6 h-6 text-voxcina-blue dark:text-secondary-200 ml-2" />
            محصولات موردعلاقه
          </span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو در علاقه‌مندی‌ها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-blue/10 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
            />
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-voxcina-blue/60 dark:text-secondary-300" />
          </div>
          
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="h-10 pr-4 pl-10 rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-blue/10 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 text-sm appearance-none cursor-pointer text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
            >
              <option value="newest">جدیدترین</option>
              <option value="oldest">قدیمی‌ترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
            </select>
            <Filter className="w-5 h-5 absolute left-3 top-2.5 text-voxcina-blue/60 dark:text-secondary-300 pointer-events-none" />
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
          {Array.from({ length: 6 }, (_, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden bg-white/90 dark:bg-voxcina-blue/10 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="aspect-square bg-secondary-100 dark:bg-voxcina-darkBlue/20 animate-pulse-soft"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-secondary-200 dark:bg-voxcina-darkBlue/30 rounded-lg animate-pulse-soft"></div>
                    <div className="h-4 bg-secondary-200 dark:bg-voxcina-darkBlue/30 rounded-lg w-2/3 animate-pulse-soft"></div>
                    <div className="pt-2 flex justify-between items-center">
                      <div className="h-6 bg-secondary-200 dark:bg-voxcina-darkBlue/30 rounded-lg w-1/3 animate-pulse-soft"></div>
                      <div className="h-8 w-8 rounded-full bg-secondary-200 dark:bg-voxcina-darkBlue/30 animate-pulse-soft"></div>
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
          <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden bg-white/90 dark:bg-voxcina-blue/10 backdrop-blur-sm">
            <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <motion.div 
                  className="absolute inset-0 bg-voxcina-blue/10 dark:bg-voxcina-blue/20 rounded-full opacity-30"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut" 
                  }}
                ></motion.div>
                <div className="relative bg-gradient-to-br from-secondary-100 to-secondary-200 dark:from-voxcina-darkBlue/20 dark:to-voxcina-blue/20 p-6 rounded-full shadow-soft">
                  <Heart className="w-16 h-16 text-voxcina-blue dark:text-secondary-200" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200">
                {searchQuery 
                  ? 'محصولی با این مشخصات یافت نشد' 
                  : 'هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید'}
              </h3>
              
              <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-8 max-w-md">
                {searchQuery 
                  ? 'جستجوی دیگری را امتحان کنید یا فیلترها را تغییر دهید.' 
                  : 'با کلیک روی آیکون قلب در صفحه محصولات، آنها را به لیست علاقه‌مندی‌های خود اضافه کنید.'}
              </p>
              
              {!searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button 
                    onClick={handleNavigateToShop}
                    variant="primary"
                    className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
                  >
                    <ShoppingCart className="w-4 h-4 ml-2" />
                    مشاهده فروشگاه
                  </Button>
                </motion.div>
              )}
              
              {searchQuery && (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button 
                    onClick={() => setSearchQuery('')}
                    variant="outline"
                    className="mt-2 rounded-xl border-secondary-200 text-voxcina-blue dark:border-voxcina-darkBlue/30 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-voxcina-darkBlue/20"
                  >
                    پاک کردن جستجو
                  </Button>
                </motion.div>
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
            <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300 bg-secondary-100 dark:bg-voxcina-blue/10 px-4 py-2 rounded-full shadow-inner-soft">
              <span className="font-bold text-voxcina-blue dark:text-secondary-200">{favoriteProducts.length}</span> محصول یافت شد
            </p>
            
            {favoriteProducts.length > 0 && favorites.length > favoriteProducts.length && searchQuery && (
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="text-voxcina-blue hover:text-voxcina-darkBlue hover:bg-voxcina-blue/5 dark:text-secondary-200 dark:hover:bg-voxcina-blue/20 rounded-xl"
                >
                  نمایش همه ({favorites.length})
                </Button>
              </motion.div>
            )}
          </motion.div>
          
          <AnimatePresence>
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
                  whileHover={{ y: -8 }}
                >
                  <Card className="h-full group border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft hover:shadow-medium transition-all overflow-hidden rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 backdrop-blur-sm">
                    <CardContent className="p-0 relative h-full flex flex-col">
                      <div className="aspect-square bg-secondary-100 dark:bg-voxcina-darkBlue/30 relative overflow-hidden rounded-t-2xl">
                        {product.images && product.images[0] && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        
                        <motion.button
                          disabled={!product.id}
                          onClick={() => product.id && handleRemoveFavorite(product.id)}
                          className="absolute top-3 left-3 p-2 bg-white/80 dark:bg-voxcina-darkBlue/60 backdrop-blur-sm rounded-full shadow-soft opacity-0 group-hover:opacity-100 transition-opacity hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/30 z-10"
                          aria-label="حذف از علاقه‌مندی‌ها"
                          title="حذف از علاقه‌مندی‌ها"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="w-4 h-4 text-voxcina-blue dark:text-secondary-200" />
                        </motion.button>
                        
                        <div className="absolute top-3 right-3 p-1.5 bg-voxcina-blue/10 dark:bg-voxcina-blue/30 backdrop-blur-sm rounded-lg shadow-soft">
                          <Clock className="w-4 h-4 text-voxcina-blue dark:text-secondary-200" />
                        </div>
                      </div>
                      
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className="font-medium text-voxcina-blue dark:text-secondary-200 mb-1 line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-sm text-voxcina-blue/60 dark:text-secondary-300 mb-3">
                          {getBrandName(product.brand_id, brands)}
                        </p>
                        
                        <div className="mt-auto">
                          <div className="flex justify-between items-center mb-3">
                            <div className="font-bold text-voxcina-blue dark:text-secondary-200 bg-secondary-100 dark:bg-voxcina-blue/20 px-3 py-1 rounded-lg">
                              {new Intl.NumberFormat('fa-IR').format(product.price)} تومان
                            </div>
                            
                            <motion.button 
                              className="p-2 text-voxcina-blue hover:text-voxcina-darkBlue hover:bg-voxcina-blue/5 dark:text-secondary-200 dark:hover:bg-voxcina-blue/20 rounded-full"
                              onClick={() => router.push(`/products/${product.id}`)}
                              whileHover={{ scale: 1.1, rotate: -10 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </motion.button>
                          </div>
                          
                          <div className="pt-3 border-t border-secondary-100 dark:border-voxcina-darkBlue/20">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20 transition-colors group relative overflow-hidden"
                              >
                                <span className="absolute inset-0 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                                <ShoppingCart className="w-4 h-4 ml-2 relative z-10" />
                                <span className="relative z-10">افزودن به سبد خرید</span>
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}