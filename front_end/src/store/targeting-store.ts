import { create } from "zustand";
import { TargetingCriteria, UserTargetingStats, UserFilterRequest } from "@/types/discount";
import { User } from "@/types/user";
import { localStorageManager } from "@/lib/local-storage-manager";

/**
 * Targeting Store
 * 
 * Centralized state management for user targeting in promotions.
 * Handles targeting criteria, filtered users, and statistics.
 * 
 * Requirements: 7.4 - Real-time statistics updates as admin modifies targeting criteria
 */

interface FilteredUser extends Pick<User, 'id' | 'name' | 'email' | 'phone' | 'hasMobileApp' | 'lastAppOpen' | 'createdAt'> {
  orderCount?: number;
}

interface TargetingState {
  // Targeting criteria state
  criteria: TargetingCriteria;
  
  // Filtered users based on criteria
  filteredUsers: FilteredUser[];
  filteredUserCount: number;
  
  // User targeting statistics
  stats: UserTargetingStats | null;
  
  // All users for manual selection
  allUsers: User[];
  
  // Loading states
  isLoadingStats: boolean;
  isLoadingUsers: boolean;
  isLoadingFilteredUsers: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setCriteria: (criteria: TargetingCriteria) => void;
  updateCriteria: (partialCriteria: Partial<TargetingCriteria>) => void;
  clearCriteria: () => void;
  
  fetchStats: (adminToken?: string) => Promise<void>;
  fetchFilteredUserCount: (criteria?: TargetingCriteria, adminToken?: string) => Promise<number>;
  fetchFilteredUsers: (criteria?: TargetingCriteria, adminToken?: string) => Promise<FilteredUser[]>;
  fetchAllUsers: (adminToken?: string) => Promise<User[]>;
  
  // Reset store
  reset: () => void;
}

const initialState = {
  criteria: {},
  filteredUsers: [],
  filteredUserCount: 0,
  stats: null,
  allUsers: [],
  isLoadingStats: false,
  isLoadingUsers: false,
  isLoadingFilteredUsers: false,
  error: null,
};

