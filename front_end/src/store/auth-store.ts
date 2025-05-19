import { create } from "zustand";
import { persist } from "zustand/middleware";
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

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Login failed");
          }

          const data = await response.json();

          if (data.token && data.user) {
            localStorage.setItem("authToken", data.token);

            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return data.user;
          } else {
            throw new Error("Invalid response format from server");
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته در ورود",
            user: null,
            isAuthenticated: false,
          });
          localStorage.removeItem("authToken");
          throw error;
        }
      },

      register: async (data) => {
          set({ isLoading: true, error: null });

          try {
            if (data.password !== data.confirmPassword) {
              throw new Error("رمز عبور و تکرار آن مطابقت ندارند");
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

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || "Registration failed");
            }

            const userData = await response.json();
            
            // Extract token from response
            if (userData.token) {
              localStorage.setItem("authToken", userData.token);
              
              // Create user object from flat response
              const user: User = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role as "user" | "admin" | "seller", // Cast to expected enum
                createdAt: userData.created_at,
                updatedAt: userData.updated_at
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });

              return user;
            } else {
              throw new Error("Invalid response format from server");
            }
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : "خطای ناشناخته",
              user: null,
              isAuthenticated: false,
            });
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
          });
        }
      },

      updateUser: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            throw new Error("کاربر وارد نشده است");
          }

          const response = await fetch("/api/users/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update profile");
          }

          const updatedUser = await response.json();
          set({
            user: updatedUser,
            isLoading: false,
          });

          return updatedUser;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته",
          });
          throw error;
        }
      },

      getProfile: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            throw new Error("کاربر وارد نشده است");
          }

          const response = await fetch("/api/users/profile", {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to fetch profile");
          }

          const userData = await response.json();
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });

          return userData;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته",
            user: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },
    }),
    {
      name: "digi-style-auth",
      partialize: (state) => (Object.fromEntries(
        Object.entries(state).filter(([key]) => ['user', 'isAuthenticated'].includes(key))
      ) as { user: User | null; isAuthenticated: boolean }),
    }
  )
);
