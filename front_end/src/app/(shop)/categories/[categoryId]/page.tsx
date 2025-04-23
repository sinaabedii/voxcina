'use client';

import { useEffect } from 'react';
import { useProductStore } from '@/store/product-store';
import ProductGrid from '@/components/product/ProductGrid';

interface CategoryDetailPageProps {
  params: {
    categoryId: string;
  };
}

export default function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { categoryId } = params;
  const { 
    activeCategory,
    fetchCategoryById,
    setFilter,
    getFilteredProducts,
    isLoading,
  } = useProductStore();

  useEffect(() => {
    fetchCategoryById(categoryId);
    setFilter({ categories: [categoryId] });
  }, [categoryId, fetchCategoryById, setFilter]);

  const filteredProducts = getFilteredProducts();

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">در حال بارگذاری دسته‌بندی...</p>
      </div>
    );
  }

  if (!activeCategory) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <p className="text-lg text-destructive">دسته‌بندی مورد نظر یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{activeCategory.name}</h1>
        {activeCategory.description && (
          <p className="text-muted-foreground mt-2">{activeCategory.description}</p>
        )}
      </div>
      
      {filteredProducts.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-center">
          <div>
            <p className="text-lg font-medium mb-4">
              متأسفانه محصولی در این دسته‌بندی یافت نشد
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-muted-foreground">
            {filteredProducts.length} محصول یافت شد
          </p>
          <ProductGrid products={filteredProducts} columns={3} />
        </>
      )}
    </div>
  );
}