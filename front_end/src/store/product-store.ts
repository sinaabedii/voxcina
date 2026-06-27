import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Product,
  ProductFilter,
  Review,
  PaginationInfo,
  ColorVariantListItem,
} from "@/types/product";
import { getBrandName, getCategoryName } from "@/lib/utils";
import { getCanonicalColor } from "@/lib/product-variants";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";
import { useAuthStore } from "./auth-store";

/**
 * Product Store
 * 
 * This store manages product-related state for:
 * - Admin product management (CRUD operations)
 * - Client-side filtering (for interactive filter UI)
 * - Recently viewed products (persisted to localStorage)
 * - Product comparison (client-only feature)
 * 
 * Note: Featured products and new products are now fetched server-side
 * in the home page for SSR/SEO optimization (Requirements: 3.1)
 */
interface ProductState {
  // Product lists now store ColorVariantListItem (color variants as separate items)
  products: ColorVariantListItem[];
  adminProducts: Product[]; // Full products for admin dashboard
  isLoading: boolean;
  error: string | null;
  activeProduct: Product | null; // Detail view for admin edit page
  activeProductReviews: Review[];
  filter: ProductFilter;
  recentlyViewed: Product[]; // Keep as Product for full details (client-only)
  comparedProducts: Product[]; // Keep as Product for full details (client-only)
  brands: Brand[];
  categories: Category[];
  pagination: PaginationInfo | null;

  // Data fetching (kept for admin pages and client-side filtering)
  fetchBrands: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProducts: (page?: number, limit?: number) => Promise<void>;
  fetchAdminProducts: (adminToken?: string) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  
  // Filter operations
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilters: () => void;
  getFilteredProducts: () => ColorVariantListItem[];
  
  // Recently viewed (client-only, persisted)
  addRecentlyViewed: (product: Product) => void;
  removeRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
  
  // Product comparison (client-only, persisted)
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompareList: () => void;
  
  // Brand Admin Actions
  createBrand: (brandData: FormData, adminToken: string) => Promise<Brand | null>;
  updateBrand: (
    id: string,
    brandData: Partial<Brand> | FormData,
    adminToken: string
  ) => Promise<Brand | null>;
  deleteBrand: (id: string, adminToken: string) => Promise<boolean>;
  
  // Product Admin Actions
  createProduct: (productData: FormData, adminToken: string) => Promise<Product | null>;
  updateProduct: (
    id: string,
    productData: Partial<Product> | FormData,
    adminToken: string
  ) => Promise<Product | null>;
  deleteProduct: (id: string, adminToken: string) => Promise<boolean>;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      adminProducts: [],
      isLoading: false,
      error: null,
      activeProduct: null,
      activeProductReviews: [],
      filter: {},
      recentlyViewed: [],
      comparedProducts: [],
      brands: [],
      categories: [],
      pagination: null,

      // Fetch full products for admin dashboard (not color variant list items)
      fetchAdminProducts: async (adminToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get token from parameter or from auth store
          const token = adminToken || useAuthStore.getState().adminToken;
          const response = await fetch("/api/admin/products", {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
          if (!response.ok) {
            throw new Error("Failed to fetch admin products");
          }
          const data = await response.json();
          const products = Array.isArray(data) ? data : (data?.data || []);
          set({ adminProducts: products, isLoading: false });
        } catch (error) {
          set({
            adminProducts: [],
            error: "خطا در دریافت محصولات. لطفا دوباره تلاش کنید.",
            isLoading: false,
          });
        }
      },

      // Fetch products for client-side filtering (kept for admin and filter UI)
      fetchProducts: async (page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams({ page: String(page), limit: String(limit) });
          const response = await fetch(`/api/products?${params.toString()}`);
          if (!response.ok) {
            throw new Error("Failed to fetch products");
          }
          const data = await response.json();

          if (Array.isArray(data)) {
            // Legacy support (no pagination)
            set({ products: data, pagination: null, isLoading: false });
          } else if (data && data.data) {
            set({ products: data.data, pagination: data.pagination, isLoading: false });
          } else {
            set({ products: [], pagination: null, isLoading: false });
          }
        } catch (error) {
          set({
            products: [],
            pagination: null,
            error: "خطا در دریافت محصولات. لطفا دوباره تلاش کنید.",
            isLoading: false,
          });
        }
      },

