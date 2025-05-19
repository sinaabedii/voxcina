import {Category} from "./category";


export interface ProductVariant {
  size: string;           // e.g., "S", "M", "L"
  color: string;          // e.g., "Red", "Blue"
  sku: string;            // Unique per variant (e.g., "TSHIRT-RED-M")
  quantity: number;       // Available stock
  images: string[];       // Optional variant-specific images
}

export interface ProductAttribute {
  name: string;           // e.g., "Material", "Care Instructions"
  value: string;          // e.g., "Cotton", "Machine Washable"
}

export interface Product {
  id?: string;                    // MongoDB ObjectID, can be absent if not yet created
  name: string;
  description: string;
  price: number;                  // Base price
  images: string[];               // Main product images (URLs)
  category_ids: string[];         // Array of category ObjectIDs as strings
  brand_id: string;               // Brand ObjectID as string
  variants: ProductVariant[];     // Size/color-specific data
  attributes: ProductAttribute[]; // Product-wide metadata
  is_flash_sale: boolean;         // Part of flash-sale campaign?
  is_active: boolean;             // Soft delete flag
  created_at: string;             // ISO 8601 timestamp
  updated_at: string;             // ISO 8601 timestamp
}


export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  likes: number;
  dislikes: number;
  userAvatar?: string;
  verified: boolean;
  images?: string[];
  isRecommended?: boolean;
  replyTo?: string;
  replies?: Review[];
  isEdited?: boolean;
  editDate?: string;
}

export interface Brand {
  id?: string;             // MongoDB ObjectID, can be absent if not yet created
  name: string;
  slug: string;
  logo: string;            // URL to logo image
  description: string;
  createdAt?: string;      // ISO 8601 timestamp, optional
  updatedAt?: string;      // ISO 8601 timestamp, optional
}


export interface ProductFilter {
  categories?: string[];
  brands?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  colors?: string[];
  sizes?: string[];
  rating?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "rating" | "popular";
  search?: string;
  inStockOnly?: boolean;

  discountOnly?: boolean;
  newOnly?: boolean;
  featuredOnly?: boolean;
  tags?: string[];
  attributes?: Record<string, string[]>;
  materials?: string[];
  hasVideo?: boolean;
  hasReviews?: boolean;
  warranty?: string[];
  page?: number;
  limit?: number;
}

export interface RecentlyViewedProduct {
  productId: string;
  viewedAt: string;
}

export interface ComparedProduct {
  productId: string;
  addedAt: string;
}

export interface UserRating {
  userId: string;
  productId: string;
  rating: number;
  review?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserReviewAction {
  userId: string;
  reviewId: string;
  action: "like" | "dislike";
  createdAt: string;
}

export interface StockNotification {
  id: string;
  userId: string;
  productId: string;
  email: string;
  phone?: string;
  size?: string;
  color?: string;
  createdAt: string;
  isNotified: boolean;
  notifiedAt?: string;
}

export interface ProductStats {
  productId: string;
  viewCount: number;
  salesCount: number;
  wishlistCount: number;
  reviewCount: number;
  averageRating: number;
  lastUpdated: string;
}
