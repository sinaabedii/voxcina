import { create } from "zustand";
// import { Category } from "@/types/product"; // Assuming Category is in product types, or adjust path
// If Category type is in a different file, e.g., @/types/category, change the import accordingly.
import { Category } from "@/types/category"; // Corrected import path

// import { categories as mockCategories } from "@/data/categories"; // If you still need mock data for initial dev
import { delay } from "@/lib/utils";
import { useAuthStore } from "./auth-store"; // Import auth store

interface CategoryState {
  categories: Category[];
  activeCategory: Category | null;
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  fetchCategoryById: (id: string) => Promise<void>;
  getCategoryName: (categoryId: string) => string; // Add this method
  createCategory: (
    categoryData: FormData,
    adminToken: string
  ) => Promise<Category | null>;
  updateCategory: (
    id: string,
    categoryData: FormData,
    adminToken: string
  ) => Promise<Category | null>;
  deleteCategory: (id: string, adminToken: string) => Promise<boolean>;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: [], // Default to an empty array
  activeCategory: null,
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      // await delay(300); // Simulating network delay
      // set({ categories: mockCategories, isLoading: false }); // Mock data fetching
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      
      // Check if data is an array
      if (Array.isArray(data)) {
        set({ categories: data, isLoading: false });
      } else {
        // In case the data is not an array, fall back to an empty array
        set({ categories: [], isLoading: false });
      }
    } catch (error) {
      set({
        categories: [], // Ensure categories is always an array
        error: "خطا در دریافت دسته‌بندی‌ها. لطفا دوباره تلاش کنید.",
        isLoading: false,
      });
    }
  },

  fetchCategoryById: async (id: string) => {
    set({ isLoading: true, error: null, activeCategory: null });
    try {
      // await delay(200); // Simulating network delay
      // let category = mockCategories.find((c) => c.id === id); // Mock data fetching
      // if (!category) {
      //   for (const mainCategory of mockCategories) {
      //     if (mainCategory.children) {
      //       const childCategory = mainCategory.children.find(
      //         (c) => c.id === id
      //       );
      //       if (childCategory) {
      //         category = childCategory;
      //         break;
      //       }
      //     }
      //   }
      // }
      // if (!category) {
      //   throw new Error("دسته‌بندی یافت نشد");
      // }
      // set({ activeCategory: category, isLoading: false });

      const response = await fetch(`/api/categories/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch category with id ${id}`);
      }
      const category = await response.json();
      if (!category) {
        throw new Error("دسته‌بندی یافت نشد");
      }
      set({ activeCategory: category, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "خطای ناشناخته",
        isLoading: false,
      });
    }
  },
  getCategoryName: (categoryId: string, categoriesArray?: Category[]) => {
    const { categories } = get();
    const categoriesToUse = categoriesArray || categories;
    const category = categoriesToUse.find(cat => cat.id === categoryId);
    return category ? category.name : 'Category';
  },
  createCategory: async (categoryData: FormData, adminToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: categoryData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create category"
        );
      }
      const newCategory = await response.json();
      set({
        categories: [...get().categories, newCategory],
        isLoading: false,
      });
      return newCategory;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      });
      return null;
    }
  },

  updateCategory: async (
    id: string,
    categoryData: FormData,
    adminToken: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: categoryData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update category"
        );
      }
      const updatedCategory = await response.json();
      set({
        categories: get().categories.map((cat) =>
          cat.id === id ? updatedCategory : cat
        ),
        activeCategory:
          get().activeCategory?.id === id
            ? updatedCategory
            : get().activeCategory,
        isLoading: false,
      });
      return updatedCategory;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      });
      return null;
    }
  },

  deleteCategory: async (id: string, adminToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to delete category"
        );
      }
      set({
        categories: get().categories.filter((cat) => cat.id !== id),
        activeCategory:
          get().activeCategory?.id === id ? null : get().activeCategory,
        isLoading: false,
      });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      });
      return false;
    }
  },
}));

// Note: If you want to persist parts of the category store (e.g., activeCategory if needed),
// you can wrap the store definition with the `persist` middleware from zustand/middleware,
// similar to how it's done in product-store.ts. For now, I've kept it simple.
// Example with persist:
// import { persist } from "zustand/middleware";
// export const useCategoryStore = create<CategoryState>()(
//   persist(
//     (set, get) => ({
//       // ... store implementation ...
//     }),
//     {
//       name: "digi-style-categories", // choose a unique name
//       partialize: (state) => ({ activeCategory: state.activeCategory }), // example: only persist activeCategory
//     }
//   )
// ); 