export const useTargetingStore = create<TargetingState>((set, get) => ({
  ...initialState,

  /**
   * Set targeting criteria (replaces existing)
   */
  setCriteria: (criteria: TargetingCriteria) => {
    set({ criteria });
  },

  /**
   * Update targeting criteria (merges with existing)
   */
  updateCriteria: (partialCriteria: Partial<TargetingCriteria>) => {
    set((state) => ({
      criteria: { ...state.criteria, ...partialCriteria },
    }));
  },

  /**
   * Clear all targeting criteria
   */
  clearCriteria: () => {
    set({ criteria: {}, filteredUsers: [], filteredUserCount: 0 });
  },

  /**
   * Fetch user targeting statistics
   * Requirements: 7.2, 7.5
   */
  fetchStats: async (adminToken?: string) => {
    set({ isLoadingStats: true, error: null });
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const response = await fetch("/api/admin/users/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch targeting stats");
      }

      const data = await response.json();
      
      // Map backend response to frontend type
      const stats: UserTargetingStats = {
        totalUsers: data.total_users ?? data.totalUsers ?? 0,
        mobileAppUsers: data.mobile_app_users ?? data.mobileAppUsers ?? 0,
        nonMobileAppUsers: data.non_mobile_app_users ?? data.nonMobileAppUsers ?? 0,
        usersWithOrders: data.users_with_orders ?? data.usersWithOrders ?? 0,
        firstTimeBuyers: data.first_time_buyers ?? data.firstTimeBuyers ?? 0,
        inactiveUsers: data.inactive_users ?? data.inactiveUsers ?? 0,
        newUsers: data.new_users ?? data.newUsers ?? 0,
      };

      set({ stats, isLoadingStats: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در دریافت آمار";
      set({ error: errorMessage, isLoadingStats: false });
      console.error("Error fetching targeting stats:", error);
    }
  },

  /**
   * Fetch count of users matching targeting criteria
   * Requirements: 7.1, 7.4
   */
  fetchFilteredUserCount: async (criteria?: TargetingCriteria, adminToken?: string) => {
    const targetCriteria = criteria || get().criteria;
    
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const params = buildFilterParams(targetCriteria);

      const response = await fetch(`/api/admin/users/filter/count?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filtered user count");
      }

      const data = await response.json();
      const count = data.count ?? 0;
      
      set({ filteredUserCount: count });
      return count;
    } catch (error) {
      console.error("Error fetching filtered user count:", error);
      return 0;
    }
  },

  /**
   * Fetch users matching targeting criteria
   * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
   */
  fetchFilteredUsers: async (criteria?: TargetingCriteria, adminToken?: string) => {
    const targetCriteria = criteria || get().criteria;
    
    set({ isLoadingFilteredUsers: true, error: null });
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const params = buildFilterParams(targetCriteria);

      const response = await fetch(`/api/admin/users/filter?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(targetCriteria),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filtered users");
      }

      const data = await response.json();
      const usersData = data.data || data.users || data;
      
      const filteredUsers: FilteredUser[] = Array.isArray(usersData)
        ? usersData.map((u: any) => ({
            id: u.id || u._id,
            name: u.name,
            email: u.email,
            phone: u.phone_number || u.phone,
            hasMobileApp: u.has_mobile_app ?? u.hasMobileApp,
            lastAppOpen: u.last_app_open ?? u.lastAppOpen,
            createdAt: u.created_at || u.createdAt,
            orderCount: u.order_count ?? u.orderCount,
          }))
        : [];

      set({ 
        filteredUsers, 
        filteredUserCount: filteredUsers.length,
        isLoadingFilteredUsers: false 
      });
      
      return filteredUsers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در دریافت کاربران";
      set({ error: errorMessage, isLoadingFilteredUsers: false });
      console.error("Error fetching filtered users:", error);
      return [];
    }
  },

  /**
   * Fetch all users for manual selection
   */
  fetchAllUsers: async (adminToken?: string) => {
    set({ isLoadingUsers: true, error: null });
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      const usersData = data.data || data;
      
      const users: User[] = Array.isArray(usersData)
        ? usersData.map((u: any) => ({
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
            hasMobileApp: u.has_mobile_app ?? u.hasMobileApp,
            lastAppOpen: u.last_app_open ?? u.lastAppOpen,
            appPlatform: u.app_platform ?? u.appPlatform,
            appVersion: u.app_version ?? u.appVersion,
          }))
        : [];

      set({ allUsers: users, isLoadingUsers: false });
      return users;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطا در دریافت کاربران";
      set({ error: errorMessage, isLoadingUsers: false });
      console.error("Error fetching users:", error);
      return [];
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));

/**
 * Helper function to build URL params from targeting criteria
 */
function buildFilterParams(criteria: TargetingCriteria): URLSearchParams {
  const params = new URLSearchParams();
  
  if (criteria.hasMobileApp !== undefined) {
    params.append("has_mobile_app", String(criteria.hasMobileApp));
  }
  if (criteria.minOrders !== undefined) {
    params.append("min_orders", String(criteria.minOrders));
  }
  if (criteria.maxOrders !== undefined) {
    params.append("max_orders", String(criteria.maxOrders));
  }
  if (criteria.inactiveDays !== undefined) {
    params.append("inactive_days", String(criteria.inactiveDays));
  }
  if (criteria.registeredAfter) {
    params.append("registered_after", criteria.registeredAfter);
  }
  if (criteria.registeredBefore) {
    params.append("registered_before", criteria.registeredBefore);
  }
  
  return params;
}

/**
 * Selector hooks for specific parts of the store
 */
export const useTargetingCriteria = () => useTargetingStore((state) => state.criteria);
export const useTargetingStats = () => useTargetingStore((state) => state.stats);
export const useFilteredUsers = () => useTargetingStore((state) => state.filteredUsers);
export const useFilteredUserCount = () => useTargetingStore((state) => state.filteredUserCount);
export const useTargetingLoading = () => useTargetingStore((state) => ({
  isLoadingStats: state.isLoadingStats,
  isLoadingUsers: state.isLoadingUsers,
  isLoadingFilteredUsers: state.isLoadingFilteredUsers,
}));
