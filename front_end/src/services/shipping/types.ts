/**
 * Shipping Service Types
 * Defines interfaces for shipping providers, methods, and quote parameters
 * Requirements: 2.1, 6.2
 */

/**
 * Parameters for requesting shipping quotes
 */
export interface ShippingQuoteParams {
  toCityCode: number;
  itemCount: number;
  totalValue: number;
  /** Total cart weight in grams (sum of item weight × quantity) */
  totalWeight?: number;
}

/**
 * Normalized shipping method returned to the frontend
 */
export interface ShippingMethod {
  id: string;
  providerId: string;
  courierCode: string;
  courierName: string;
  courierLogo: string;
  serviceType: string;
  serviceName: string;
  price: number; // In Tomans
  priceRial: number; // Original Rial value
  slaDays: string;
  slaHours: number;
  estimatedDeliveryDays?: number;
}

/**
 * Shipping provider interface for extensibility
 * Allows adding new shipping providers without major refactoring
 */
export interface ShippingProvider {
  name: string;
  getQuotes(params: ShippingQuoteParams): Promise<ShippingMethod[]>;
}

/**
 * Box type definition for shipping calculations
 */
export interface BoxType {
  id: number;
  name: string;
  length: number;
  width: number;
  height: number;
}

/**
 * Predefined box types for shipping calculations
 * Mirrors Postex GET /api/v1/common/boxes (جعبه sizes 1-9; ids 1-3 are
 * letter envelopes, 13 is "larger than 9"). Keep ids/dimensions in sync
 * with the Postex box table.
 */
export const BOX_TYPES: Record<number, BoxType> = {
  4: { id: 4, name: "جعبه سایز 1", length: 10, width: 10, height: 15 },
  5: { id: 5, name: "جعبه سایز 2", length: 15, width: 10, height: 20 },
  6: { id: 6, name: "جعبه سایز 3", length: 20, width: 15, height: 20 },
  7: { id: 7, name: "جعبه سایز 4", length: 20, width: 20, height: 30 },
  8: { id: 8, name: "جعبه سایز 5", length: 25, width: 25, height: 35 },
  9: { id: 9, name: "جعبه سایز 6", length: 25, width: 20, height: 45 },
  10: { id: 10, name: "جعبه سایز 7", length: 30, width: 25, height: 40 },
  11: { id: 11, name: "جعبه سایز 8", length: 40, width: 30, height: 45 },
  12: { id: 12, name: "جعبه سایز 9", length: 45, width: 35, height: 50 },
};

/**
 * Fallback weight in grams per item when a product has no weight set.
 * A zero weight yields only the most expensive courier on Postex, so the
 * checkout falls back to this conservative garment weight instead.
 */
export const DEFAULT_ITEM_WEIGHT_GRAMS = 350;

/**
 * Determines the appropriate box type based on total item count
 * (quantities, not cart lines). Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * @param itemCount - Total number of items (Σ quantity) in the cart
 * @returns BoxType - The appropriate box type for the given item count
 */
export function getBoxTypeForItemCount(itemCount: number): BoxType {
  if (itemCount <= 2) return BOX_TYPES[4];
  if (itemCount <= 5) return BOX_TYPES[5];
  if (itemCount <= 10) return BOX_TYPES[6];
  if (itemCount <= 15) return BOX_TYPES[7];
  return BOX_TYPES[8];
}

/**
 * Computes the total cart weight in grams, falling back to
 * DEFAULT_ITEM_WEIGHT_GRAMS for products without a weight set.
 */
export function getCartWeightGrams(
  items: ReadonlyArray<{ product?: { weight?: number } | null; quantity: number }>,
): number {
  let total = 0;
  for (const item of items) {
    const unitWeight = item.product?.weight;
    const grams =
      typeof unitWeight === "number" && unitWeight > 0
        ? unitWeight
        : DEFAULT_ITEM_WEIGHT_GRAMS;
    total += grams * item.quantity;
  }
  return total;
}
