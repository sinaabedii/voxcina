'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProductStore } from '@/store/product-store';
import { motion } from 'framer-motion';
import { Layers, ArrowUpRight } from 'lucide-react';

// Define a local interface for the category
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function CategoriesPage() {
  // Remove properties that don't exist in ProductState
  const { isLoading, products, fetchProducts, categories: storeCategories } = useProductStore();

  
  // Create a local state for categories
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!products.length || !storeCategories.length) return;

    // Build a set of all category IDs referenced by products
    const categoryIds = new Set<string>();
    products.forEach(product => {
      if (Array.isArray(product.category_ids)) {
        product.category_ids.forEach(id => categoryIds.add(id));
      }
    });

    // Now map these IDs to real categories
    const uniqueCategories = Array.from(categoryIds)
      .map(id => storeCategories.find(cat => cat.id === id))
      .filter(Boolean) as Category[];

    setCategories(uniqueCategories);
  }, [products, storeCategories]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">در حال بارگذاری دسته‌بندی‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">دسته‌بندی‌های محصولات</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {categories.length > 0 ? (
          categories.map((category) => (
            <motion.div
              key={category.id}
              variants={itemVariants}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                href={`/categories/${category.slug}`}
                className="group block"
              >
                <div className="relative h-40 sm:h-48 md:h-56 rounded-2xl overflow-hidden bg-voxcina-cream/30 dark:bg-voxcina-blue/20 border border-voxcina-cream/50 dark:border-voxcina-blue/30 shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-t from-voxcina-blue/60 to-voxcina-blue/30 dark:from-voxcina-blue/80 dark:to-voxcina-blue/40 backdrop-blur-xs flex items-center justify-center transition-all duration-300 group-hover:from-voxcina-blue/70 group-hover:to-voxcina-blue/40 dark:group-hover:from-voxcina-blue/90 dark:group-hover:to-voxcina-blue/50">
                    <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-voxcina-cream/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Layers className="h-8 w-8 text-white dark:text-voxcina-cream/90" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                    <h3 className="text-white dark:text-voxcina-cream text-xl font-medium">{category.name}</h3>
                  </div>
                </div>
                
                <div className="mt-4 pl-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream group-hover:text-voxcina-blue/80 dark:group-hover:text-voxcina-cream/80 transition-colors duration-300">{category.name}</h3>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowUpRight className="h-4 w-4 text-voxcina-blue dark:text-voxcina-cream" />
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1.5 line-clamp-2">{category.description}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          <motion.div 
            className="col-span-1 md:col-span-3 bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm p-8 text-center backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/30 flex items-center justify-center mb-4 shadow-sm">
                <Layers className="h-8 w-8 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-voxcina-blue dark:text-voxcina-cream">
                هیچ دسته‌بندی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 max-w-md">
                در حال حاضر دسته‌بندی‌ای برای محصولات تعریف نشده است.
              </p>
              <Link 
                href="/products" 
                className="inline-flex items-center px-4 py-2 bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                مشاهده همه محصولات
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}