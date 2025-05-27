import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "react-toastify";
import {
  User,
  LoginCredentials,
  RegistrationData,
  AuthState,
} from "@/types/user";

export interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegistrationData) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<User>;
  getProfile: () => Promise<User>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      adminToken: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
      
        try {
          const response = await fetch("/api/users/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
          });
      
          const data = await response.json();
          
          if (!response.ok) {
            // Handle backend error response
            const errorMessage = data.error || "خطا در ورود به سیستم";
            set({
              isLoading: false,
              error: errorMessage,
              user: null,
              isAuthenticated: false,
            });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
      
          if (data.token) {
            localStorage.setItem("authToken", data.token);
            
            // Create a user object from the backend response structure
            const user: User = {
              id: data.id || data._id,
              name: data.name,
              email: data.email,
              role: data.role as "user" | "admin" | "seller" | "customer",
              createdAt: data.createdAt || data.created_at,
              updatedAt: data.updatedAt || data.updated_at
            };
            
            let adminToken: string | null = null;
            if (user.role === "admin") {
              adminToken = data.token;
            }
      
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              adminToken,
            });
            
            toast.success(`خوش آمدید، ${user.name}!`);
            return user;
          } else {
            const errorMessage = "فرمت پاسخ سرور نامعتبر است";
            set({
              isLoading: false,
              error: errorMessage,
              user: null,
              isAuthenticated: false,
            });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
        } catch (error) {
          if (error instanceof Error && error.message !== "خطا در ورود به سیستم") {
            const errorMessage = "خطای ناشناخته در ورود";
            set({
              isLoading: false,
              error: errorMessage,
              user: null,
              isAuthenticated: false,
            });
            toast.error(errorMessage);
          }
          localStorage.removeItem("authToken");
          throw error;
        }
      },

      register: async (data) => {
          set({ isLoading: true, error: null });

          try {
            if (data.password !== data.confirmPassword) {
              const errorMessage = "رمز عبور و تکرار آن مطابقت ندارند";
              set({
                isLoading: false,
                error: errorMessage,
              });
              toast.error(errorMessage);
              throw new Error(errorMessage);
            }

            const response = await fetch("/api/users/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: data.name,
                email: data.email,
                password: data.password,
              }),
            });

            const userData = await response.json();
            
            if (!response.ok) {
              // Handle backend error response
              const errorMessage = userData.error || "خطا در ثبت‌نام";
              set({
                isLoading: false,
                error: errorMessage,
                user: null,
                isAuthenticated: false,
              });
              toast.error(errorMessage);
              throw new Error(errorMessage);
            }
            
            // Extract token from response
            if (userData.token) {
              localStorage.setItem("authToken", userData.token);
              
              // Create user object from backend response structure
              const user: User = {
                id: userData.id || userData._id,
                name: userData.name,
                email: userData.email,
                role: userData.role as "user" | "admin" | "seller" | "customer",
                createdAt: userData.createdAt || userData.created_at,
                updatedAt: userData.updatedAt || userData.updated_at
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });

              toast.success(`ثبت‌نام با موفقیت انجام شد! خوش آمدید، ${user.name}`);
              return user;
            } else {
              const errorMessage = "فرمت پاسخ سرور نامعتبر است";
              set({
                isLoading: false,
                error: errorMessage,
                user: null,
                isAuthenticated: false,
              });
              toast.error(errorMessage);
              throw new Error(errorMessage);
            }
          } catch (error) {
            if (error instanceof Error && !error.message.includes("خطا در ثبت‌نام") && !error.message.includes("رمز عبور")) {
              const errorMessage = "خطای ناشناخته";
              set({
                isLoading: false,
                error: errorMessage,
                user: null,
                isAuthenticated: false,
              });
              toast.error(errorMessage);
            }
            throw error;
          }
        },

      logout: async () => {
        try {
          const token = localStorage.getItem("authToken");
          if (token) {
            await fetch("/api/users/logout", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
              },
            });
          }
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          localStorage.removeItem("authToken");
          set({
            user: null,
            isAuthenticated: false,
            error: null,
            adminToken: null,
          });
          toast.success("با موفقیت خارج شدید");
        }
      },

      updateUser: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            const errorMessage = "کاربر وارد نشده است";
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          const response = await fetch("/api/users/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
          });

          const data = await response.json();

          if (!response.ok) {
            const errorMessage = data.error || "خطا در به‌روزرسانی پروفایل";
            set({
              isLoading: false,
              error: errorMessage,
            });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          set({
            user: data,
            isLoading: false,
          });

          toast.success("پروفایل با موفقیت به‌روزرسانی شد");
          return data;
        } catch (error) {
          if (error instanceof Error && !error.message.includes("خطا در به‌روزرسانی")) {
            const errorMessage = "خطای ناشناخته";
            set({
              isLoading: false,
              error: errorMessage,
            });
            toast.error(errorMessage);
          }
          throw error;
        }
      },

      getProfile: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            const errorMessage = "کاربر وارد نشده است";
            set({
              isLoading: false,
              error: errorMessage,
              user: null,
              isAuthenticated: false,
            });
            throw new Error(errorMessage);
          }

          const response = await fetch("/api/users/profile", {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            const errorMessage = data.error || "خطا در دریافت اطلاعات پروفایل";
            set({
              isLoading: false,
              error: errorMessage,
              user: null,
              isAuthenticated: false,
            });
            if (response.status === 401) {
              localStorage.removeItem("authToken");
              toast.error("جلسه شما منقضی شده است. لطفا مجددا وارد شوید");
            } else {
              toast.error(errorMessage);
            }
            throw new Error(errorMessage);
          }

          // Handle the backend response structure for profile
          const userData = data.user_data || data;
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });

          return userData;
        } catch (error) {
          if (error instanceof Error && !error.message.includes("خطا در دریافت")) {
            const errorMessage = "خطای ناشناخته";
            set({
              isLoading: false,
              error: errorMessage,
              user: null,
              isAuthenticated: false,
            });
            toast.error(errorMessage);
          }
          throw error;
        }
      },
    }),
    {
      name: "digi-style-auth",
      partialize: (state) => (Object.fromEntries(
        Object.entries(state).filter(([key]) => ['user', 'isAuthenticated', 'adminToken'].includes(key))
      ) as { user: User | null; isAuthenticated: boolean, adminToken: string | null }),
    }
  )
);
