"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Package, ShoppingBag } from "lucide-react";
import { toast } from "react-toastify";
import Footer from "@/components/layout/Footer";
import BackendImage from "@/components/BackendImage";
import Button from "@/components/ui/Button";
import SizeSelector from "@/components/ui/SizeSelector";
import TexturedBackground from "@/components/ui/TexturedBackground";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCartStore } from "@/store/cart-store";
import { activityTracker } from "@/lib/activity-tracker";
import { formatPrice } from "@/lib/utils";
import type { CollectionBundleItem } from "@/lib/shop-collections";
import type { ShopCollectionView } from "@/types/shopCollection";

interface CollectionBundleProps {
  collection: ShopCollectionView;
  items: CollectionBundleItem[];
}

const faNumber = (value: number) => value.toLocaleString("fa-IR");

/** Stock left at which the shopper is warned it is running out. */
const LOW_STOCK = 3;

/**
 * A single collection, laid out to be bought: the shopper picks a size for
 * every piece and adds the whole set to the cart in one action.
 *
 * The cart has no bundle line — it stores one entry per product + color + size
 * — so "add the set" adds each picked piece as its own cart item, one after the
 * other (the store drops concurrent calls to the same operation, so they cannot
 * be fired in parallel). That also means the cart totals the pieces at their
 * own prices; a collection priced by hand says so next to its price rather than
 * promising a total the checkout would not honour.
 */
