/**
 * Postex Shipping Provider
 * Handles communication with Postex API and transforms responses
 * Requirements: 1.2, 1.3, 3.3, 6.1, 6.2
 */

import { ShippingMethod, ShippingProvider, ShippingQuoteParams, getBoxTypeForItemCount } from './types';

/**
 * Postex API service price structure
 */
export interface PostexServicePrice {
  courierLogo: string;
  courierName: string;
  courierCode: string;
  serviceType: string;
  serviceName: string;
  slaDays: string;
  slaHours: number;
  totalPrice: number; // In Rials
  vat: number;
  discountAmount: number;
  initPrice: number;
}

/**
 * Postex API shipping price response structure
 */
export interface PostexShippingPrice {
  custom_parcel_id: string;
  service_price: PostexServicePrice[];
}

/**
 * Postex API response structure
 */
export interface PostexResponse {
  shipping_prices: PostexShippingPrice[];
}

/**
 * Postex parcel properties for quote request
 */
export interface PostexParcelProperties {
  length: number;
  width: number;
  height: number;
  total_weight: number;
  is_fragile: boolean;
  is_liquid: boolean;
  total_value: number;
  pre_paid_amount: null;
  total_value_currency: 'IRR';
  box_type_id: number;
}


/**
 * Postex parcel structure for quote request
 */
export interface PostexParcel {
  custom_parcel_id: string;
  to_city_code: number;
  payment_type: 'SENDER';
  parcel_properties: PostexParcelProperties;
}

/**
 * Postex courier configuration for quote request
 */
export interface PostexCourier {
  courier_code: string;
  service_type: string;
}

/**
 * Postex quote request structure
 */
export interface PostexQuoteRequest {
  collection_type: 'pick_up';
  from_city_code: number;
  courier: PostexCourier;
  value_added_service: Record<string, unknown>;
  parcels: PostexParcel[];
}

/**
 * Converts Rial to Toman by dividing by 10 and rounding
 * Requirements: 1.3
 *
 * @param rialValue - Price in Rials
 * @returns Price in Tomans (rounded)
 */
export function convertRialToToman(rialValue: number): number {
  return Math.round(rialValue / 10);
}

/**
 * Transforms Postex API response to normalized ShippingMethod array
 * Requirements: 1.2, 3.3, 6.1, 6.2
 *
 * @param response - Raw Postex API response
 * @returns Array of normalized ShippingMethod objects
 */
export function transformPostexResponse(response: PostexResponse): ShippingMethod[] {
  if (!response.shipping_prices || response.shipping_prices.length === 0) {
    return [];
  }

  const servicePrices = response.shipping_prices[0]?.service_price || [];

  return servicePrices.map((sp, index) => ({
    id: `postex-${sp.courierCode}-${sp.serviceType}-${index}`,
    providerId: 'postex',
    courierCode: sp.courierCode,
    courierName: sp.courierName,
    courierLogo: sp.courierLogo,
    serviceType: sp.serviceType,
    serviceName: sp.serviceName,
    price: convertRialToToman(sp.totalPrice),
    priceRial: sp.totalPrice,
    slaDays: sp.slaDays,
    slaHours: sp.slaHours,
  }));
}


/**
 * Creates a Postex quote request payload
 *
 * @param params - Shipping quote parameters
 * @returns Postex API request payload
 */
export function createPostexQuoteRequest(params: ShippingQuoteParams): PostexQuoteRequest {
  const boxType = getBoxTypeForItemCount(params.itemCount);

  return {
    collection_type: 'pick_up',
    from_city_code: 1, // Tehran as default origin
    courier: {
      courier_code: '',
      service_type: '',
    },
    value_added_service: {},
    parcels: [
      {
        custom_parcel_id: `parcel-${Date.now()}`,
        to_city_code: params.toCityCode,
        payment_type: 'SENDER',
        parcel_properties: {
          length: boxType.length,
          width: boxType.width,
          height: boxType.height,
          total_weight: 1000, // Default 1kg
          is_fragile: false,
          is_liquid: false,
          total_value: params.totalValue * 10, // Convert Toman to Rial
          pre_paid_amount: null,
          total_value_currency: 'IRR',
          box_type_id: boxType.id,
        },
      },
    ],
  };
}

/**
 * Postex shipping provider implementation
 * Implements the ShippingProvider interface for extensibility
 * Requirements: 2.1
 */
export const postexProvider: ShippingProvider = {
  name: 'postex',

  async getQuotes(params: ShippingQuoteParams): Promise<ShippingMethod[]> {
    const response = await fetch('/api/postex/shipping/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch shipping quotes from Postex');
    }

    const data = await response.json();
    return data.methods || [];
  },
};
