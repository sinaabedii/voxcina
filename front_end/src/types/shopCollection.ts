// Mirrors models/shop_collection.go. Change the Go limits together with this file.

export type ShopCollectionPriceMode = "auto" | "custom";

/** One stored item reference: a specific color variant of a product. */
export interface ShopCollectionItem {
  product_id: string;
  variant_id: string;
}

/** An item resolved against the live catalog at read time. */
export interface ShopCollectionItemView {
  product_id: string;
  variant_id: string;
  link: string; // /products/{id}?variant={variantId}
  name: string;
  color_name?: string;
  color?: string;
  image?: string;
  price: number;
  quantity: number;
  in_stock: boolean;
  product_found: boolean;
  variant_found: boolean;
}

export interface ShopCollection {
  id?: string;
  title: string;
  description: string;
  images: string[];
  items: ShopCollectionItem[];
  price_mode: ShopCollectionPriceMode;
  price: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

/** Stored document + the fields computed on every read. */
export interface ShopCollectionView extends ShopCollection {
  items_total: number; // live sum of the bundle's item prices
  effective_price: number; // what the bundle costs right now
  price_warning: boolean; // custom price exceeds items_total
  in_stock: boolean; // false as soon as ONE referenced variant is out
  item_views: ShopCollectionItemView[];
}

export interface ShopCollectionStats {
  total: number;
  active: number;
  inactive: number;
  in_stock: number;
}

export interface ShopCollectionListResponse {
  collections: ShopCollectionView[];
  stats?: ShopCollectionStats;
}

/** Admin create/update body (the patchable subset the form sends).
 *  Images never travel here: the form uploads files with an `imageOrder`
 *  (see the store) and the server computes the final gallery. */
export interface ShopCollectionInput {
  title: string;
  description: string;
  items: ShopCollectionItem[];
  price_mode: ShopCollectionPriceMode;
  price?: number;
  is_active?: boolean;
  display_order?: number;
}

/** Mirrors the Go limits in models/shop_collection.go. */
export const SHOP_COLLECTION_LIMITS = {
  title: 120,
  description: 500,
  maxImages: 12,
  minItems: 2,
  maxItems: 20,
} as const;
