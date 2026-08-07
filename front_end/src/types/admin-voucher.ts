// Unified admin voucher/coupon listing types (discounts + negotiated_coupons)

export type AdminVoucherType = "public" | "targeted" | "negotiated" | "cart_recovery";
export type AdminVoucherStatus = "active" | "scheduled" | "expired" | "used" | "depleted";

export interface AdminVoucherProduct {
  id: string;
  name: string;
  image: string;
  color: string;
  color_name: string;
  in_stock: boolean;
}

export interface AdminVoucher {
  id: string;
  code: string;
  type: AdminVoucherType;
  discount_type: "percentage" | "fixed";
  value: number;
  status: AdminVoucherStatus;
  valid_from?: string;
  valid_until: string;
  created_at: string;
  user_id?: string;
  user_name?: string;
  user_phone?: string;
  assigned_user_count?: number;
  used_count?: number;
  max_uses?: number;
  min_order_amount?: number;
  required_products?: AdminVoucherProduct[];
}

export interface AdminVoucherStats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  used: number;
  depleted: number;
}

export interface AdminVoucherFilters {
  type?: AdminVoucherType;
  status?: AdminVoucherStatus;
  search?: string;
  sort_by?: "newest" | "oldest";
}

export interface AdminVoucherPagination {
  currentPage: number;
  totalPages: number;
  totalVouchers: number;
  pageSize: number;
}
