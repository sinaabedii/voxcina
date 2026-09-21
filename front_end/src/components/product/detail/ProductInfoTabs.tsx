"use client";

import { useRef, useState } from "react";
import ProductAttributes from "@/components/product/ProductAttributes";
import SizeGuideTable from "@/components/product/SizeGuideTable";
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
  { key: "description", label: "توضیحات محصول" },
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
  className?: string;
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
export default function ProductInfoTabs({ product, className }: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (key: TabKey) => {
    setActiveTab(key);
    tabRefs.current[key]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
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
        "overflow-hidden rounded-2xl border border-border/20 bg-card/50 shadow-soft",
        className
      )}
    >
      <div
        role="tablist"
        aria-label="اطلاعات محصول"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-3 divide-x divide-x-reverse divide-border/20 border-b border-border/20"
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
              aria-controls={`product-panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-4 text-sm transition-colors",
                isActive
                  ? "bg-secondary/40 font-medium text-primary"
                  : "text-foreground/75 hover:bg-secondary/20 hover:text-primary"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:p-6">
        <div
          role="tabpanel"
          id={`product-panel-${activeTab}`}
          aria-labelledby={`product-tab-${activeTab}`}
          tabIndex={0}
          className="min-h-[15rem] max-w-prose text-sm leading-relaxed text-foreground/80"
        >
          {activeTab === "description" &&
            (product.description?.trim() ? (
              <p className="whitespace-pre-line">{product.description}</p>
            ) : (
              <p className="text-muted-foreground">
                توضیحاتی برای این محصول ثبت نشده است. مشخصات کامل را در ستون کناری ببینید.
              </p>
            ))}

          {activeTab === "care" && (
            <>
              <p>برای حفظ کیفیت و افزایش طول عمر این محصول، این نکات را رعایت کنید:</p>
              <ul className="mt-3 list-disc space-y-2 pr-5">
                {CARE_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </>
          )}

          {activeTab === "sizeGuide" && <SizeGuideTable isOpen />}
        </div>

        <ProductAttributes attributes={product.attributes} className="mb-0 self-start" />
      </div>
    </section>
  );
}
