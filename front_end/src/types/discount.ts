// Discount types for targeted promotions feature

// Defines which products/categories a discount applies to
export interface DiscountApplicability {
  productIds?: string[];
  categoryIds?: string[];
}

// Criteria for automatically targeting users for promotions
export interface TargetingCriteria {
  hasMobileApp?: boolean;
  minOrders?: number;
  maxOrders?: number;
  inactiveDays?: number;
  registeredAfter?: string;
  registeredBefore?: string;
}

// Discount/Promotion model
export interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  maxUses?: number;
  usedCount: number;
  applicableTo?: DiscountApplicability;
  createdAt?: string;
  updatedAt?: string;
  // Targeting fields for public/targeted promotions
  isPublic: boolean;
  assignedUsers?: string[];
  targetingCriteria?: TargetingCriteria;
}

// Request type for creating/updating discounts
export interface DiscountFormData {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  maxUses?: number;
  applicableTo?: DiscountApplicability;
  isPublic: boolean;
  assignedUsers?: string[];
  targetingCriteria?: TargetingCriteria;
}

// User filter request for targeting
export interface UserFilterRequest {
  hasMobileApp?: boolean;
  minOrders?: number;
  maxOrders?: number;
  inactiveDays?: number;
  registeredAfter?: string;
  registeredBefore?: string;
}

// User targeting statistics response
export interface UserTargetingStats {
  totalUsers: number;
  mobileAppUsers: number;
  nonMobileAppUsers: number;
  usersWithOrders: number;
  firstTimeBuyers: number;
  inactiveUsers: number;
  newUsers: number;
}
