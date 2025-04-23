'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useProductStore } from '@/store/product-store';

export default function CategoriesPage() {
  const { categories, fetchCategories, isLoading } = useProductStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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