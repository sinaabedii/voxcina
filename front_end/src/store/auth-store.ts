import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  User,
  LoginCredentials,
  RegistrationData,
  AuthState,
} from "@/types/user";
import { delay, generateId } from "@/lib/utils";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegistrationData) => Promise<User>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<User>;
}

const mockUser: User = {
  id: "1",
  name: "کاربر تست",
  email: "user@example.com",
  avatar: "/images/avatars/user.jpg",
  role: "user",
  addresses: [
    {
      id: "1",
      title: "خانه",
      firstName: "علی",
      lastName: "محمدی",
      phoneNumber: "09123456789",
      province: "تهران",
      city: "تهران",
      address: "خیابان ولیعصر، بالاتر از میدان ونک، پلاک 123",
      postalCode: "1234567890",
      isDefault: true,
    },
  ],
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-01T00:00:00Z",
};

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
          await delay(1000);

          if (
            credentials.email === "user@example.com" &&
            credentials.password === "password"
          ) {
            set({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return mockUser;
          }

          throw new Error("ایمیل یا رمز عبور اشتباه است");
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

      register: async (data) => {
        set({ isLoading: true, error: null });

        try {
          await delay(1000);

          if (data.password !== data.confirmPassword) {
            throw new Error("رمز عبور و تکرار آن مطابقت ندارند");
          }

          const newUser: User = {
            id: generateId(),
            name: data.name,
            email: data.email,
            role: "user",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({
            user: newUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return newUser;
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
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
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
