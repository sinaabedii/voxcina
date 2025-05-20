'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/store/product-store';
import ProductGrid from '@/components/product/ProductGrid';
import { motion } from 'framer-motion';
import { PackageOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CategoryDetailPageProps {
  params: {
    categoryId: string;
  };
}

// Define a local interface for the category
interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { categoryId } = params;
  const { 
    // Remove activeCategory from here
    // fetchCategoryById, // This doesn't seem to exist in your store
    categories,
    setFilter,
    getFilteredProducts,
    isLoading,
    products // Use products to find category information
  } = useProductStore();
  
  // Create a local state for the active category
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  useEffect(() => {
    // Set filter to show only products from this category
    setFilter({ categories: [categoryId] });

    // Find the category from categories list, NOT from products
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      setActiveCategory({
        id: category.id!,
        name: category.name,
        description: category.description
      });
    } else {
      setActiveCategory(null);
    }
  }, [categoryId, categories, setFilter]);

  const filteredProducts = getFilteredProducts();

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
          <p className="text-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">در حال بارگذاری دسته‌بندی...</p>
        </div>
      </div>
    );
  }

  if (!activeCategory) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center">
        <motion.div 
          className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 border border-red-100 dark:border-red-800/30 shadow-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <PackageOpen className="h-10 w-10 text-red-500 dark:text-red-400" />
        </motion.div>
        <motion.p 
          className="text-lg text-red-600 dark:text-red-400 font-medium mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          دسته‌بندی مورد نظر یافت نشد
        </motion.p>
        <motion.p 
          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 text-center max-w-md"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          متأسفانه دسته‌بندی مورد نظر شما در سیستم موجود نمی‌باشد. لطفاً از سایر دسته‌بندی‌ها استفاده کنید.
        </motion.p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5 }}
        >
          <Link 
            href="/products" 
            className="inline-flex items-center px-5 py-2.5 bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream text-white dark:text-voxcina-blue font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            مشاهده همه محصولات
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="mb-8"
          variants={itemVariants}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream relative inline-block">
            <span className="relative z-10">{activeCategory.name}</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
          </h1>
          {activeCategory.description && (
            <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-3 max-w-3xl">{activeCategory.description}</p>
          )}
        </motion.div>
        
        {filteredProducts.length === 0 ? (
          <motion.div 
            className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-sm py-16 px-6 backdrop-blur-sm"
            variants={itemVariants}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-voxcina-cream/50 dark:bg-voxcina-blue/30 flex items-center justify-center mb-4 shadow-sm">
                <PackageOpen className="h-8 w-8 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              </div>
              <p className="text-lg font-medium mb-2 text-voxcina-blue dark:text-voxcina-cream">
                متأسفانه محصولی در این دسته‌بندی یافت نشد
              </p>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 max-w-md">
                در حال حاضر محصولی در این دسته‌بندی موجود نیست. لطفاً بعداً مراجعه کنید یا دسته‌بندی دیگری را انتخاب نمایید.
              </p>
              <Link 
                href="/products" 
                className="inline-flex items-center px-4 py-2 bg-voxcina-cream/50 hover:bg-voxcina-cream dark:bg-voxcina-blue/20 dark:hover:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                مشاهده همه محصولات
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.p 
              className="mb-6 text-voxcina-blue/60 dark:text-voxcina-cream/60 flex items-center"
              variants={itemVariants}
            >
              <span className="w-6 h-6 inline-flex items-center justify-center bg-voxcina-cream/50 dark:bg-voxcina-blue/30 rounded-full text-voxcina-blue dark:text-voxcina-cream text-sm font-medium ml-2">{filteredProducts.length}</span>
              محصول یافت شد
            </motion.p>
            <motion.div variants={itemVariants}>
              <ProductGrid products={filteredProducts} columns={3} />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}