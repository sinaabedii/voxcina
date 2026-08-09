// Updated types for hierarchical color → size variant structure

export interface SizeVariant {
  size: string;           // e.g., "S", "M", "L", "XL", "XXL"
  sku: string;           // Unique SKU for color+size combination
  quantity: number;      // Available inventory for this specific size
}

export interface ColorVariant {
  variantId?: string;      // Stable identity for this color/pattern variant
  color: string;         // Hex code or color name (e.g., "#FF5733", "Red")
  colorName: string;     // Display name in Persian/English (e.g., "قرمز", "Red")
  swatchImage?: string;  // Pattern/fabric swatch image for color selector
  images: string[];      // Multiple product images for this color (different angles)
  tryOnImage?: string;         // Virtual try-on image for this color
  tryOnGarmentType?: string;  // upper_body, lower_body, dresses
  sizes: SizeVariant[];       // Available sizes for this color with inventory
}

// For product list API - each color variant is returned as a separate item
export interface ColorVariantListItem {
  productId: string;
  colorVariant: ColorVariant;

  // Product-level fields (duplicated for each color in the list)
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  brand: string;
  brand_id: string;
  category_ids: string[];
  collection?: string;
  is_flash_sale: boolean;
  average_rating?: number;
  review_count?: number;
  created_at: string;

  // Calculated fields
  totalInventory: number; // Sum of all sizes for this color
  inStock: boolean;        // True if totalInventory > 0
  viewCount?: number;
  rank?: number;
}

export interface ProductAttribute {
  name: string;      // Key/identifier, e.g., "material"
  value: string;     // Value, e.g., "Cotton"
  shownName?: string; // Display name, e.g., "Material" (optional)
}

export interface ProductSearchMetadata {
  namePersian: string;
  descriptionPersian: string;
  keywords: string[];
  tags: string[];
  materialPersian: string;
  materialEnglish: string;
  materialTags: string[];
  stylePersian: string;
  styleEnglish: string;
  occasionTags: string[]
  ;
  season: string[];
  sizeSystem: string;
  fitType: string;
  gender: string;
  ageGroup: string;
}

export interface Product {
  id: string; // MongoDB ObjectID
  name: string;
  description: string;
  price: number; // Base price
  originalPrice: number; // Original price before discounts

  // Main product images (shared across all colors, shown in gallery alongside color-specific images)
  mainImages?: string[];

  // Color variants with their own images and size inventory
  colorVariants: ColorVariant[];

  category_ids: string[]; // Array of category ObjectIDs as strings
  brand_id: string; // Brand ObjectID as string
  brand?: string; // Brand name
  collection?: string; // e.g., بهار, تابستان, پاییز, زمستان
  attributes: ProductAttribute[]; // Product-wide metadata
  is_flash_sale: boolean; // Part of flash-sale campaign?
  is_active: boolean; // Soft delete flag
  inStock: boolean; // Calculated: true if any color+size has quantity > 0
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  average_rating?: number;
  review_count?: number;
  searchMetadata?: ProductSearchMetadata;
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
  status?: "pending" | "approved" | "rejected";
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

// ================================================
// Pagination response helpers
// ================================================
export interface PaginationInfo {
  totalPages: number;
  currentPage: number;
  nextPage?: number;
  prevPage?: number;
  totalItems: number; // Total color variant cards (each color variant is its own card/page item)
  totalColorVariants?: number; // Same as totalItems, kept for API compatibility
}

// Paginated response for color variant list
export interface PaginatedColorVariantsResponse {
  data: ColorVariantListItem[];
  pagination: PaginationInfo;
}
