/**
 * Server-side readers for the admin-curated shop collections (bundles of
 * specific product color variants) that the public /collection pages present.
 *
 * The backend serves them from two endpoints — `/api/shop-collections` for the
 * published list and `/api/shop-collections/{id}` for one — and computes price
 * and stock on every read, so nothing here caches or derives those itself.
 */
import { serverFetch, CACHE_TIMES } from "@/lib/server-api";
import type { ColorVariant, Product } from "@/types/product";
import type {
  ShopCollectionItemView,
  ShopCollectionListResponse,
  ShopCollectionView,
} from "@/types/shopCollection";

/** A collection id is a Mongo ObjectId hex — what /collection/{id} carries. */
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isShopCollectionId(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value);
}

/**
 * The items worth putting on screen: those whose product and color variant
 * still exist. A reference to a deleted product resolves to an empty item view
 * (no name, no image) — the backend keeps it so the bundle reads as out of
 * stock, but there is nothing to render for it.
 */
export function displayableItems(collection: ShopCollectionView): ShopCollectionItemView[] {
  return (collection.item_views || []).filter(
    (item) => item.product_found && item.variant_found
  );
}

/** The published collections, in the admin's display order. */
export async function fetchShopCollections(): Promise<ShopCollectionView[]> {
  const response = await serverFetch<ShopCollectionListResponse>("/api/shop-collections", {
    revalidate: CACHE_TIMES.SHOP_COLLECTIONS,
    tags: ["shop-collections"],
  });

  return (response?.collections || []).filter(
    (collection) => displayableItems(collection).length > 0
  );
}

/** One published collection, or null when it is unknown, unpublished or empty. */
export async function fetchShopCollection(id: string): Promise<ShopCollectionView | null> {
  if (!isShopCollectionId(id)) return null;

  const collection = await serverFetch<ShopCollectionView>(`/api/shop-collections/${id}`, {
    revalidate: CACHE_TIMES.SHOP_COLLECTIONS,
    tags: ["shop-collections", `shop-collection-${id}`],
  });

  if (!collection || displayableItems(collection).length === 0) return null;
  return collection;
}

/** One size of a bundle item, with the stock left for it. */
export interface CollectionBundleSize {
  size: string;
  quantity: number;
}

/**
 * A collection item resolved far enough to be bought: the stored reference plus
 * the picked color's size inventory, and a product object the cart can hold.
 */
export interface CollectionBundleItem {
  /** Stable key for the per-item size selection: product + color variant. */
  key: string;
  productId: string;
  variantId: string;
  name: string;
  link: string;
  color?: string;
  colorName?: string;
  image?: string;
  price: number;
  sizes: CollectionBundleSize[];
  /** At least one size of this color is still buyable. */
  inStock: boolean;
  /**
   * The product as the cart stores it. A guest cart keeps the whole product in
   * local storage and resolves its images and color from there, so this carries
   * the picked variant — and only that one — instead of the full catalogue
   * entry: other colors, the description and the AI metadata (which holds an
   * embedding vector per variant) are dead weight in a cart line.
   */
  product: Product;
}

/** The picked color, stripped of everything a cart line never reads. */
function cartVariant(variant: ColorVariant): ColorVariant {
  const { aiMetadata: _aiMetadata, ...rest } = variant;
  return { ...rest, images: variant.images?.slice(0, 2) ?? [] };
}

function cartProduct(product: Product, variant: ColorVariant): Product {
  return {
    id: product.id,
    name: product.name,
    description: "",
    price: product.price,
    originalPrice: product.originalPrice,
    mainImages: product.mainImages?.slice(0, 1),
    colorVariants: [cartVariant(variant)],
    category_ids: product.category_ids ?? [],
    brand_id: product.brand_id,
    brand: product.brand,
    attributes: [],
    is_flash_sale: product.is_flash_sale,
    is_active: product.is_active,
    inStock: product.inStock,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/**
 * Resolves a collection's items into what the bundle page needs to sell them.
 *
 * Sizes are not part of the collections API — it reports one stock number per
 * item — so each referenced product is read from the products endpoint, where
 * the picked color carries its own size inventory. Those reads are the same
 * cached requests the product pages make, and an item whose product or color
 * has since disappeared is dropped rather than offered without sizes.
 */
export async function fetchCollectionBundleItems(
  collection: ShopCollectionView
): Promise<CollectionBundleItem[]> {
  const resolved = await Promise.all(
    displayableItems(collection).map(async (item): Promise<CollectionBundleItem | null> => {
      const product = await serverFetch<Product>(`/api/products/${item.product_id}`, {
        revalidate: CACHE_TIMES.PRODUCT_DETAIL,
        tags: ["product", `product-${item.product_id}`],
      });
      if (!product) return null;

      const variant = product.colorVariants?.find((v) => v.variantId === item.variant_id);
      if (!variant) return null;

      const sizes: CollectionBundleSize[] = (variant.sizes ?? []).map((size) => ({
        size: size.size,
        quantity: size.quantity,
      }));

      return {
        key: `${item.product_id}:${item.variant_id}`,
        productId: item.product_id,
        variantId: item.variant_id,
        name: product.name,
        link: item.link,
        color: variant.color || item.color,
        colorName: variant.colorName || item.color_name,
        image: item.image || variant.images?.[0] || product.mainImages?.[0],
        price: product.price,
        sizes,
        inStock: product.is_active && sizes.some((size) => size.quantity > 0),
        product: cartProduct(product, variant),
      };
    })
  );

  return resolved.filter((item): item is CollectionBundleItem => item !== null);
}
