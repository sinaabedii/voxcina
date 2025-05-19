import { Product } from "./product";

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
}

export interface Cart {
  id: string;
  userId?: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  items?: CartItem[];
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
}
