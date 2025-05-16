'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/store/product-store';
import ProductGrid from '@/components/product/ProductGrid';

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
    setFilter,
    getFilteredProducts,
    isLoading,
    products // Use products to find category information
  } = useProductStore();
  
  // Create a local state for the active category
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  useEffect(() => {
    // Find the category from products
    const findCategory = () => {
      const product = products.find(p => p.categoryId === categoryId);
      if (product) {
        setActiveCategory({
          id: product.categoryId,
          name: product.category, // Assuming product.category contains the name
          description: '' // You might need to get this from elsewhere
        });
      }
    };

    // Set filter to show only products from this category
    setFilter({ categories: [categoryId] });
    
    // Find the category info from products
    findCategory();
  }, [categoryId, products, setFilter]);

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