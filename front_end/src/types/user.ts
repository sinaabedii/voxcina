import { Review } from "@/types/product";

export interface User {
  id: string;
  name: string;
  email?: string; // Optional
  avatar?: string;
  phone: string; // Required - IR phone number (09xxxxxxxxx)
  role: "user" | "admin" | "seller" | "customer";
  addresses?: Address[];
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  reviews?: Review[];
  // Mobile app tracking fields
  hasMobileApp?: boolean;
  lastAppOpen?: string;
  appPlatform?: "android" | "ios" | "unknown";
  appVersion?: string;
  // Auth tracking
  lastLogin?: string;
}

export interface Address {
  id?: string; // Optional for new addresses
  title: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  provinceCode: number;
  city: string;
  cityCode: number;
  address: string;
  postalCode: string;
  isDefault: boolean;
  latitude: number;
  longitude: number;
}

// Backend address structure for API calls
export interface BackendAddress {
  title?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  province?: string;
  province_code?: number;
  address?: string;
  postal_code: string;
  street?: string;
  city: string;
  city_code?: number;
  state?: string;
  country?: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegistrationData {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  email?: string; // Optional
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  adminToken?: string | null;
}
