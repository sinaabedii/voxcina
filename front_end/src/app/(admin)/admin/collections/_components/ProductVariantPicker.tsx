"use client";

import { useMemo, useState } from "react";
import { Check, PackageSearch, X } from "lucide-react";
import { Product } from "@/types/product";
import { ShopCollectionItem } from "@/types/shopCollection";
import { toPersianNumber } from "@/lib/utils";

/**
 * Search-and-select widget for the collection form: the admin searches the
 * catalog and picks *specific color variants*, which is the identity a
 * collection item stores (product_id + variant_id).
 *
 * Products without a stable variantId cannot be picked — a legacy color has
 * no durable link target, and the backend rejects an empty variant_id anyway.
 */

interface ProductVariantPickerProps {
  products: Product[];
  items: ShopCollectionItem[];
  onChange: (items: ShopCollectionItem[]) => void;
  maxItems: number;
}

const variantKey = (productID: string, variantID: string) =>
  `${productID}|${variantID}`;

export default function ProductVariantPicker({
  products,
  items,
  onChange,
  maxItems,
}: ProductVariantPickerProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const selected = useMemo(
    () => new Set(items.map((i) => variantKey(i.product_id, i.variant_id))),
    [items]
  );

  const query = search.trim().toLowerCase();
  const matches = useMemo(() => {
    const pool = products.filter(
      (p) => p.is_active && (p.colorVariants?.length ?? 0) > 0
    );
    if (!query) return pool.slice(0, 20);
    return pool
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.colorVariants?.some(
            (cv) =>
              cv.colorName?.toLowerCase().includes(query) ||
              cv.color?.toLowerCase().includes(query)
          )
      )
      .slice(0, 20);
  }, [products, query]);

  const toggle = (product: Product, variantID: string) => {
    const key = variantKey(product.id, variantID);
    if (selected.has(key)) {
      onChange(
        items.filter((i) => variantKey(i.product_id, i.variant_id) !== key)
      );
      return;
    }
    if (items.length >= maxItems) return;
    onChange([...items, { product_id: product.id, variant_id: variantID }]);
  };

  const remove = (item: ShopCollectionItem) =>
    onChange(
      items.filter(
        (i) => variantKey(i.product_id, i.variant_id) !== variantKey(item.product_id, item.variant_id)
      )
    );

  return (
    <div className="space-y-3">
      <div className="relative">
        <PackageSearch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی محصول یا رنگ..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-9 pl-3 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Selected chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            const variant = product?.colorVariants?.find(
              (cv) => cv.variantId === item.variant_id
            );
            return (
              <span
                key={variantKey(item.product_id, item.variant_id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800 border border-blue-200"
                title={product?.name}
              >
                {variant ? variant.colorName || variant.color || "بدون نام" : "رنگ حذف‌شده"}
                <span className="text-blue-400 truncate max-w-[10rem]">
                  {product?.name || "محصول حذف‌شده"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="rounded-full p-0.5 hover:bg-blue-100"
                  aria-label="حذف از کالکشن"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
        {matches.length === 0 && (
          <p className="p-3 text-sm text-gray-400 text-center">محصولی یافت نشد</p>
        )}
        {matches.map((product) => {
          const isOpen = expanded === product.id;
          return (
            <div key={product.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : product.id)}
                className="flex w-full items-center justify-between gap-2 p-2.5 text-right text-sm hover:bg-gray-50"
              >
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {toPersianNumber(product.colorVariants?.length ?? 0)} رنگ ·{" "}
                  {product.price.toLocaleString("fa-IR")}
                </span>
              </button>
              {isOpen && (
                <div className="bg-gray-50 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {product.colorVariants
                    .filter((cv) => cv.variantId)
                    .map((cv) => {
                      const stock = (cv.sizes ?? []).reduce(
                        (sum, s) => sum + (s.quantity || 0),
                        0
                      );
                      const isSelected = selected.has(
                        variantKey(product.id, cv.variantId!)
                      );
                      return (
                        <button
                          key={cv.variantId}
                          type="button"
                          disabled={!isSelected && items.length >= maxItems}
                          onClick={() => toggle(product, cv.variantId!)}
                          className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-800"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          } disabled:opacity-50`}
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                            style={{
                              backgroundColor: cv.color?.startsWith("#")
                                ? cv.color
                                : undefined,
                              backgroundImage: cv.swatchImage
                                ? `url(${cv.swatchImage})`
                                : undefined,
                              backgroundSize: "cover",
                            }}
                          />
                          <span className="truncate">
                            {cv.colorName || cv.color || "بدون نام"}
                          </span>
                          <span
                            className={`mr-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                              stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {stock > 0 ? `موجود: ${toPersianNumber(stock)}` : "ناموجود"}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
