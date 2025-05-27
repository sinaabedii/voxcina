export interface ShippingMethod {
  id: string;
  title: string;
  description: string;
  price: number;
  freeShippingThreshold: number; // If order total >= this, shipping is free
  estimatedDeliveryDays?: number;
  icon?: string; // Optional icon name or URL
  [key: string]: any; // For any additional backend properties
}

export interface ShippingMethodResponse {
  methods: ShippingMethod[];
} 