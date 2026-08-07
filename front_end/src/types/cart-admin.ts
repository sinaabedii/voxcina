export interface CartItemVariant {
  size: string;
  color: string;
  colorName?: string;
  sku?: string;
}

// Cart item as returned by the admin carts endpoint (backend AdminCartItemSummary)
export interface AdminCartItem {
  product_id: string;
  name: string;
  image?: string;
  price: number;
  variant: CartItemVariant;
  quantity: number;
}

export interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

// Cart as returned by GET /api/admin/carts (backend AdminCartResponse)
export interface AdminCart {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  items: AdminCartItem[];
  item_count: number;
  summary: CartSummary;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  jalali_created_at: string;
  jalali_updated_at: string;
}

export interface AdminCartStats {
  total_carts: number;
  empty_carts: number;
  carts_with_items: number;
}

export interface AdminCartFilters {
  status?: "active" | "inactive" | "all";
  search?: string;
  sort_by?: "newest" | "oldest" | "created_desc" | "created_asc";
  only_with_items?: boolean;
}

// Response from POST /api/admin/carts/send-recovery-sms
export interface CartRecoverySmsResult {
  sent: number;
  skipped: number;
  failed: number;
  errors?: string[];
}
