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
  fetchAllUsers: () => Promise<User[]>;
  updateUserAsAdmin: (userId: string, userData: Partial<User>) => Promise<User>;
  deleteUserAsAdmin: (userId: string) => Promise<void>;
  loginSms: (phone: string) => Promise<User>;
  allUsers: User[];
}

// Helper to automatically refresh access token on 401 responses
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("authToken");
  const existingHeaders = (options.headers as Record<string, string>) || {};
  // First attempt with current access token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...existingHeaders,
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      const refreshRes = await fetch("/api/users/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("authToken", data.accessToken);
        // Retry original request with new access token
        response = await fetch(url, {
          ...options,
          headers: {
            ...existingHeaders,
            Authorization: `Bearer ${data.accessToken}`,
          },
        });
      } else {
        // Refresh failed; clear tokens
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
      }
    }
  }
  return response;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      adminToken: null,
      allUsers: [],

      login: async (credentials) => {
        set({ isLoading: true, error: null });
      
        try {
          const response = await fetch("/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
            if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
            
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
          localStorage.removeItem("refreshToken");
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
                phone: data.phone,
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
              if (userData.refreshToken) localStorage.setItem("refreshToken", userData.refreshToken);
              
              // Create user object from backend response structure
              const user: User = {
                id: userData.id || userData._id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
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
          localStorage.removeItem("refreshToken");
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

          const response = await fetchWithAuth("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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

          const response = await fetchWithAuth("/api/users/profile");

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
              localStorage.removeItem("refreshToken");
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

      fetchAllUsers: async () => {
        set({ isLoading: true, error: null });
        const token = get().adminToken || localStorage.getItem("authToken");
        if (!token) {
          const errorMessage = "Admin not authenticated";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        try {
          const response = await fetch("/api/admin/users", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            const errorMessage = data.error || "Failed to fetch users";
            set({ isLoading: false, error: errorMessage });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
          
          // Handle the response structure: { data: [...], total: ..., page: ... }
          const usersData = data.data || data; // Try data.data first, fallback to data for backward compatibility
          const users: User[] = Array.isArray(usersData) ? usersData.map((u: any) => ({
            id: u.id || u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.created_at || u.createdAt,
            updatedAt: u.updated_at || u.updatedAt,
            isActive: u.is_active !== undefined ? u.is_active : u.isActive,
            addresses: u.addresses || [],
            phone: u.phone_number || u.phone,
            avatar: u.avatar,
          })) : [];

          set({ allUsers: users, isLoading: false, error: null });
          return users;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error fetching users";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw error;
        }
      },

      updateUserAsAdmin: async (userId, userData) => {
        set({ isLoading: true, error: null });
        const token = get().adminToken || localStorage.getItem("authToken");
        if (!token) {
          const errorMessage = "Admin not authenticated";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        try {
          let apiPath = `/api/admin/users/${userId}`;
          let body: any = { ...userData }; 

          if (userData.role && Object.keys(userData).length === 1) {
            apiPath = `/api/admin/users/${userId}/role`;
            body = { role: userData.role };
          } else {
            // For other updates, ensure backend can handle them at /api/admin/users/{userId}
            // e.g., if updating isActive, name, email.
            // The body already contains all userData.
          }

          const response = await fetch(apiPath, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });

          const updatedUserBE = await response.json(); // Renamed to avoid conflict

          if (!response.ok) {
            const errorMessage = updatedUserBE.error || "Failed to update user";
            set({ isLoading: false, error: errorMessage });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          const finalUser: User = {
            id: updatedUserBE.id || updatedUserBE._id,
            name: updatedUserBE.name,
            email: updatedUserBE.email,
            role: updatedUserBE.role,
            createdAt: updatedUserBE.created_at || updatedUserBE.createdAt,
            updatedAt: updatedUserBE.updated_at || updatedUserBE.updatedAt,
            isActive: updatedUserBE.is_active, // Assuming backend sends this
            addresses: updatedUserBE.addresses || [],
            // avatar: updatedUserBE.avatar, // If avatar comes from backend
          };

          set((state) => ({
            allUsers: state.allUsers.map((user) => // state.allUsers should now be valid
              user.id === userId ? finalUser : user
            ),
            isLoading: false,
            error: null,
          }));
          toast.success("User updated successfully");
          return finalUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error updating user";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw error;
        }
      },

      deleteUserAsAdmin: async (userId) => {
        set({ isLoading: true, error: null });
        const token = get().adminToken || localStorage.getItem("authToken");
        if (!token) {
          const errorMessage = "Admin not authenticated";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          });

          if (!response.ok) {
             const data = await response.json().catch(() => ({ error: "Failed to delete user and parse error" }));
            const errorMessage = data.error || `Failed to delete user (status: ${response.status})`;
            set({ isLoading: false, error: errorMessage });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
          
           if (response.status !== 204) {
                const data = await response.json().catch(() => null); 
                if (data && data.message) {
                    toast.success(data.message);
                } else {
                    toast.success("User deleted successfully");
                }
            } else {
                 toast.success("User deleted successfully");
            }

          set((state) => ({
            allUsers: state.allUsers.filter((user) => user.id !== userId), // state.allUsers should be fine
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error deleting user";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw error;
        }
      },

      // Login via SMS one-time code
      loginSms: async (phone) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/users/login-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone }),
          });
          const data = await response.json();
          if (!response.ok) {
            const errorMessage = data.error || "خطا در ورود با کد یکبار مصرف";
            set({ isLoading: false, error: errorMessage });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
          if (data.token) {
            localStorage.setItem("authToken", data.token);
            if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
            const user: User = {
              id: data.id || data._id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              role: data.role as any,
              createdAt: data.createdAt || data.created_at,
              updatedAt: data.updatedAt || data.updated_at,
            };
            set({ user, isAuthenticated: true, isLoading: false, error: null });
            toast.success(`خوش آمدید، ${user.name}!`);
            return user;
          } else {
            const errorMessage = "فرمت پاسخ سرور نامعتبر است";
            set({ isLoading: false, error: errorMessage });
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['isLoading', 'error', 'allUsers'].includes(key))
        ) as Pick<AuthStore, 'user' | 'isAuthenticated' | 'adminToken'>,
    }
  )
);

export const useAdminUsersStore = () => useAuthStore((state) => ({
    allUsers: state.allUsers,
    isLoading: state.isLoading,
    error: state.error,
    fetchAllUsers: state.fetchAllUsers,
    updateUserAsAdmin: state.updateUserAsAdmin,
    deleteUserAsAdmin: state.deleteUserAsAdmin,
    adminToken: state.adminToken,
}));
