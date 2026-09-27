// Shipping-discount helpers shared by the cart, checkout and admin voucher UI.
//
// The backend stores a `shipping_discount` value on a discount code and is the
// authority: at checkout it recomputes the customer's shipping cost from the
// base (pre-discount) shipping the client sends, then cross-checks the total.
// Everything here must mirror `handlers/orders.go` (applyShippingDiscount)
// exactly, or checkout fails its total cross-check.

export type ShippingDiscount = "free" | "half" | "full";

// Percent of the shipping cost the customer gets off. "full" — and any unknown
// value, including the legacy empty string — means no shipping discount.
export function shippingDiscountPercent(value?: string | null): number {
  switch (value) {
    case "free":
      return 100;
    case "half":
      return 50;
    default:
      return 0;
  }
}

// Shipping amount a customer pays after the code's shipping discount. Rounds
// half away from zero to match Go's math.Round, so the server and client agree
// on the total even for odd shipping amounts.
export function applyShippingDiscount(base: number, percent: number): number {
  if (!percent) return base;
  return Math.round((base * (100 - percent)) / 100);
}

export const SHIPPING_DISCOUNT_LABELS: Record<ShippingDiscount, string> = {
  free: "ارسال رایگان",
  half: "۵۰٪ تخفیف ارسال",
  full: "پرداخت کامل هزینه ارسال",
};

export const SHIPPING_DISCOUNT_OPTIONS: { value: ShippingDiscount; label: string }[] = [
  { value: "free", label: SHIPPING_DISCOUNT_LABELS.free },
  { value: "half", label: SHIPPING_DISCOUNT_LABELS.half },
  { value: "full", label: SHIPPING_DISCOUNT_LABELS.full },
];
