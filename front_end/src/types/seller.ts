/**
 * Seller (affiliate partner) panel types.
 *
 * These mirror services.VoucherPerformance / SellerPerformance /
 * AttributedOrder on the Go side. Field names are the JSON tags, not the Go
 * names, so a rename there must be made here too.
 */

/** One voucher code with everything measurable about it. */
export interface VoucherPerformance {
  code: string;
  /** The shopper's discount, in whole percent. */
  discount_percent: number;
  /** The seller's commission, in whole percent. The two add up to 36. */
  seller_share_percent: number;
  status: "active" | "scheduled" | "expired" | "depleted";
  created_at: string;
  valid_from: string;
  valid_to: string;
  first_used_at?: string;
  last_used_at?: string;

  orders_total: number;
  orders_paid: number;
  orders_pending: number;
  orders_cancelled: number;
  orders_delivered: number;
  orders_returned: number;
  unique_customers: number;

  /** Merchandise at list price, before the code was applied. */
  gross_subtotal: number;
  /** What the shopper saved. */
  customer_discount: number;
  /** gross_subtotal - customer_discount. */
  net_merchandise: number;
  /** List value of items sent back on an approved return. */
  returned_value: number;
  /** net_merchandise less the returned portion — what the share applies to. */
  commission_base: number;
  /** seller_share_percent% of commission_base. The payable number. */
  commission: number;
  /** Actually collected, including shipping and tax. Not a commission base. */
  revenue_collected: number;
  avg_order_value: number;
  items_sold: number;
}

/** A seller's codes rolled into one payable total. */
export interface SellerPerformance {
  seller_id: string;
  name: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  joined_at: string;
  vouchers: VoucherPerformance[];
  voucher_count: number;
  active_voucher_count: number;

  orders_total: number;
  orders_paid: number;
  orders_pending: number;
  orders_cancelled: number;
  orders_delivered: number;
  orders_returned: number;
  unique_customers: number;

  gross_subtotal: number;
  customer_discount: number;
  net_merchandise: number;
  returned_value: number;
  commission_base: number;
  commission: number;
  revenue_collected: number;
  avg_order_value: number;
  items_sold: number;
}

/** One order credited to a seller code, for the drill-down table. */
export interface AttributedOrder {
  order_id: string;
  order_number: string;
  code: string;
  customer_name?: string;
  status: string;
  payment_status: string;
  /** Whether this order fed the commission figures (paid, not cancelled). */
  countable: boolean;
  subtotal: number;
  discount: number;
  returned_value: number;
  commission: number;
  total_amount: number;
  created_at: string;
}

/** The whole seller panel in one response. */
export interface SellerPanel {
  seller: { id: string; name: string; phone?: string; email?: string };
  budget: { total_percent: number; min_percent: number; max_percent: number };
  summary: SellerPerformance;
  vouchers: VoucherPerformance[];
  recent_orders: AttributedOrder[];
  can_create: boolean;
  active_limit: number;
}

/** The admin sellers table plus shop-wide totals. */
export interface AdminSellersResponse {
  sellers: SellerPerformance[];
  totals: {
    seller_count: number;
    voucher_count: number;
    orders_paid: number;
    gross_subtotal: number;
    customer_discount: number;
    commission: number;
    revenue_collected: number;
  };
  budget: { total_percent: number };
}

/** One seller code with its owner attached, for the flat admin table. */
export interface AdminSellerVoucher extends VoucherPerformance {
  seller_id: string;
  seller_name: string;
}
