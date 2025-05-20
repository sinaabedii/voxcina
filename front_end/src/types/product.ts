export interface ProductVariant {
  size: string; // e.g., "S", "M", "L"
  color: string; // e.g., "Red", "Blue"
  sku: string; // Unique per variant (e.g., "TSHIRT-RED-M")
  quantity: number; // Available stock
  images: string[]; // Optional variant-specific images
}

export interface ProductAttribute {
  name: string;      // Key/identifier, e.g., "material"
  value: string;     // Value, e.g., "Cotton"
  shownName?: string; // Display name, e.g., "Material" (optional)
}

export interface Product {
  id: string; // MongoDB ObjectID, can be absent if not yet created
  name: string;
  description: string;
  price: number; // Base price //
  
  originalPrice: number; // add continue/////////////

  images: string[]; // Main product images (URLs)
  category_ids: string[]; // Array of category ObjectIDs as strings
  brand_id: string; // Brand ObjectID as string
  brand?: string; // Brand name (added property) ToDo : not returned from API, it should be

  variants: ProductVariant[]; // Size/color-specific data
  attributes: ProductAttribute[]; // Product-wide metadata
  is_flash_sale: boolean; // Part of flash-sale campaign?
  is_active: boolean; // Soft delete flag
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  inStock: boolean
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
  id?: string; // MongoDB ObjectID, can be absent if not yet created
  name: string;
  slug: string;
  logo: string; // URL to logo image
  description: string;
  createdAt?: string; // ISO 8601 timestamp, optional
  updatedAt?: string; // ISO 8601 timestamp, optional
}

// Update this in your types/product.ts file

export interface ProductFilter {
  categories?: string[];
  brands?: string[];
  colors?: string[];
  sizes?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  inStockOnly?: boolean;
  search?: string;
  sort?: 'price-asc' | 'price-desc' | 'newest' | 'popularity' | string;
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
