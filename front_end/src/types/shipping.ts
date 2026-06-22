/**
 * Shipping Types
 * Aligned with the new ShippingMethod interface from services/shipping/types.ts
 * Requirements: 6.2
 */

/**
 * Normalized shipping method interface
 * Contains all fields from Postex API integration plus backward-compatible legacy fields
 */
export interface ShippingMethod {
  // Core identification
  id: string;
  providerId: string;

  // Courier information
  courierCode: string;
  courierName: string;
  courierLogo: string;

  // Service details
  serviceType: string;
  serviceName: string;

  // Pricing
  price: number; // In Tomans
  priceRial: number; // Original Rial value from API

  // Delivery time
  slaDays: string; // Persian SLA text (e.g., "از ۲۴ تا ۴۸ ساعت کاری")
  slaHours: number; // Numeric SLA in hours
  estimatedDeliveryDays?: number; // Optional estimated days

  // Legacy fields for backward compatibility
  title?: string; // Maps to serviceName
  description?: string; // Optional description
  freeShippingThreshold?: number; // If order total >= this, shipping is free
  icon?: string; // Optional icon name or URL (maps to courierLogo)
}

/**
 * Response wrapper for shipping methods
 */
export interface ShippingMethodResponse {
  methods: ShippingMethod[];
}

/**
 * Parameters for requesting shipping quotes
 */
export interface ShippingQuoteParams {
  toCityCode: number;
  itemCount: number;
  totalValue: number;
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

// Re-export BOX_TYPES and utility function from service types for convenience
export { BOX_TYPES, getBoxTypeForItemCount } from "@/services/shipping/types";
