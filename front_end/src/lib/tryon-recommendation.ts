import {
  findColorVariant,
  getCanonicalColor,
  getProductDisplayImage,
  getVariantUrlValue,
} from "@/lib/product-variants";
import { CartItem } from "@/types/cart";
import { ColorVariant, Product } from "@/types/product";
import { RecommendedProduct, RequiredColorEntry, TryOnEligibleItem } from "@/types/tryon";

/**
 * Reading a recommendation. The agent names a product and a color; everything
 * the UI shows (image, size list, link target) is resolved from the product
 * document when the client already has it, and from the flat wire fields when
 * it does not.
 */

export const getRecommendedVariant = (rec: RecommendedProduct): ColorVariant | undefined =>
  rec.product
    ? findColorVariant(rec.product, rec.selected_color || rec.color, rec.color_name)
    : undefined;

export const getRecommendedColor = (rec: RecommendedProduct): string | undefined =>
  getCanonicalColor(getRecommendedVariant(rec)) ||
  rec.selected_color ||
  rec.color ||
  rec.color_name ||
  undefined;

export const getRecommendedColorName = (rec: RecommendedProduct): string | undefined =>
  getRecommendedVariant(rec)?.colorName ||
  rec.color_name ||
  rec.selected_color ||
  rec.color ||
  undefined;

export const getRecommendedSize = (rec: RecommendedProduct): string | undefined => {
  if (!rec.product) return rec.size || rec.sizes?.[0];
  const variant = findColorVariant(rec.product, getRecommendedColor(rec), rec.color_name);
  return variant?.sizes?.find((s) => s.quantity > 0)?.size || rec.size;
};

/** The sizes that are actually in stock for the recommended color. */
export const getRecommendedSizes = (rec: RecommendedProduct): string[] => {
  const variant = rec.product
    ? findColorVariant(rec.product, getRecommendedColor(rec), getRecommendedColorName(rec))
    : undefined;
  if (variant?.sizes?.length) {
    return variant.sizes.filter((s) => s.quantity > 0).map((s) => s.size);
  }
  return rec.sizes || [];
};

export const getRecommendedDisplayImage = (rec: RecommendedProduct): string | null =>
  getProductDisplayImage(rec.product, getRecommendedColor(rec), getRecommendedColorName(rec)) ||
  rec.image ||
  null;

/** Product page link, pinned to the recommended variant when there is one. */
export const getRecommendedHref = (rec: RecommendedProduct): string => {
  const variant = getRecommendedVariant(rec);
  const key = variant?.variantId ? "variant" : "color";
  const value = getVariantUrlValue(variant) || getRecommendedColor(rec) || "";
  return `/products/${rec.product_id}?${key}=${encodeURIComponent(value)}`;
};

export const matchesRecommendedVariant = (
  item: TryOnEligibleItem,
  rec: RecommendedProduct
): boolean =>
  item.product.id === rec.product_id &&
  !!findColorVariant([item.colorVariant], getRecommendedColor(rec), getRecommendedColorName(rec));

/**
 * Enough of a product document to add the recommendation to the cart or try it
 * on. The agent sends flat fields, so the single recommended color is rebuilt
 * as the product's only variant.
 */
export const buildRecommendedProduct = (rec: RecommendedProduct): Product => {
  if (rec.product) return rec.product;
  const selectedColor = rec.selected_color || rec.color || rec.color_name || "";
  const selectedColorName = rec.color_name || rec.selected_color || rec.color || "";
  return {
    id: rec.product_id,
    name: rec.product_name,
    description: "",
    price: rec.price,
    originalPrice: rec.price,
    mainImages: rec.image ? [rec.image] : [],
    colorVariants: [{
      color: selectedColor,
      colorName: selectedColorName,
      images: rec.image ? [rec.image] : [],
      tryOnImage: rec.image,
      tryOnGarmentType: "upper_body",
      sizes: (rec.sizes?.length ? rec.sizes : rec.size ? [rec.size] : []).map((size) => ({ size, quantity: 99, sku: "" })),
    }],
    category_ids: [],
    brand_id: "",
    attributes: [],
    is_flash_sale: false,
    is_active: true,
    inStock: true,
    created_at: "",
    updated_at: "",
  };
};

/** The cart lines that can be tried on, in cart order. */
export const computeEligibleItems = (items: CartItem[]): TryOnEligibleItem[] =>
  items
    .filter((item) => item.product?.colorVariants?.length)
    .map((item) => {
      const colorVariant =
        findColorVariant(item.product, item.color, item.colorName) || item.product.colorVariants[0];
      return colorVariant?.tryOnImage
        ? { cartItem: item, colorVariant, product: item.product }
        : null;
    })
    .filter((x): x is TryOnEligibleItem => x !== null);

const colorsOverlap = (
  color1?: string,
  colorName1?: string,
  color2?: string,
  colorName2?: string
): boolean => {
  const values1 = [color1, colorName1].filter((v): v is string => !!v && v.trim() !== "");
  const values2 = [color2, colorName2].filter((v): v is string => !!v && v.trim() !== "");
  if (values1.length === 0 || values2.length === 0) return false;
  return values1.some((v) => values2.includes(v));
};

/**
 * Which of a coupon's products the cart is still missing. A product counts only
 * in the exact color the coupon was negotiated for; any size of it qualifies.
 */
export const missingCouponProducts = (
  cartItems: CartItem[],
  productIds: string[],
  requiredColors: RequiredColorEntry[]
): string[] =>
  productIds.filter((pid) => {
    const required = requiredColors.find((rc) => rc.productId === pid);
    return !cartItems.some((item) => {
      if (item.productId !== pid) return false;
      if (!required || (!required.color && !required.colorName)) return true;
      return colorsOverlap(required.color, required.colorName, item.color, item.colorName);
    });
  });
