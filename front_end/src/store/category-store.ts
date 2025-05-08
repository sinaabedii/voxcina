import { create } from "zustand";
import { Category } from "@/types/product"; // Assuming Category is in product types, or adjust path
// If Category type is in a different file, e.g., @/types/category, change the import accordingly.
// import { Category } from "@/types/category";

// import { categories as mockCategories } from "@/data/categories"; // If you still need mock data for initial dev
import { delay } from "@/lib/utils";

interface CategoryState {
  categories: Category[];
  activeCategory: Category | null;
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  fetchCategoryById: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: [],
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
      set({ categories: data, isLoading: false });
    } catch (error) {
      set({
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