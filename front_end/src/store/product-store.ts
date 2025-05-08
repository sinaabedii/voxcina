import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, ProductFilter } from "@/types/product";
import { products as mockProducts } from "@/data/products";
import { categories as mockCategories } from "@/data/categories";
import { delay } from "@/lib/utils";

interface ProductState {
  products: Product[];
  featuredProducts: Product[];
  newProducts: Product[];
  isLoading: boolean;
  error: string | null;
  activeProduct: Product | null;
  filter: ProductFilter;
  recentlyViewed: Product[];
  comparedProducts: Product[];

  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  fetchFlashSaleProducts: () => Promise<void>;
  fetchNewProducts: () => Promise<void>;
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilters: () => void;
  getFilteredProducts: () => Product[];
  addRecentlyViewed: (product: Product) => void;
  removeRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompareList: () => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      featuredProducts: [],
      newProducts: [],
      isLoading: false,
      error: null,
      activeProduct: null,
      filter: {},
      recentlyViewed: [],
      comparedProducts: [],

      fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          await delay(500);
          set({ products: mockProducts, isLoading: false });
        } catch (error) {
          set({
            error: "خطا در دریافت محصولات. لطفا دوباره تلاش کنید.",
            isLoading: false,
          });
        }
      },

      fetchProductById: async (id: string) => {
        set({ isLoading: true, error: null, activeProduct: null });
        try {
          await delay(300);
          const product = mockProducts.find((p) => p.id === id);

          if (!product) {
            throw new Error("محصول یافت نشد");
          }

          set({ activeProduct: product, isLoading: false });

          get().addRecentlyViewed(product);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "خطای ناشناخته",
            isLoading: false,
          });
        }
      },

      fetchFlashSaleProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/products?is_flash_sale=true");
          if (!response.ok) {
            throw new Error("Failed to fetch flash sale products");
          }
          const data = await response.json();
          set({ featuredProducts: data, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "خطا در دریافت محصولات ویژه. لطفا دوباره تلاش کنید.",
            isLoading: false,
          });
        }
      },

      fetchNewProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/products?is_new=true");
          if (!response.ok) {
            throw new Error("Failed to fetch new products");
          }
          const data = await response.json();
          set({ newProducts: data, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "خطا در دریافت محصولات جدید. لطفا دوباره تلاش کنید.",
            isLoading: false,
          });
        }
      },

      setFilter: (filter) => {
        set({ filter: { ...get().filter, ...filter } });
      },

      clearFilters: () => {
        set({ filter: {} });
      },

      getFilteredProducts: () => {
        const { products, filter } = get();

        return products
          .filter((product) => {
            if (filter.inStockOnly && !product.inStock) {
              return false;
            }

            if (filter.categories && filter.categories.length > 0) {
              if (!filter.categories.includes(product.categoryId)) {
                return false;
              }
            }

            if (filter.brands && filter.brands.length > 0) {
              if (!filter.brands.includes(product.brand)) {
                return false;
              }
            }

            if (filter.priceRange) {
              if (
                product.price < filter.priceRange.min ||
                product.price > filter.priceRange.max
              ) {
                return false;
              }
            }

            if (filter.colors && filter.colors.length > 0 && product.colors) {
              const productColorCodes = product.colors.map((c) => c.code);
              if (
                !filter.colors.some((color) =>
                  productColorCodes.includes(color)
                )
              ) {
                return false;
              }
            }

            if (filter.sizes && filter.sizes.length > 0 && product.sizes) {
              if (!filter.sizes.some((size) => product.sizes?.includes(size))) {
                return false;
              }
            }

            if (typeof filter.rating === "number") {
              if (product.rating < filter.rating) {
                return false;
              }
            }

            if (filter.search && filter.search.trim() !== "") {
              const searchTerm = filter.search.toLowerCase();
              return (
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.brand.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
              );
            }

            return true;
          })
          .sort((a, b) => {
            if (!filter.sort) return 0;

            switch (filter.sort) {
              case "price-asc":
                return a.price - b.price;
              case "price-desc":
                return b.price - a.price;
              case "newest":
                return (
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                );
              case "rating":
                return b.rating - a.rating;
              case "popular":
                return b.reviewCount - a.reviewCount;
              default:
                return 0;
            }
          });
      },

      addRecentlyViewed: (product) => {
        const { recentlyViewed } = get();

        const updatedList = recentlyViewed.filter((p) => p.id !== product.id);

        const newList = [product, ...updatedList];

        const limitedList = newList.slice(0, 10);

        set({ recentlyViewed: limitedList });
      },

      removeRecentlyViewed: (productId) => {
        const { recentlyViewed } = get();
        const updatedList = recentlyViewed.filter((p) => p.id !== productId);
        set({ recentlyViewed: updatedList });
      },

      clearRecentlyViewed: () => {
        set({ recentlyViewed: [] });
      },

      addToCompare: (product) => {
        const { comparedProducts } = get();

        if (comparedProducts.some((p) => p.id === product.id)) {
          return;
        }

        if (comparedProducts.length >= 4) {
          return;
        }

        set({ comparedProducts: [...comparedProducts, product] });
      },

      removeFromCompare: (productId) => {
        const { comparedProducts } = get();
        const updatedList = comparedProducts.filter((p) => p.id !== productId);
        set({ comparedProducts: updatedList });
      },

      clearCompareList: () => {
        set({ comparedProducts: [] });
      },
    }),
    {
      name: "digi-style-products",
      partialize: (state) => ({
        recentlyViewed: state.recentlyViewed,
        comparedProducts: state.comparedProducts,
      }),
    }
  )
);
