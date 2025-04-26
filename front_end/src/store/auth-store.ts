import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  User,
  LoginCredentials,
  RegistrationData,
  AuthState,
} from "@/types/user";
import { delay, generateId } from "@/lib/utils";
import { useCartStore } from "./cart-store";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegistrationData) => Promise<User>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<User>;
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

          const responseData = await response.json();

          if (responseData.token && responseData.user) {
            localStorage.setItem("authToken", responseData.token);

            set({
              user: responseData.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return responseData.user;
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

      logout: () => {
        localStorage.removeItem("authToken");
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
        useCartStore.getState().clearCart();
      },

      updateUser: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          await delay(800);

          const currentUser = useAuthStore.getState().user;

          if (!currentUser) {
            throw new Error("کاربر وارد نشده است");
          }

          const updatedUser: User = {
            ...currentUser,
            ...userData,
            updatedAt: new Date().toISOString(),
          };

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
    }),
    {
      name: "digi-style-auth",
    }
  )
);
