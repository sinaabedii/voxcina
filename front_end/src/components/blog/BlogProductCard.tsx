"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import type { BlogBlock } from "@/types/blog";
import type { Product, SizeVariant } from "@/types/product";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";

interface BlogProductCardProps {
  block: BlogBlock;
}

/**
 * Renders a resolved blog "product" block as a frosted-glass recommendation
 * card, matching the storefront's ProductCard visual language. Uses the
 * snapshot fields saved on the block for instant paint, then upgrades to a
 * live quick-add control once current inventory for the resolved color is
 * fetched (the block snapshot has no per-size inventory, so quick-add can't
 * be trusted until we know current stock).
 */
export default function BlogProductCard({ block }: BlogProductCardProps) {
  const [singleSize, setSingleSize] = useState<SizeVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const {
    productId,
    productName,
    productImage,
    productColorHex,
    productColorName,
    productPrice = 0,
    productOriginalPrice = 0,
  } = block;

  useEffect(() => {
    if (!productId || !productColorHex) return;
    let cancelled = false;

    fetch(`/api/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((product: Product | null) => {
        if (cancelled || !product || !product.is_active) return;
        const variant = product.colorVariants.find((v) => v.color === productColorHex);
        if (!variant) return;
        const available = variant.sizes.filter((s) => s.quantity > 0);
        if (available.length === 1) {
          setSingleSize(available[0]);
        }
      })
      .catch(() => {
        /* silently keep the "view product" link fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [productId, productColorHex]);

  if (!productId) return null;

  const discount =
    productOriginalPrice > productPrice ? getDiscountPercentage(productOriginalPrice, productPrice) : 0;
  const productHref = `/products/${productId}?color=${encodeURIComponent(productColorHex || "")}`;

  const adjustQuantity = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((q) => Math.min(Math.max(1, q + delta), singleSize?.quantity ?? 99));
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!singleSize) return;
    addItem(
      {
        id: productId,
        name: productName || "",
        price: productPrice,
        originalPrice: productOriginalPrice,
        mainImages: productImage ? [productImage] : [],
        colorVariants: [
          {
            color: productColorHex || "",
            colorName: productColorName || "",
            images: productImage ? [productImage] : [],
            sizes: [singleSize],
          },
        ],
        category_ids: [],
        brand_id: "",
        attributes: [],
        is_flash_sale: false,
        is_active: true,
        inStock: true,
        created_at: "",
        updated_at: "",
      } as unknown as Product,
      quantity,
      singleSize.size,
      productColorHex,
      productColorName
    );
    toast.success("محصول به سبد خرید اضافه شد");
    setQuantity(1);
  };

  return (
    <Link
      href={productHref}
      className="group relative block overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md transition-all duration-300 shadow-[0_10px_36px_-8px_rgba(26,60,105,0.22)] hover:shadow-[0_14px_40px_-8px_rgba(26,60,105,0.28)] hover:-translate-y-0.5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      {/* Floating "Voxcina pick" chip */}
      <div className="relative z-10 -mb-3 mr-4 mt-3 w-fit">
        <div className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-primary-foreground shadow-medium">
          <Sparkles className="h-3 w-3" />
          <span className="text-[10px] font-bold">پیشنهاد وکسینا</span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="relative aspect-square w-24 flex-shrink-0 overflow-hidden rounded-xl bg-secondary/30 sm:w-28">
          {productImage ? (
            <Image
              src={productImage}
              alt={productName || ""}
              fill
              className="object-contain transition-transform duration-700 group-hover:scale-105"
              sizes="120px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              بدون تصویر
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors sm:text-base">
            {productName}
          </h4>
          {productColorName && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-3.5 w-3.5 rounded-full border border-white shadow-soft"
                style={productColorHex?.startsWith("#") ? { backgroundColor: productColorHex } : undefined}
              />
              {productColorName}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className={`text-sm font-bold sm:text-base ${discount > 0 ? "text-primary" : "text-foreground"}`}>
              {formatPrice(productPrice)}
            </span>
            {discount > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(productOriginalPrice)}
              </span>
            )}
          </div>
        </div>

        {singleSize ? (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded-full border border-border/20 bg-secondary/40">
              <button
                onClick={(e) => adjustQuantity(e, -1)}
                disabled={quantity <= 1}
                className="p-1.5 text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                aria-label="کاهش تعداد"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-4 text-center text-xs font-semibold text-foreground">{quantity}</span>
              <button
                onClick={(e) => adjustQuantity(e, 1)}
                disabled={quantity >= singleSize.quantity}
                className="p-1.5 text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                aria-label="افزایش تعداد"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={handleQuickAdd}
              className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-soft transition-all duration-300 hover:bg-primary/90 hover:shadow-medium"
              aria-label="افزودن به سبد خرید"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="flex-shrink-0 rounded-full bg-primary p-2.5 text-primary-foreground shadow-soft transition-all duration-300 group-hover:bg-primary/90 group-hover:shadow-medium">
            <ShoppingCart className="h-4 w-4" />
          </span>
        )}
      </div>
    </Link>
  );
}
