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
 * Based on Postex box type specifications
 */
export const BOX_TYPES: Record<number, BoxType> = {
  4: { id: 4, name: "جعبه سایز 1", length: 10, width: 10, height: 15 },
  5: { id: 5, name: "جعبه سایز 2", length: 15, width: 10, height: 20 },
  6: { id: 6, name: "جعبه سایز 3", length: 20, width: 15, height: 20 },
  7: { id: 7, name: "جعبه سایز 4", length: 20, width: 20, height: 30 },
  8: { id: 8, name: "جعبه سایز 5", length: 25, width: 25, height: 35 },
};

/**
 * Determines the appropriate box type based on cart item count
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * @param itemCount - Number of items in the cart
 * @returns BoxType - The appropriate box type for the given item count
 */
export function getBoxTypeForItemCount(itemCount: number): BoxType {
  if (itemCount <= 2) return BOX_TYPES[4];
  if (itemCount <= 5) return BOX_TYPES[5];
  if (itemCount <= 10) return BOX_TYPES[6];
  return BOX_TYPES[7];
}