export default function CollectionBundle({ collection, items }: CollectionBundleProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((state) => state.addItem);

  const [picked, setPicked] = useState<Record<string, string | undefined>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  useScrollReveal(listRef, { selector: ".bundle-piece", deps: [items.length] });

  const buyable = useMemo(() => items.filter((item) => item.inStock), [items]);
  const chosen = useMemo(
    () => buyable.filter((item) => picked[item.key]),
    [buyable, picked]
  );

  const cover = collection.images?.[0];
  const gallery = collection.images?.slice(1, 5) ?? [];
  const itemsTotal = items.reduce((sum, item) => sum + item.price, 0);
  const chosenTotal = chosen.reduce((sum, item) => sum + item.price, 0);
  const missing = buyable.length - chosen.length;
  const soldOut = items.length - buyable.length;
  /** The admin priced this set by hand, so it differs from its pieces' sum. */
  const hasBundlePrice = Math.round(collection.effective_price) !== Math.round(itemsTotal);

  const handleAdd = async () => {
    if (chosen.length === 0 || isAdding) return;
    setIsAdding(true);

    try {
      // Sequential on purpose: the cart store guards each operation name and
      // silently drops a second addItem while one is still in flight.
      for (const item of chosen) {
        const size = picked[item.key];
        if (!size) continue;
        await addItem(item.product, 1, size, item.color, item.colorName, item.variantId);
        activityTracker.trackAddToCart(item.productId, item.name, {
          source: "collection_bundle",
          collectionId: collection.id,
          collectionTitle: collection.title,
          size,
          colorName: item.colorName,
          price: item.price,
        });
      }

      setAddedCount(chosen.length);
      toast.success(`${faNumber(chosen.length)} قطعه از این ست به سبد خرید اضافه شد`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <main className="relative isolate min-h-screen pb-16">
        <TexturedBackground />

        <div className="container px-4 pt-8 sm:px-6 sm:pt-12">
          <Link
            href="/collection"
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-voxcina-blue shadow-soft backdrop-blur-sm transition-colors hover:bg-white"
          >
            <ArrowRight className="h-4 w-4" />
            <span>همه کالکشن‌ها</span>
          </Link>

          {/* Hero — the set itself: its image, what it is, what it costs.
              Reversed on desktop so the opaque cover takes the corner the brand
              background's navy blob occupies, leaving the copy on clean cream;
              stacked on mobile the copy sits on the blob, hence its own panel. */}
          <section className="mt-6 flex flex-col gap-8 lg:mt-10 lg:flex-row-reverse lg:items-start lg:gap-12">
            <div className="flex-1 rounded-3xl bg-voxcina-cream/85 p-5 text-voxcina-blue sm:p-7 lg:bg-transparent lg:p-0">
              <span className="text-xs tracking-widest text-voxcina-blue/60 sm:text-sm">کالکشن</span>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-voxcina-blue/75 sm:text-base">
                  {collection.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-voxcina-blue px-5 py-2 text-base font-bold text-voxcina-cream shadow-soft sm:text-lg">
                  {formatPrice(collection.effective_price)}
                </span>
                <span className="rounded-full bg-voxcina-blue/10 px-3 py-2 text-xs text-voxcina-blue/70">
                  {faNumber(items.length)} قطعه
                </span>
                {soldOut > 0 && (
                  <span className="rounded-full bg-neutral-700 px-3 py-2 text-xs font-medium text-white">
                    {faNumber(soldOut)} قطعه ناموجود
                  </span>
                )}
              </div>

              {hasBundlePrice && (
                <p className="mt-3 max-w-xl text-xs leading-6 text-voxcina-blue/60">
                  قیمت ست به‌صورت مجموعه تعیین شده است؛ در سبد خرید هر قطعه با قیمت تکی خود
                  ({formatPrice(itemsTotal)} برای کل ست) محاسبه می‌شود.
                </p>
              )}
            </div>

            {cover && (
              <figure className="w-full shrink-0 sm:max-w-[22rem] lg:sticky lg:top-8 lg:w-[22rem] lg:max-w-none">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-strong ring-1 ring-voxcina-blue/10">
                  <BackendImage
                    src={cover}
                    alt={collection.title}
                    width={720}
                    height={900}
                    className="h-full w-full object-cover"
                    sizes="(max-width: 640px) 100vw, 22rem"
                    priority
                  />
                </div>
                {gallery.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-3">
                    {gallery.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-voxcina-blue/10"
                      >
                        <BackendImage
                          src={image}
                          alt={collection.title}
                          width={200}
                          height={200}
                          className="h-full w-full object-cover"
                          sizes="6rem"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </figure>
            )}
          </section>

          {/* Pieces — one size choice each. */}
          <section className="mt-12 max-w-4xl lg:mt-16">
            <h2 className="text-xl font-bold text-voxcina-blue sm:text-2xl">
              سایز هر قطعه را انتخاب کنید
            </h2>
            <p className="mt-2 text-sm text-voxcina-blue/70">
              برای افزودن ست به سبد خرید، سایز همه قطعه‌های موجود را مشخص کنید.
            </p>

            <div ref={listRef} className="mt-6 space-y-4">
              {items.map((item) => {
                const available = item.sizes.filter((size) => size.quantity > 0);
                const selectedSize = picked[item.key];
                const stockLeft = available.find((size) => size.size === selectedSize)?.quantity;

                return (
                  <article
                    key={item.key}
                    className="bundle-piece flex flex-col gap-4 rounded-3xl bg-white/70 p-4 shadow-soft ring-1 ring-voxcina-blue/5 backdrop-blur-sm sm:flex-row sm:items-center sm:p-5"
                  >
                    <Link
                      href={item.link}
                      rel="nofollow"
                      className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-voxcina-blue/10 sm:w-28"
                    >
                      <BackendImage
                        src={item.image || "/images/products/placeholder.jpg"}
                        alt={item.colorName ? `${item.name} — ${item.colorName}` : item.name}
                        width={280}
                        height={373}
                        className="h-full w-full object-cover"
                        sizes="7rem"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={item.link}
                        rel="nofollow"
                        className="text-base font-medium text-voxcina-blue hover:underline sm:text-lg"
                      >
                        {item.name}
                      </Link>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-voxcina-blue/70">
                        <span className="flex items-center gap-1.5">
                          {item.color && (
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-voxcina-blue/20"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          {item.colorName || "رنگ انتخاب‌شده"}
                        </span>
                        <span className="font-bold text-voxcina-blue">{formatPrice(item.price)}</span>
                      </div>

                    </div>

                    {/* The choice itself sits at the far end of the row, so a
                        wide card reads as one line item rather than a gap. */}
                    <div className="sm:w-64 sm:shrink-0">
                      {item.inStock ? (
                        <>
                          <SizeSelector
                            className="mb-0"
                            label="سایز"
                            sizes={item.sizes.map((size) => size.size)}
                            availableSizes={available.map((size) => size.size)}
                            selectedSize={selectedSize}
                            onSizeChange={(size) =>
                              setPicked((current) => ({ ...current, [item.key]: size }))
                            }
                          />
                          {selectedSize && stockLeft !== undefined && stockLeft <= LOW_STOCK && (
                            <p className="mt-2 text-xs text-destructive">
                              تنها {faNumber(stockLeft)} عدد از این سایز باقی مانده است.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="inline-flex items-center gap-2 rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
                          <Package className="h-3.5 w-3.5" />
                          این قطعه فعلاً موجود نیست
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Summary — stays in reach while the shopper works down the list. */}
            <div className="sticky bottom-4 z-20 mt-6">
              <div className="flex flex-col gap-3 rounded-3xl bg-voxcina-blue px-5 py-4 text-voxcina-cream shadow-[0_18px_40px_rgba(10,27,60,0.28)] sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  {buyable.length === 0 ? (
                    <span>هیچ‌کدام از قطعه‌های این ست موجود نیست.</span>
                  ) : missing > 0 ? (
                    <span>
                      سایز {faNumber(missing)} قطعه دیگر انتخاب نشده است
                      {chosen.length > 0 && ` — ${formatPrice(chosenTotal)} تا اینجا`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      همه سایزها انتخاب شد — {formatPrice(chosenTotal)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {addedCount > 0 && (
                    <Link
                      href="/cart"
                      className="text-sm font-medium text-voxcina-cream underline underline-offset-4"
                    >
                      مشاهده سبد خرید
                    </Link>
                  )}
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleAdd}
                    disabled={isAdding || chosen.length === 0}
                    isLoading={isAdding}
                    className="whitespace-nowrap"
                  >
                    <ShoppingBag className="ml-2 h-4 w-4" />
                    {missing > 0 && chosen.length > 0
                      ? `افزودن ${faNumber(chosen.length)} قطعه انتخاب‌شده`
                      : "افزودن ست به سبد خرید"}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
