import { Review } from "@/types/product";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  role: "user" | "admin" | "seller" | "customer";
  addresses?: Address[];
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  reviews?: Review[];
}

export interface Address {
  id?: string; // Optional for new addresses
  title: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  city: string;
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
  address?: string;
  postal_code: string;
  street?: string;
  city: string;
  state?: string;
  country?: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  adminToken?: string | null;
}
