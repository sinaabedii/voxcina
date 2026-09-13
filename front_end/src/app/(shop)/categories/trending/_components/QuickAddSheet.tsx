"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getCanonicalColor } from "@/lib/product-variants";
import { useCartStore } from "@/store/cart-store";
import type { ColorVariantListItem } from "@/types/product";
import { buyableSizes, toCartProduct } from "./trending-utils";

interface QuickAddSheetProps {
  item: ColorVariantListItem | null;
  onClose: () => void;
}

/**
 * Size picker for adding a ranked variant to the cart without leaving the list.
 *
 * One sheet lives at the page root and is handed whichever entry was tapped,
 * rather than each of the ten rows mounting its own — a list this long would
 * otherwise carry ten copies of the same dialog in the DOM.
 *
 * It is a bottom sheet on phones and a centered dialog from sm up: on a phone
 * the thumb is at the bottom of the screen, and a centered dialog puts the size
 * buttons as far from it as the layout allows.
 */
export default function QuickAddSheet({ item, onClose }: QuickAddSheetProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  // A fresh entry starts with nothing chosen; the previous pick must not carry
  // over to a garment that may not even offer that size.
  useEffect(() => setSelected(null), [item?.colorVariant.variantId, item?.productId]);

  // Escape closes, and the page behind stops scrolling while the sheet is open.
  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const variant = item.colorVariant;
  const inStockSizes = new Set(buyableSizes(item).map((size) => size.size));

  const confirm = async () => {
    if (!selected || isAdding) return;
    setIsAdding(true);
    // addItem resolves to whether the piece really landed in a cart. A server
    // refusal toasts its own reason, so on false the sheet stays open — the
    // shopper keeps their size pick and can choose another — and no success
    // is claimed here.
    const ok = await addItem(
      toCartProduct(item),
      1,
      selected,
      getCanonicalColor(variant) || variant.colorName,
      variant.colorName,
      variant.variantId
    );
    setIsAdding(false);
    if (!ok) return;
    onClose();
    toast.success("به سبد خرید اضافه شد");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-voxcina-darkBlue/40 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`انتخاب سایز برای ${item.name}`}
    >
      <div
        className="w-full max-w-md rounded-t-[1.75rem] bg-voxcina-lightCream p-6 pb-8 shadow-[0_-20px_60px_-20px_rgba(10,27,60,0.45)] animate-slideUp sm:rounded-[1.75rem] sm:pb-6 sm:shadow-[0_30px_80px_-30px_rgba(10,27,60,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Grab handle — phone only, where the sheet is dragged-feeling. */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-voxcina-blue/15 sm:hidden" />

        <p className="text-xs tracking-[0.18em] text-voxcina-blue/45">انتخاب سایز</p>
        <h2 className="mt-1 text-lg font-bold leading-tight text-voxcina-blue">{item.name}</h2>
        <p className="mt-1 text-sm text-voxcina-blue/55">
          {variant.colorName} · {item.brand}
        </p>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {variant.sizes.map((size) => {
            const available = inStockSizes.has(size.size);
            const active = selected === size.size;
            return (
              <button
                key={size.size}
                type="button"
                onClick={() => setSelected(size.size)}
                disabled={!available}
                className={`rounded-xl py-3 text-sm font-bold tabular-nums transition-all duration-200 ${
                  active
                    ? "bg-voxcina-blue text-voxcina-cream shadow-[0_8px_20px_-8px_rgba(10,27,60,0.6)]"
                    : available
                      ? "bg-white text-voxcina-blue ring-1 ring-voxcina-blue/10 hover:ring-voxcina-blue/30 active:scale-[0.97]"
                      : "cursor-not-allowed bg-voxcina-blue/[0.04] text-voxcina-blue/25 line-through"
                }`}
              >
                {size.size}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-voxcina-blue/60 ring-1 ring-voxcina-blue/12 transition-colors hover:bg-voxcina-blue/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!selected || isAdding}
            className="flex-[1.6] rounded-xl bg-voxcina-blue py-3 text-sm font-bold text-voxcina-cream shadow-[0_12px_28px_-12px_rgba(10,27,60,0.7)] transition-all duration-200 hover:bg-voxcina-darkBlue active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 focus-visible:ring-offset-2"
          >
            {isAdding ? "در حال افزودن…" : selected ? "افزودن به سبد" : "سایز را انتخاب کنید"}
          </button>
        </div>
      </div>
    </div>
  );
}
