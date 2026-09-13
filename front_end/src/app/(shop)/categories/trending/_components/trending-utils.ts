import { getVariantUrlValue } from "@/lib/product-variants";
import type { ColorVariantListItem } from "@/types/product";

/** Persian digits for every number the page shows. */
export const faNumber = (value: number) => value.toLocaleString("fa-IR");

/**
 * Deep link to the exact color the ranking is about.
 *
 * A trending entry is a color variant, not a product — sending a visitor to the
 * bare product page would drop the very thing that earned the rank.
 */
export function variantHref(item: ColorVariantListItem): string {
  const variant = item.colorVariant;
  const value = getVariantUrlValue(variant) || variant.color || variant.colorName || "";
  return `/products/${item.productId}?${variant.variantId ? "variant" : "color"}=${encodeURIComponent(value)}`;
}

/** Metadata attached to every click leaving this page, for the ranking feedback loop. */
export function clickMeta(item: ColorVariantListItem, listPosition: number) {
  return {
    source: "trending_index",
    variantId: item.colorVariant.variantId,
    colorName: item.colorVariant.colorName,
    colorHex: item.colorVariant.color,
    inStock: item.inStock,
    brand: item.brand,
    price: item.price,
    listPosition,
  };
}

/** Sizes a visitor can actually buy. A variant with no id has no real inventory. */
export function buyableSizes(item: ColorVariantListItem) {
  const variant = item.colorVariant;
  const concrete = Boolean(variant.variantId && (variant.color?.trim() || variant.colorName?.trim()));
  return concrete ? variant.sizes.filter((size) => size.quantity > 0) : [];
}

/**
 * Share of the top entry's views, as a 0-1 ratio.
 *
 * The index draws this as a rule under each row, which is the one place the
 * page shows *how far apart* the ranks are rather than just their order.
 */
export function viewRatio(item: ColorVariantListItem, leaderViews: number): number {
  if (!leaderViews || !item.viewCount) return 0;
  return Math.min(1, item.viewCount / leaderViews);
}

/** Shape the cart store expects, rebuilt from the flattened list item. */
export function toCartProduct(item: ColorVariantListItem) {
  return {
    id: item.productId,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    brand: item.brand,
    mainImages: item.colorVariant.images,
    colorVariants: [item.colorVariant],
    category_ids: item.category_ids,
    brand_id: item.brand_id,
    collection: item.collection,
    attributes: [],
    is_flash_sale: item.is_flash_sale,
    is_active: true,
    inStock: true,
    created_at: item.created_at,
    updated_at: item.created_at,
  } as any;
}
