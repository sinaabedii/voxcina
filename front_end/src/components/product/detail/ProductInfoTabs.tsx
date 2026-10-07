"use client";

import { useRef, useState } from "react";
import ProductAttributes from "@/components/product/ProductAttributes";
import ProductSizeGuide from "./ProductSizeGuide";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product";

// `SizeGuideTable` is imported directly, not through `next/dynamic`. Its whole
// dependency set — react, framer-motion, `cn` — is a subset of what
// `ProductAttributes` above already pulls into this chunk, so splitting it out
// deferred about 2 KB of JSX and in exchange made opening the tab cost a 306 ms
// chunk fetch. Worse, a `dynamic()` with no `loading` option is wrapped in a
// Fragment rather than a Suspense boundary (`next/dist/shared/lib/lazy-dynamic/
// loadable.js`), so its suspension escaped to the route's `loading.tsx` and
// replaced the entire page with `ProductDetailSkeleton` until the chunk landed.
// Anything genuinely worth deferring from here must pass a `loading` fallback.

const TABS = [
  { key: "description", label: "توضیحات این محصول" },
  { key: "care", label: "نحوه نگهداری" },
  { key: "sizeGuide", label: "جدول سایزبندی" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CARE_NOTES = [
  "با آب سرد یا ولرم (حداکثر ۳۰ درجه سانتی‌گراد) و شوینده ملایم بشویید.",
  "از سفیدکننده‌های کلردار و شوینده‌های قوی استفاده نکنید؛ به بافت و رنگ پارچه آسیب می‌رسانند.",
  "لباس را وارونه بشویید تا رنگ و سطح پارچه دچار سایش نشود.",
  "در سایه و دور از نور مستقیم آفتاب خشک کنید؛ حرارت زیاد باعث تغییر رنگ و جمع‌شدن پارچه می‌شود.",
  "در صورت نیاز، با دمای متوسط و ترجیحاً از پشت پارچه اتو بکشید.",
  "در محیطی خشک و خنک نگهداری کنید و از چوب‌لباسی‌های نامناسب استفاده نکنید.",
];

interface ProductInfoTabsProps {
  product: Product;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  className?: string;
}

function parseDescriptionToBullets(text?: string): string[] {
  if (!text || !text.trim()) return [];

  const rawLines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length > 1) {
    return rawLines
      .map((line) =>
        line
          .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+/, "")
          .replace(/^\d+[\.\-\)]\s*/, "")
          .trim()
      )
      .filter(Boolean);
  }

  const singleLine = rawLines[0] || "";
  const sentences = singleLine
    .split(/(?<=[.؛!\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    return sentences
      .map((s) =>
        s
          .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+/, "")
          .replace(/^\d+[\.\-\)]\s*/, "")
          .trim()
      )
      .filter(Boolean);
  }

  return [singleLine];
}

/**
 * Long-form product information, full width under the hero.
 *
 * The description tab prints `product.description`. The page used to print a
 * generated paragraph here ("…یکی از محصولات پرطرفدار برند X…") and never
 * rendered the real description anywhere, so what the catalogue actually says
 * about a product reached neither visitors nor crawlers.
 *
 * Specs sit beside the panel rather than inside a tab: they are the thing
 * people cross-check while reading any of the three tabs.
 */
export default function ProductInfoTabs({
  product,
  selectedSize,
  onSelectSize,
  className,
}: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (key: TabKey) => {
    setActiveTab(key);
    tabRefs.current[key]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusTab(event.key === "Home" ? TABS[0].key : TABS[TABS.length - 1].key);
      return;
    }
    // RTL tablist: ArrowLeft moves to the next tab on screen.
    const step = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const current = TABS.findIndex((tab) => tab.key === activeTab);
    focusTab(TABS[(current + step + TABS.length) % TABS.length].key);
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border border-voxcina-blue/10 bg-voxcina-lightCream dark:border-voxcina-cream/10 dark:bg-card lg:rounded-[28px]",
        className
      )}
    >
      <div
        role="tablist"
        aria-label="اطلاعات محصول"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-3 gap-1 border-b border-voxcina-blue/10 px-3 pt-2 dark:border-voxcina-cream/10 sm:px-5"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              id={`product-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls="product-tabpanel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "min-h-14 border-b-2 px-1 py-3 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 motion-reduce:transition-none sm:px-3 sm:text-sm",
                isActive
                  ? "border-voxcina-blue font-bold text-voxcina-blue dark:border-voxcina-cream dark:text-voxcina-cream"
                  : "border-transparent text-foreground/55 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-7 lg:p-8">
        <div
          role="tabpanel"
          id="product-tabpanel"
          aria-labelledby={`product-tab-${activeTab}`}
          tabIndex={0}
          className="min-h-[12rem] text-sm leading-8 text-foreground/80"
        >
          {activeTab === "description" && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-base font-bold text-foreground">توضیحات محصول</h2>
                {parseDescriptionToBullets(product.description).length > 0 ? (
                  <ul className="space-y-2 text-sm leading-7 text-foreground/85">
                    {parseDescriptionToBullets(product.description).map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-voxcina-blue dark:bg-voxcina-cream"
                          aria-hidden="true"
                        />
                        <span className="flex-1">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-foreground/55">
                    توضیحات متنی برای این محصول ثبت نشده است. مشخصات فنی در ادامه آمده است.
                  </p>
                )}
              </div>

              {/* Integrated Features / Specifications as compact bullet points */}
              <ProductAttributes
                attributes={product.attributes}
                className="border-t border-voxcina-blue/10 pt-5 dark:border-voxcina-cream/10"
              />
            </div>
          )}

          {activeTab === "care" && (
            <div className="max-w-prose">
              <h2 className="mb-3 text-base font-bold text-foreground">نکات شستشو و نگهداری</h2>
              <p>برای حفظ کیفیت و افزایش طول عمر این محصول، این نکات را رعایت کنید:</p>
              <ul className="mt-3 list-disc space-y-2 pr-5">
                {CARE_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "sizeGuide" && (
            <ProductSizeGuide
              product={product}
              selectedSize={selectedSize}
              onSelectSize={onSelectSize}
            />
          )}
        </div>
      </div>
    </section>
  );
}
