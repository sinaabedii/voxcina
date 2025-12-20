export interface OrderVariant {
  size: string;
  color: string;
  colorName?: string;
  sku?: string;
}

// OrderTimelineEntry represents a single entry in the order timeline
export interface OrderTimelineEntry {
  status: string;
  timestamp: string;
  jalali_timestamp?: string;
  note?: string;
  admin_id?: string;
  admin_name?: string;
}

// OrderNote represents an internal admin note on an order
export interface OrderNote {
  id: string;
  content: string;
  admin_id: string;
  admin_name: string;
  created_at: string;
  jalali_created_at?: string;
}

// OrderStats for admin dashboard statistics
export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
}

// AdminOrderFilters for filtering orders in admin panel
export interface AdminOrderFilters {
  status?: string;
  payment_status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'newest' | 'oldest' | 'amount_asc' | 'amount_desc';
}

// Product details included in order items (from backend OrderProductResponse)
export interface OrderProductResponse {
  id: string; // Corresponds to primitive.ObjectID
  name: string;
  image: string;
}

// Order item structure that matches backend OrderItemAPIResponse
export interface OrderItem {
  product: OrderProductResponse; // Nested product details
  product_id?: string; // Direct product ID reference
  product_name?: string; // Snapshot of product name at purchase time
  product_image?: string; // Snapshot of main product image
  variant: OrderVariant;
  quantity: number;
  price_at_purchase: number;
}

// Extended address structure that matches backend models.Address
export interface ShippingAddress {
  // Persian-specific fields (primary)
  title?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  province?: string;
  address?: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  
  // Original backend fields (for compatibility)
  street?: string;
  city: string;
  state?: string;
  country?: string;
  is_default?: boolean;
}

export interface Order {
  id: string; // Corresponds to primitive.ObjectID
  user_id: string; // Corresponds to primitive.ObjectID
  order_number: string; // Human-readable ID like "DGS-10001"
  items: OrderItem[];
  total_amount: number;
  shipping_cost?: number; // Shipping cost
  discount_amount?: number; // Discount amount applied
  discount_code?: string; // Discount code used
  shipping_address: ShippingAddress;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'; // Match backend statuses
  status_text: string; // Localized status
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'; // Match backend statuses
  payment_method?: 'online' | 'wallet' | 'cod'; // Payment method
  zibal_track_id?: number; // Zibal payment tracking ID
  zibal_ref_number?: string; // Zibal reference number
  tracking_code?: string | null; // Nullable
  timeline?: OrderTimelineEntry[]; // Order status change history
  notes?: OrderNote[]; // Internal admin notes
  is_active?: boolean; // Optional since it's not always sent
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  paid_at?: string; // Payment completion time
  // Fields from OrderAPIResponse (Jalali dates)
  jalali_created_at: string;
  jalali_updated_at: string;
  jalali_paid_at?: string;
  // Product count field that backend always sends
  product_count: number;
}
 