import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, ProductFilter } from "@/types/product";
import { delay, getBrandName, getCategoryName } from "@/lib/utils";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";

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
  brands: Brand[];
  categories: Category[];


  fetchBrands: () => Promise<void>;
  fetchCategories: () => Promise<void>;
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
      brands: [],
      categories: [],

      fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          await delay(500);
          const response = await fetch("/api/products");
          if (!response.ok) {
            throw new Error("Failed to fetch products");
          }
          const data = await response.json();
          
          if (Array.isArray(data)) {
            set({ products: data, isLoading: false });
          } else {
            set({ products: [], isLoading: false });
          }
        } catch (error) {
          set({
            products: [],
            error: "خطا در دریافت محصولات. لطفا دوباره تلاش کنید.",
            isLoading: false,
          });
        }
      },

      fetchProductById: async (id: string) => {
        set({ isLoading: true, error: null, activeProduct: null });
        try {
          await delay(300);
          const response = await fetch(`/api/products/${id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch product");
          }
          const product = await response.json();
          
          if (!product) {
            throw new Error("محصول یافت نشد");
          }

          set({ activeProduct: product, isLoading: false });

          if (product) {
            get().addRecentlyViewed(product);
          }
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
          
          if (Array.isArray(data)) {
            set({ featuredProducts: data, isLoading: false });
          } else {
            set({ featuredProducts: [], isLoading: false });
          }
        } catch (error) {
          set({
            featuredProducts: [],
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
          
          if (Array.isArray(data)) {
            set({ newProducts: data, isLoading: false });
          } else {
            set({ newProducts: [], isLoading: false });
          }
        } catch (error) {
          set({
            newProducts: [],
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
      fetchBrands: async () => {
        try {
          const response = await fetch("/api/brands");
          const data = await response.json();
          set({ brands: data });
        } catch {
          set({ brands: [] });
        }
      },
      fetchCategories: async () => {
        try {
          const response = await fetch("/api/categories");
          const data = await response.json();
          set({ categories: data });
        } catch {
          set({ categories: [] });
        }
      },

      getFilteredProducts: () => {
        const { products, filter, brands, categories } = get();
      
        return products.filter((product) => {
          // In-stock: at least one variant available
          const inStock = product.variants.some((v) => v.quantity > 0);
          if (filter.inStockOnly && !inStock) return false;
      
          // Category
          if (filter.categories && filter.categories.length > 0) {
            if (!product.category_ids.some(id => filter.categories!.includes(id))) {
              return false;
            }
          }
      
          // Brand
          if (filter.brands && filter.brands.length > 0) {
            if (!filter.brands.includes(product.brand_id)) {
              return false;
            }
          }
      
          // Price
          if (filter.priceRange) {
            if (product.price < filter.priceRange.min || product.price > filter.priceRange.max) {
              return false;
            }
          }
      
          // Color - Updated to check variants
          if (filter.colors && filter.colors.length > 0) {
            if (!product.variants.some((v) => filter.colors!.includes(v.color))) {
              return false;
            }
          }
      
          // Size - Updated to check variants
          if (filter.sizes && filter.sizes.length > 0) {
            if (!product.variants.some((v) => filter.sizes!.includes(v.size))) {
              return false;
            }
          }
      
          // Search
          if (filter.search && filter.search.trim() !== "") {
            const searchTerm = filter.search.toLowerCase();
            const brandName = getBrandName(product.brand_id, brands);
            const categoryName = getCategoryName(product.category_ids, categories);
      
            return (
              product.name.toLowerCase().includes(searchTerm) ||
              product.description.toLowerCase().includes(searchTerm) ||
              brandName.toLowerCase().includes(searchTerm) ||
              categoryName.toLowerCase().includes(searchTerm)
            );
          }
      
          return true;
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
