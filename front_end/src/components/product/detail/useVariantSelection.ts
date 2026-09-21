"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toEnglishNumber } from "@/lib/utils";
import { findVariantByIdOrLegacyValue } from "@/lib/product-variants";
import { ColorVariant, Product } from "@/types/product";

/** Live SKUs mix Persian and Latin digits, so "۴۲" and "42" are one size. */
const normalizeSize = (size: string) => toEnglishNumber(size).trim();

/** A colour is orderable only once it has a stable id and something to show. */
const isSelectable = (variant: ColorVariant) =>
  Boolean(variant.variantId && (variant.color?.trim() || variant.colorName?.trim()));

/** What identifies a colour in the selector and in the `?variant=` deep link. */
const selectionKey = (variant: ColorVariant) => variant.variantId || variant.colorName;

const hasSize = (variant: ColorVariant, size: string) =>
  variant.sizes.some((s) => normalizeSize(s.size) === normalizeSize(size) && s.quantity > 0);

export interface ColorOption {
  variantId?: string;
  color: string;
  colorName: string;
  swatchImage?: string;
}

const toColorOption = (variant: ColorVariant): ColorOption => ({
  variantId: variant.variantId,
  color: variant.color,
  colorName: variant.colorName,
  swatchImage: variant.swatchImage,
});

export interface VariantSelection {
  selectedColor?: string;
  selectedSize?: string;
  quantity: number;
  /** The colour variant the current selection resolves to, if any. */
  selectedVariant?: ColorVariant;
  colors: ColorOption[];
  sizes: string[];
  /** Colours still in stock for the chosen size (all colours when none chosen). */
  colorsForSelectedSize: ColorOption[];
  /** Sizes still in stock for the chosen colour (all sizes when none chosen). */
  sizesForSelectedColor: string[];
  /** Units left for the current selection; 0 until the selection is complete. */
  inventory: number;
  needsColorSelection: boolean;
  needsSizeSelection: boolean;
  isComplete: boolean;
  canModifyQuantity: boolean;
  setColor: (color?: string) => void;
  setSize: (size?: string) => void;
  setQuantity: (quantity: number) => void;
  clear: () => void;
  /** `null` when the selection can go in the cart, otherwise the reason to show. */
  validate: () => string | null;
}

/**
 * Owns colour/size/quantity selection for one product.
 *
 * Extracted from the old `ProductActions` so the purchase panel, the sticky
 * bar and the try-on button all read one source of truth instead of each
 * re-deriving availability from `colorVariants`.
 *
 * `lockedVariantValue` is the `?variant=` / `?color=` deep link: when present
 * the colour is pre-selected and the swatch row stops being a required step,
 * because the visitor already picked one on the listing page.
 */
export function useVariantSelection(
  product: Product,
  lockedVariantValue?: string | null
): VariantSelection {
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  const variants = useMemo(
    () => (product.colorVariants || []).filter(isSelectable),
    [product.colorVariants]
  );

  const colors = useMemo(() => variants.map(toColorOption), [variants]);

  const sizes = useMemo(
    () => [...new Set(variants.flatMap((v) => v.sizes.map((s) => normalizeSize(s.size))))],
    [variants]
  );

  const selectedVariant = useMemo(
    () => findVariantByIdOrLegacyValue(product.colorVariants, selectedColor),
    [product.colorVariants, selectedColor]
  );

  const sizesForSelectedColor = useMemo(() => {
    if (!selectedVariant) return sizes;
    return selectedVariant.sizes.filter((s) => s.quantity > 0).map((s) => normalizeSize(s.size));
  }, [selectedVariant, sizes]);

  const colorsForSelectedSize = useMemo(() => {
    if (!selectedSize) return colors;
    return variants.filter((v) => hasSize(v, selectedSize)).map(toColorOption);
  }, [colors, variants, selectedSize]);

  const needsColorSelection = !lockedVariantValue && colors.length > 0;
  const needsSizeSelection = sizes.length > 0;
  const isComplete =
    (!needsColorSelection || !!selectedColor) && (!needsSizeSelection || !!selectedSize);

  const inventory = useMemo(() => {
    if (!product.colorVariants?.length) return 99;
    // A product with no selectable colour and no sizes has a single implicit
    // variant — fall back to its stock rather than blocking the cart.
    if (!colors.length && !sizes.length) {
      return product.colorVariants[0]?.sizes?.[0]?.quantity ?? 99;
    }
    if (!selectedVariant || !selectedSize) return 0;
    const match = selectedVariant.sizes.find(
      (s) => normalizeSize(s.size) === normalizeSize(selectedSize)
    );
    return match?.quantity || 0;
  }, [product.colorVariants, colors.length, sizes.length, selectedVariant, selectedSize]);

  const canModifyQuantity = isComplete && inventory > 0;

  // Pre-select the colour named by the deep link, once, on first resolve.
  useEffect(() => {
    if (!lockedVariantValue || selectedColor) return;
    const match = findVariantByIdOrLegacyValue(product.colorVariants, lockedVariantValue);
    if (match) setSelectedColor(selectionKey(match));
  }, [product.colorVariants, lockedVariantValue, selectedColor]);

  // A different variant has a different stock ceiling, so start over at 1.
  useEffect(() => {
    setQuantity(1);
  }, [selectedColor, selectedSize]);

  const clear = useCallback(() => {
    setSelectedColor(undefined);
    setSelectedSize(undefined);
  }, []);

  const validate = useCallback((): string | null => {
    if (needsSizeSelection && !selectedSize) return "لطفاً سایز مورد نظر خود را انتخاب کنید";
    if (needsColorSelection && !selectedColor) return "لطفاً رنگ مورد نظر خود را انتخاب کنید";
    if (selectedSize && selectedVariant && !hasSize(selectedVariant, selectedSize)) {
      return "ترکیب سایز و رنگ انتخابی موجود نیست";
    }
    if (!selectedVariant || !isSelectable(selectedVariant)) {
      return "این محصول رنگ مشخصی ندارد و قابل افزودن به سبد نیست";
    }
    return null;
  }, [needsSizeSelection, needsColorSelection, selectedSize, selectedColor, selectedVariant]);

  return {
    selectedColor,
    selectedSize,
    quantity,
    selectedVariant,
    colors,
    sizes,
    colorsForSelectedSize,
    sizesForSelectedColor,
    inventory,
    needsColorSelection,
    needsSizeSelection,
    isComplete,
    canModifyQuantity,
    setColor: setSelectedColor,
    setSize: setSelectedSize,
    setQuantity,
    clear,
    validate,
  };
}
