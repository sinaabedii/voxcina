export interface OrderVariant {
  size: string;
  color: string;
}

export interface OrderItem {
  product_id: string; // Corresponds to primitive.ObjectID, typically string in frontend
  variant: OrderVariant;
  quantity: number;
  price_at_purchase: number;
  // Optionally, include product details if they are denormalized or fetched with the order
  // product?: { name: string; image?: string; slug?: string }; 
}

// Based on backend models.Address, used in Order's ShippingAddress
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
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
  is_active: boolean;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  // Fields from OrderResponse (Jalali dates)
  jalali_created_at: string;
  jalali_updated_at: string;
  // Potentially add product_count if it's commonly used and sent by backend
  // product_count?: number; 
}

// For creating/updating orders - may differ from the full Order interface
export interface OrderSubmission {
  // Define fields needed for creating an order
  // e.g., items, shipping_address_id or new_shipping_address, payment_method_id etc.
} 