// C2C Marketplace Store Types

export type StoreStatus = "pending" | "approved" | "rejected" | "suspended";

export interface StoreBankInfo {
  bank_name: string;
  account_number: string;
  iban: string;
  account_holder: string;
}

export interface StoreAddress {
  province: string;
  city: string;
  address: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  banner?: string;
  phone: string;
  email: string;
  address: StoreAddress;
  bank_info: StoreBankInfo;
  rating: number;
  review_count: number;
  product_count: number;
  total_sales: number;
  status: StoreStatus;
  is_verified: boolean;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface StoreRegistrationData {
  name: string;
  description: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  bank_name: string;
  account_number: string;
  iban: string;
  account_holder: string;
  logo?: File;
  banner?: File;
}

export interface StoreUpdateData {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: StoreAddress;
  bank_info?: StoreBankInfo;
}

export interface SellerDashboardData {
  store: Store;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  netRevenue: number;
  commissionRate: number;
}

export interface StoreListResponse {
  data: Store[];
  pagination: {
    totalPages: number;
    currentPage: number;
    totalStores: number;
  };
}

export interface CanBecomeSellerResponse {
  can_become_seller: boolean;
  current_role: string;
  has_store: boolean;
  message: string;
}
