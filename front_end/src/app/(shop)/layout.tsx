'use client';

import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useProductStore } from '@/store/product-store';
import { useCategoryStore } from '@/store/category-store';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fetchProducts } = useProductStore();
  const { fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}