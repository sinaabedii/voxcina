export interface OrderVariant {
  size: string;
  color: string;
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
  shipping_address: ShippingAddress;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'; // Match backend statuses
  status_text: string; // Localized status
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'; // Match backend statuses
  tracking_code?: string | null; // Nullable
  is_active?: boolean; // Optional since it's not always sent
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  // Fields from OrderAPIResponse (Jalali dates)
  jalali_created_at: string;
  jalali_updated_at: string;
  // Product count field that backend always sends
  product_count: number;
}

// For creating/updating orders - may differ from the full Order interface
export interface OrderSubmission {
  // Define fields needed for creating an order
  // e.g., items, shipping_address_id or new_shipping_address, payment_method_id etc.
} 