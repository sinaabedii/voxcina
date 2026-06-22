import { useEffect, useState } from "react";
import { useProductStore } from "@/store/product-store";
import { ProductFilter } from "@/types/product";

export const useProducts = (initialFilter?: Partial<ProductFilter>) => {
  const {
    products,
    isLoading,
    error,
    fetchProducts,
    setFilter,
    getFilteredProducts,
    clearFilters,
  } = useProductStore();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeProducts = async () => {
      if (products.length === 0) {
        await fetchProducts();
      }

      if (initialFilter) {
        setFilter(initialFilter);
      }

      setIsInitialized(true);
    };

    initializeProducts();

    return () => {
      clearFilters();
    };
  }, [fetchProducts, initialFilter, products.length, setFilter, clearFilters]);

  const filteredProducts = isInitialized ? getFilteredProducts() : [];

  return {
    products: filteredProducts,
    allProducts: products,
    isLoading,
    error,
    setFilter,
    clearFilters,
    isInitialized,
  };
};
