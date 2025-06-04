import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, ProductFilter, Review, PaginationInfo } from "@/types/product";
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
  activeProductReviews: Review[];
  filter: ProductFilter;
  recentlyViewed: Product[];
  comparedProducts: Product[];
  brands: Brand[];
  categories: Category[];
  pagination: PaginationInfo | null;


  fetchBrands: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProducts: (page?: number, limit?: number) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  fetchFlashSaleProducts: (limit?: number) => Promise<void>;
  fetchNewProducts: (limit?: number) => Promise<void>;
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilters: () => void;
  getFilteredProducts: () => Product[];
  addRecentlyViewed: (product: Product) => void;
  removeRecentlyViewed: (productId: string) => void;
  clearRecentlyViewed: () => void;
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
      featuredProducts: [],
      newProducts: [],
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

      fetchProductById: async (id: string) => {
        set({ isLoading: true, error: null, activeProduct: null, activeProductReviews: [] });
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

      fetchFlashSaleProducts: async (limit = 10) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams({ is_flash_sale: "true", limit: String(limit) });
          const response = await fetch(`/api/products?${params.toString()}`);
          if (!response.ok) {
            throw new Error("Failed to fetch flash sale products");
          }
          const data = await response.json();
          
          if (Array.isArray(data)) {
            set({ featuredProducts: data, isLoading: false });
          } else if (data && data.data) {
            set({ featuredProducts: data.data, isLoading: false });
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

      fetchNewProducts: async (limit = 10) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams({ is_new: "true", limit: String(limit) });
          const response = await fetch(`/api/products?${params.toString()}`);
          if (!response.ok) {
            throw new Error("Failed to fetch new products");
          }
          const data = await response.json();
          
          if (Array.isArray(data)) {
            set({ newProducts: data, isLoading: false });
          } else if (data && data.data) {
            set({ newProducts: data.data, isLoading: false });
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
          // In-stock filter
          if (filter.inStockOnly && product.inStock === false) return false;
      
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
            products: state.products.map((p) =>
              p.id === id ? updatedProduct : p
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
            products: state.products.filter((p) => p.id !== id),
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