      // Fetch single product for admin edit page
      fetchProductById: async (id: string) => {
        set({ isLoading: true, error: null, activeProduct: null, activeProductReviews: [] });
        try {
          const response = await fetch(`/api/products/${id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch product");
          }
          const product = await response.json();

          if (!product) {
            throw new Error("محصول یافت نشد");
          }

          // Fetch product reviews (only approved ones returned by API)
          try {
            const revRes = await fetch(`/api/products/${id}/reviews`);
            const reviews = revRes.ok ? await revRes.json() : [];
            set({ activeProductReviews: Array.isArray(reviews) ? reviews : [] });
          } catch {
            set({ activeProductReviews: [] });
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
          const brands = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
          set({ brands });
        } catch {
          set({ brands: [] });
        }
      },
      fetchCategories: async () => {
        try {
          const response = await fetch("/api/categories");
          const data = await response.json();
          const categories = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
          set({ categories });
        } catch {
          set({ categories: [] });
        }
      },

      getFilteredProducts: () => {
        const { products, filter, brands, categories } = get();

        return products.filter((item) => {
          // In-stock filter
          if (filter.inStockOnly && item.inStock === false) return false;

          // Category
          if (filter.categories && filter.categories.length > 0) {
            if (!item.category_ids.some(id => filter.categories!.includes(id))) {
              return false;
            }
          }

          // Brand
          if (filter.brands && filter.brands.length > 0) {
            if (!filter.brands.includes(item.brand_id)) {
              return false;
            }
          }

          // Price
          if (filter.priceRange) {
            if (item.price < filter.priceRange.min || item.price > filter.priceRange.max) {
              return false;
            }
          }

	          // Color - Check the colorVariant of this item
	          if (filter.colors && filter.colors.length > 0) {
	            const itemColor = getCanonicalColor(item.colorVariant) || item.colorVariant.colorName;
	            if (!filter.colors.includes(itemColor)) {
	              return false;
	            }
	          }

          // Size - Check available sizes in the color variant
          if (filter.sizes && filter.sizes.length > 0) {
            if (!item.colorVariant.sizes.some((s) => filter.sizes!.includes(s.size))) {
              return false;
            }
          }

          // Search
          if (filter.search && filter.search.trim() !== "") {
            const searchTerm = filter.search.toLowerCase();
            const brandName = getBrandName(item.brand_id, brands);
            const categoryName = getCategoryName(item.category_ids, categories);

            return (
              item.name.toLowerCase().includes(searchTerm) ||
              item.description.toLowerCase().includes(searchTerm) ||
              brandName.toLowerCase().includes(searchTerm) ||
              categoryName.toLowerCase().includes(searchTerm) ||
              item.colorVariant.colorName.toLowerCase().includes(searchTerm)
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

      // Brand Admin Actions
      createBrand: async (brandData: FormData, adminToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/brands", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
            body: brandData,
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to create brand");
          }
          const newBrand = await response.json();
          set({
            brands: [...get().brands, newBrand],
            isLoading: false,
          });
          return newBrand;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error creating brand",
            isLoading: false,
          });
          return null;
        }
      },

      updateBrand: async (
        id: string,
        brandData: Partial<Brand> | FormData,
        adminToken: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          const isFormData = brandData instanceof FormData;
          const response = await fetch(`/api/brands/${id}`, {
            method: "PUT",
            headers: {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
              Authorization: `Bearer ${adminToken}`,
            },
            body: isFormData ? brandData : JSON.stringify(brandData),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update brand");
          }
          const updatedBrand = await response.json();
          set({
            brands: get().brands.map((b) => (b.id === id ? updatedBrand : b)),
            isLoading: false,
          });
          return updatedBrand;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error updating brand",
            isLoading: false,
          });
          return null;
        }
      },

      deleteBrand: async (id: string, adminToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/brands/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete brand");
          }
          set({
            brands: get().brands.filter((b) => b.id !== id),
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error deleting brand",
            isLoading: false,
          });
          return false;
        }
      },

      // Product Admin Actions
      createProduct: async (productData: FormData, adminToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/admin/products", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${adminToken}`,
              // Content-Type is set automatically for FormData
            },
            body: productData,
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to create product");
          }
          const newProduct = await response.json();
          set((state) => ({
            products: [...state.products, newProduct],
            isLoading: false,
          }));
          return newProduct;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error creating product",
            isLoading: false,
          });
          return null;
        }
      },

      updateProduct: async (
        id: string,
        productData: Partial<Product> | FormData,
        adminToken: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          const isFormData = productData instanceof FormData;
          const response = await fetch(`/api/admin/products/${id}`, {
            method: "PUT",
            headers: {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
              Authorization: `Bearer ${adminToken}`,
            },
            body: isFormData ? productData : JSON.stringify(productData),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update product");
          }
          const updatedProduct = await response.json();
          set((state) => ({
            products: state.products.map((item) =>
              item.productId === id ? { ...item, ...updatedProduct } : item
            ),
            activeProduct: state.activeProduct?.id === id ? updatedProduct : state.activeProduct,
            isLoading: false,
          }));
          return updatedProduct;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error updating product",
            isLoading: false,
          });
          return null;
        }
      },

      deleteProduct: async (id: string, adminToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/admin/products/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete product");
          }
          set((state) => ({
            products: state.products.filter((item) => item.productId !== id),
            isLoading: false,
          }));
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error deleting product",
            isLoading: false,
          });
          return false;
        }
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
