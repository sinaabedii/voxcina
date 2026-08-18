import { Product } from "./product";

export interface CartItemVariant {
  variantId?: string;
  size?: string;
  color?: string;
  colorName?: string; // Display name for the color (e.g., "قرمز")
  sku?: string;       // Unique SKU for this color+size combination
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  size?: string;
  variantId?: string;
  color?: string;
  colorName?: string; // Display name for the color
  sku?: string;       // Unique SKU for this variant
  price: number;
}

export interface Cart {
  id: string;
  userId?: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  warnings?: string[];
}

export interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  items?: CartItem[];
}

export interface RequiredColorEntry {
  productId: string;
  color?: string;
  colorName?: string;
}

export interface PromoCode {
  code: string;
  discountPercentage: number;
  minPurchase: number;
  maxDiscount: number;
  isValid: boolean;
  expireDate?: string;
  description?: string;
  errorMessage?: string;
  type?: "admin" | "negotiated" | "cart_recovery";
  productIds?: string[];
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  // For negotiated coupons: restricts the discount to cart items whose
  // productId AND color match one of these entries (any size qualifies).
  requiredColors?: RequiredColorEntry[];
}
