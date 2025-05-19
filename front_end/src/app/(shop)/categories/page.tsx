'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProductStore } from '@/store/product-store';

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

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">در حال بارگذاری دسته‌بندی‌ها...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-8">دسته‌بندی‌های محصولات</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group"
          >
            <div className="relative h-40 rounded-lg overflow-hidden bg-gray-300">
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                <h3 className="text-white text-xl font-medium">{category.name}</h3>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}