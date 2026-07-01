import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "react-toastify";
import {
  User,
  LoginCredentials,
  RegistrationData,
  AuthState,
} from "@/types/user";
import { tokenValidator } from "@/lib/token-validator";
import { localStorageManager, AUTH_STORAGE_KEYS } from "@/lib/local-storage-manager";
import { sessionManager } from "@/lib/session-manager";

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
  // Direct setters for OTP signup flow
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  // Initialization state and methods (Requirements 2.3, 2.4)
  isInitialized: boolean;
  initializeAuth: () => Promise<void>;
  // Cross-tab synchronization (Requirements 8.1, 8.2, 8.3)
  syncFromStorage: () => void;
  setupStorageListener: () => () => void;
}

// Note: fetchWithAuth is now provided by sessionManager.fetchWithAuth()
// which implements proper request queuing and proactive refresh (Requirements 1.1-1.4, 6.1)

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      adminToken: null,
      allUsers: [],
      // Initialization state (Requirements 2.3, 2.4)
      isInitialized: false,

      // Direct setters for OTP signup flow
      setUser: (user) => set({ user }),
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

      /**
       * Initialize authentication state on app start
       * Validates stored tokens and clears invalid ones
       * Implements Requirements 2.3, 2.4
       * Also initializes activity tracking for proactive refresh (Requirement 6.4)
       */
      initializeAuth: async () => {
        // Prevent multiple initializations
        if (get().isInitialized) {
          return;
        }

        // Initialize activity tracking for proactive token refresh (Requirement 6.4)
        sessionManager.initActivityTracking();

        const accessToken = localStorageManager.getAccessToken();
        
        // No token stored - set as unauthenticated
        if (!accessToken) {
          set({
            isInitialized: true,
            isAuthenticated: false,
            user: null,
          });
          return;
        }

        // Validate the stored token using TokenValidator (Requirement 2.3)
        if (!tokenValidator.isTokenValid(accessToken)) {
          // Token is invalid or expired - clear all auth data using LocalStorageManager (Requirement 2.1)
          localStorageManager.clearAuthData();
          set({
            isInitialized: true,
            isAuthenticated: false,
            user: null,
            adminToken: null,
          });
          return;
        }

        // Token is valid - try to restore user state from persisted storage
        const persistedState = localStorageManager.getPersistedAuthState();
        if (persistedState?.state?.user && persistedState.state.isAuthenticated) {
          set({
            isInitialized: true,
            user: persistedState.state.user as User,
            isAuthenticated: true,
            adminToken: persistedState.state.adminToken,
          });
        } else {
          // Token exists but no persisted user state - fetch profile using SessionManager (Requirement 1.1, 1.2)
          try {
            const response = await sessionManager.fetchWithAuth("/api/users/profile");
            if (response.ok) {
              const data = await response.json();
              const userData = data.user_data || data;
              set({
                isInitialized: true,
                user: userData,
                isAuthenticated: true,
              });
            } else {
              // Profile fetch failed - clear auth data using LocalStorageManager
              localStorageManager.clearAuthData();
              set({
                isInitialized: true,
                isAuthenticated: false,
                user: null,
                adminToken: null,
              });
            }
          } catch {
            // Network error - keep tokens but mark as initialized
            // User can retry later
            set({
              isInitialized: true,
            });
          }
        }
      },

      /**
       * Sync auth state from localStorage (for cross-tab synchronization)
       * Implements Requirements 8.1, 8.2, 8.3
       */
      syncFromStorage: () => {
        const accessToken = localStorageManager.getAccessToken();
        const persistedState = localStorageManager.getPersistedAuthState();

        // If no token exists, user logged out in another tab
        if (!accessToken) {
          const currentState = get();
          if (currentState.isAuthenticated) {
            set({
              user: null,
              isAuthenticated: false,
              adminToken: null,
            });
          }
          return;
        }

        // If token exists and is valid, sync the user state
        if (tokenValidator.isTokenValid(accessToken) && persistedState?.state) {
          const currentState = get();
          const newUser = persistedState.state.user as User | null;
          const newIsAuthenticated = persistedState.state.isAuthenticated;

          // Only update if state actually changed
          if (
            currentState.isAuthenticated !== newIsAuthenticated ||
            currentState.user?.id !== newUser?.id
          ) {
            set({
              user: newUser,
              isAuthenticated: newIsAuthenticated,
              adminToken: persistedState.state.adminToken,
            });
          }
        }
      },

      /**
       * Setup storage event listener for cross-tab synchronization
       * Returns cleanup function to remove listener
       * Implements Requirements 8.1, 8.2, 8.3
       */
      setupStorageListener: () => {
        return localStorageManager.onStorageChange((event) => {
          // Handle auth-related storage changes from other tabs
          if (
            event.key === AUTH_STORAGE_KEYS.ACCESS_TOKEN ||
            event.key === AUTH_STORAGE_KEYS.AUTH_STORAGE
          ) {
            get().syncFromStorage();
          }
        });
      },

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
            // Validate token before storing (Requirement 5.4)
            if (!tokenValidator.isTokenValid(data.token)) {
              const errorMessage = "توکن دریافتی نامعتبر است";
              set({
                isLoading: false,
                error: errorMessage,
                user: null,
                isAuthenticated: false,
              });
              toast.error(errorMessage);
              throw new Error(errorMessage);
            }

            // Store tokens using LocalStorageManager (Requirement 5.3)
            localStorageManager.setAccessToken(data.token);
            if (data.refreshToken) {
              localStorageManager.setRefreshToken(data.refreshToken);
            }
            
            // Create a user object from the backend response structure
            const user: User = {
              id: data.id || data._id,
              name: data.name,
              email: data.email,
              phone: data.phone,
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
          // Clear tokens using LocalStorageManager on error
          localStorageManager.clearAuthData();
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
                phone: data.phone,
                password: data.password,
                email: data.email, // Optional
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
              // Validate token before storing (Requirement 5.4)
              if (!tokenValidator.isTokenValid(userData.token)) {
                const errorMessage = "توکن دریافتی نامعتبر است";
                set({
                  isLoading: false,
                  error: errorMessage,
                  user: null,
                  isAuthenticated: false,
                });
                toast.error(errorMessage);
                throw new Error(errorMessage);
              }

              // Store tokens using LocalStorageManager (Requirement 5.3)
              localStorageManager.setAccessToken(userData.token);
              if (userData.refreshToken) {
                localStorageManager.setRefreshToken(userData.refreshToken);
              }
              
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
          // Get token using LocalStorageManager
          const token = localStorageManager.getAccessToken();
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
          // Clear all auth data using LocalStorageManager (Requirement 7.4)
          localStorageManager.clearAuthData();
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
          // Check for valid token using LocalStorageManager (Requirement 2.1)
          const token = localStorageManager.getAccessToken();
          if (!token) {
            const errorMessage = "کاربر وارد نشده است";
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          // Use SessionManager for authenticated request (Requirements 1.1, 1.2)
          const response = await sessionManager.fetchWithAuth("/api/users/profile", {
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
          // Check for valid token using LocalStorageManager (Requirement 2.1)
          const token = localStorageManager.getAccessToken();
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

          // Use SessionManager for authenticated request (Requirements 1.1, 1.2)
          const response = await sessionManager.fetchWithAuth("/api/users/profile");

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
              // Clear auth data using LocalStorageManager (Requirement 2.1)
              localStorageManager.clearAuthData();
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
        // Use LocalStorageManager for token retrieval (Requirement 2.1)
        const token = get().adminToken || localStorageManager.getAccessToken();
        if (!token) {
          const errorMessage = "Admin not authenticated";
          set({ isLoading: false, error: errorMessage });
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        try {
          const response = await fetch("/api/admin/users?limit=10000", {
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
            hasMobileApp: u.has_mobile_app || u.hasMobileApp || false,
            lastAppOpen: u.last_app_open || u.lastAppOpen,
            appPlatform: u.app_platform || u.appPlatform,
            appVersion: u.app_version || u.appVersion,
            lastLogin: u.last_login || u.lastLogin,
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
        // Use LocalStorageManager for token retrieval (Requirement 2.1)
        const token = get().adminToken || localStorageManager.getAccessToken();
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
            phone: updatedUserBE.phone,
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
        // Use LocalStorageManager for token retrieval (Requirement 2.1)
        const token = get().adminToken || localStorageManager.getAccessToken();
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
            // Validate token before storing (Requirement 5.4)
            if (!tokenValidator.isTokenValid(data.token)) {
              const errorMessage = "توکن دریافتی نامعتبر است";
              set({ isLoading: false, error: errorMessage });
              toast.error(errorMessage);
              throw new Error(errorMessage);
            }

            // Store tokens using LocalStorageManager (Requirement 5.3)
            localStorageManager.setAccessToken(data.token);
            if (data.refreshToken) {
              localStorageManager.setRefreshToken(data.refreshToken);
            }
            
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
          Object.entries(state).filter(([key]) => !['isLoading', 'error', 'allUsers', 'isInitialized'].includes(key))
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
