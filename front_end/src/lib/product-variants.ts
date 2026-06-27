import { CartItem } from "@/types/cart";
import { ColorVariant, Product } from "@/types/product";

const cleanVariantValue = (value?: string | null): string | undefined => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const variantLookupValues = (color?: string, colorName?: string): string[] => {
  const values = [cleanVariantValue(color), cleanVariantValue(colorName)].filter(Boolean) as string[];
  return Array.from(new Set(values));
};

export const findColorVariant = (
  productOrVariants?: Product | ColorVariant[] | null,
  color?: string,
  colorName?: string
): ColorVariant | undefined => {
  const variants = Array.isArray(productOrVariants)
    ? productOrVariants
    : productOrVariants?.colorVariants;

  if (!variants?.length) return undefined;

  const values = variantLookupValues(color, colorName);
  if (!values.length) return undefined;

  return variants.find((variant) =>
    values.some((value) => cleanVariantValue(variant.color) === value || cleanVariantValue(variant.colorName) === value)
  );
};

export const getCanonicalColor = (variant?: ColorVariant): string | undefined => {
  return cleanVariantValue(variant?.color) || cleanVariantValue(variant?.colorName);
};

export const getCartItemColorKey = (item: Pick<CartItem, "color" | "colorName">): string => {
  return cleanVariantValue(item.color) || cleanVariantValue(item.colorName) || "";
};

export const getCartItemVariant = (item: CartItem): ColorVariant | undefined => {
  return findColorVariant(item.product, item.color, item.colorName);
};

export const getProductDisplayImage = (
  product?: Product | null,
  color?: string,
  colorName?: string
): string | null => {
  if (!product) return null;

  const selectedVariant = findColorVariant(product, color, colorName);
  if (selectedVariant?.images?.[0]) return selectedVariant.images[0];
  if (product.mainImages?.[0]) return product.mainImages[0];
  if (product.colorVariants?.[0]?.images?.[0]) return product.colorVariants[0].images[0];
  return null;
};

export const getCartItemImage = (item: CartItem): string | null => {
  return getProductDisplayImage(item.product, item.color, item.colorName);
};
