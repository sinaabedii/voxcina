/** Display-only snapshot returned by the authenticated receipt endpoints. */
export interface OrderReceipt {
  id: string;
  order_number: string;
  items: {
    product: { id: string; name: string; image: string };
    variant: { size: string; color: string; colorName?: string; sku?: string; variantId?: string };
    quantity: number;
    price_at_purchase: number;
  }[];
  total_amount: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  shipping_address: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    province?: string;
    state?: string;
    city?: string;
    address?: string;
    street?: string;
    postal_code?: string;
    country?: string;
  };
  status: string;
  status_text: string;
  tracking_code?: string | null;
  payment_status: string;
  payment_method: string;
  gateway_name?: string;
  created_at: string;
  jalali_created_at: string;
}
