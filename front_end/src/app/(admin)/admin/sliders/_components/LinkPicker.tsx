"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface LinkOption {
  label: string;
  href: string;
}

interface LinkPickerProps {
  value?: string;
  onChange: (href: string) => void;
}

interface CategoryLike {
  name?: string;
  slug?: string;
}

interface BrandLike {
  name?: string;
  slug?: string;
  _id?: string;
}

/** Destinations that always exist regardless of catalogue contents. */
const STATIC_OPTIONS: LinkOption[] = [
  { label: "همه محصولات", href: "/products" },
  { label: "محصولات پرطرفدار", href: "/products?sort=popular" },
  { label: "جدیدترین محصولات", href: "/products?sort=newest" },
  { label: "برندها", href: "/brands" },
  { label: "بلاگ", href: "/blog" },
  { label: "پرو مجازی", href: "/tryon" },
  { label: "صفحه اصلی", href: "/" },
];

/**
 * Chooses the slide's CTA destination from routes that actually resolve.
 *
 * Slide CTAs previously pointed at hand-typed paths like /sales and
 * /collections/office that had no matching route, so every homepage view
 * rendered a link to a 404. Options here are built from live API data plus
 * known-good static routes; free text stays available but is the exception.
 */
export default function LinkPicker({ value, onChange }: LinkPickerProps) {
  const [options, setOptions] = useState<LinkOption[]>(STATIC_OPTIONS);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const [categories, brands, collections] = await Promise.all([
        fetch("/api/categories")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("/api/brands")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        // Collections aren't a resource of their own — they're a field on
        // products, so the real set is whatever products currently declare.
        fetch("/api/products?limit=100")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      if (cancelled) return;

      const categoryList: CategoryLike[] = Array.isArray(categories)
        ? categories
        : categories?.data ?? [];
      const brandList: BrandLike[] = Array.isArray(brands)
        ? brands
        : brands?.data ?? [];
      const productRows: { collection?: string }[] = Array.isArray(collections)
        ? collections
        : collections?.data ?? [];

      const categoryOptions = categoryList
        .filter((c) => c.slug)
        .map((c) => ({
          label: `دسته‌بندی: ${c.name ?? c.slug}`,
          href: `/categories/${c.slug}`,
        }));

      const brandOptions = brandList
        .filter((b) => b.slug)
        .map((b) => ({
          label: `برند: ${b.name ?? b.slug}`,
          href: `/brands/${b.slug}`,
        }));

      const collectionOptions = Array.from(
        new Set(productRows.map((p) => p.collection).filter(Boolean) as string[])
      ).map((collection) => ({
        label: `کالکشن: ${collection}`,
        href: `/collection/${encodeURIComponent(collection)}`,
      }));

      setOptions([
        ...STATIC_OPTIONS,
        ...categoryOptions,
        ...brandOptions,
        ...collectionOptions,
      ]);
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // An existing slide may hold a path that isn't in the list (older data, or a
  // deliberately custom link) — show the free-text field rather than silently
  // snapping it to something else.
  useEffect(() => {
    if (value && !options.some((o) => o.href === value)) {
      setIsCustom(true);
    }
  }, [value, options]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">مقصد دکمه</label>

      {isCustom ? (
        <Input
          name="buttonLink"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/products یا https://…"
        />
      ) : (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2 bg-white"
        >
          <option value="">انتخاب کنید…</option>
          {options.map((option) => (
            <option key={option.href} value={option.href}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => setIsCustom((prev) => !prev)}
        className="text-xs text-blue-600 hover:underline"
      >
        {isCustom ? "انتخاب از فهرست مقصدها" : "وارد کردن نشانی سفارشی"}
      </button>
    </div>
  );
}
