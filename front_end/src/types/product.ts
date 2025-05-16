export interface ProductColor {
  name: string;
  code: string;
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

export interface ProductSpecification {
  group: string;
  items: {
    key: string;
    value: string;
  }[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  categoryId: string;
  brand: string;
  inStock: boolean;
  sizes?: string[];
  colors?: ProductColor[];
  rating: number;
  reviewCount: number;
  features?: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  reviews?: Review[];
  sku?: string;
  stockCount?: number;
  specifications?: ProductSpecification[];
  tags?: string[];
  discountPercentage?: number;
  relatedProductIds?: string[];
  videoUrl?: string;
  warranty?: string;
  material?: string;
  downloadableFiles?: { name: string; url: string }[];
  hasVariants?: boolean;
  variantId?: string;
  attributes?: Record<string, string>;
  viewCount?: number;
  salesCount?: number;
  isCustomizable?: boolean;
  hasGift?: boolean;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: "cm" | "mm" | "in";
  };
  weight?: {
    value: number;
    unit: "kg" | "g" | "lb";
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  slug: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
  featured?: boolean;
  order?: number;
  icon?: string;
  bannerImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description?: string;
  website?: string;
  country?: string;
  foundedYear?: number;
  isOfficial?: boolean;
  featured?: boolean;
  productCount?: number;
  bannerImage?: string;
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
