"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Search, ShoppingCart } from "lucide-react";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { ProductGridSkeleton } from "@/components/ui/Loading";
import ProductGrid from "@/components/product/ProductGrid";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import PageTitle from "@/components/dashboard/ui/PageTitle";
import { useDashboardStore } from "@/store/dashboard-store";
import { ColorVariantListItem } from "@/types/product";
import { slideUpItem, staggerContainer } from "@/lib/motion";

type SortOption = "newest" | "oldest" | "price-asc" | "price-desc";

const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
];

// The list endpoint paginates color-variant rows and one product can own
// several of them, so a batch is walked page by page until the endpoint
// reports no more rows. Batching keeps the request URL well under common
// header-size limits.
const IDS_PER_REQUEST = 100;
const ROWS_PER_PAGE = 500;

interface ProductRowsPage {
  rows: ColorVariantListItem[];
  totalPages: number;
}

async function fetchProductRowsPage(ids: string, page: number): Promise<ProductRowsPage> {
  const params = new URLSearchParams({
    ids,
    limit: String(ROWS_PER_PAGE),
    page: String(page),
  });
  const response = await fetch(`/api/products?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch favorite products (${response.status})`);
  }
  const payload = await response.json();
  if (Array.isArray(payload)) {
    return { rows: payload as ColorVariantListItem[], totalPages: 1 };
  }
  // A successful list response always carries pagination. The backend answers
  // 200 with an empty pagination object when it fails to build the page, so
  // surface that as an error instead of pretending the favorites are gone.
  const totalPages = payload?.pagination?.totalPages;
  if (typeof totalPages !== "number") {
    throw new Error("Malformed products response");
  }
  return { rows: (payload?.data ?? []) as ColorVariantListItem[], totalPages };
}

function fetchProductsByIds(ids: string[]): Promise<ColorVariantListItem[]> {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += IDS_PER_REQUEST) {
    batches.push(ids.slice(index, index + IDS_PER_REQUEST));
  }

  return Promise.all(
    batches.map(async (batch) => {
      const idsParam = batch.join(",");
      const firstPage = await fetchProductRowsPage(idsParam, 1);
      const rows = [...firstPage.rows];
      if (firstPage.totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
            fetchProductRowsPage(idsParam, index + 2),
          ),
        );
        remainingPages.forEach((page) => rows.push(...page.rows));
      }
      return rows;
    }),
  ).then((results) => results.flat());
}

/**
 * Favorites are product-level, but the list API answers with one row per color
 * variant. Collapse those rows to a single card per product, preferring a
 * color that is actually in stock.
 */
function collapseToProducts(rows: ColorVariantListItem[]): ColorVariantListItem[] {
  const byProduct = new Map<string, ColorVariantListItem>();
  for (const row of rows) {
    const current = byProduct.get(row.productId);
    if (!current || (!current.inStock && row.inStock)) {
      byProduct.set(row.productId, row);
    }
  }
  return Array.from(byProduct.values());
}

function createdAtTime(item: ColorVariantListItem): number {
  return Date.parse(item.created_at) || 0;
}

export default function FavoritesPage() {
  const router = useRouter();
  const favorites = useDashboardStore((state) => state.favorites);
  const favoriteIds = useMemo(
    () => favorites.map((favorite) => favorite.productId),
    [favorites],
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const [items, setItems] = useState<ColorVariantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Ids that were fetched successfully, so adding one favorite does not refetch
  // the whole list. Failed ids stay out and are retried on the next pass.
  const fetchedIdsRef = useRef(new Set<string>());

  const loadFavorites = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      fetchedIdsRef.current.clear();
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const missingIds = ids.filter((id) => !fetchedIdsRef.current.has(id));
    if (missingIds.length === 0) {
      // Everything on screen is already loaded; a leftover error can only
      // belong to an id the user has since removed.
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await fetchProductsByIds(missingIds);
      missingIds.forEach((id) => fetchedIdsRef.current.add(id));
      setItems((current) => collapseToProducts([...current, ...rows]));
      setError(null);
    } catch {
      setError("خطا در دریافت محصولات موردعلاقه. لطفا دوباره تلاش کنید.");
      toast.error("خطا در دریافت محصولات موردعلاقه");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites(favoriteIds);
  }, [favoriteIds, loadFavorites]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (!favoriteIdSet.has(item.productId)) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.brand ?? "").toLowerCase().includes(query) ||
        (item.colorVariant.colorName ?? "").toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    switch (sortOption) {
      case "oldest":
        sorted.sort((a, b) => createdAtTime(a) - createdAtTime(b));
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        sorted.sort((a, b) => createdAtTime(b) - createdAtTime(a));
    }
    return sorted;
  }, [items, favoriteIdSet, searchQuery, sortOption]);

  const hasFavorites = favoriteIds.length > 0;
  const trimmedQuery = searchQuery.trim();
  const showSkeleton = isLoading && items.length === 0;
  const showError = !isLoading && error !== null && visibleItems.length === 0;

  const handleRetry = () => {
    setError(null);
    void loadFavorites(favoriteIds);
  };

  const renderContent = () => {
    if (showSkeleton) {
      return <ProductGridSkeleton count={6} columns={3} />;
    }

    if (showError) {
      return (
        <EmptyState
          icon={<Heart className="h-10 w-10 text-voxcina-blue dark:text-voxcina-cream" />}
          title="خطا در دریافت علاقه‌مندی‌ها"
          description={error ?? ""}
          action={
            <Button variant="outline" onClick={handleRetry}>
              تلاش دوباره
            </Button>
          }
        />
      );
    }

    if (visibleItems.length === 0) {
      if (!hasFavorites) {
        return (
          <EmptyState
            icon={<Heart className="h-10 w-10 text-voxcina-blue dark:text-voxcina-cream" />}
            title="هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید"
            description="با کلیک روی آیکون قلب در صفحه محصولات، آن‌ها را به لیست علاقه‌مندی‌های خود اضافه کنید."
            action={
              <Button variant="primary" onClick={() => router.push("/products")}>
                <ShoppingCart className="ml-2 h-4 w-4" />
                مشاهده فروشگاه
              </Button>
            }
          />
        );
      }

      if (trimmedQuery) {
        return (
          <EmptyState
            icon={<Search className="h-10 w-10 text-voxcina-blue dark:text-voxcina-cream" />}
            title="محصولی با این مشخصات یافت نشد"
            description="جستجوی دیگری را امتحان کنید یا عبارت جستجو را پاک کنید."
            action={
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                پاک کردن جستجو
              </Button>
            }
          />
        );
      }

      return (
        <EmptyState
          icon={<Heart className="h-10 w-10 text-voxcina-blue dark:text-voxcina-cream" />}
          title="محصولات موردعلاقه در دسترس نیستند"
          description="محصولات این لیست حذف یا غیرفعال شده‌اند. می‌توانید محصولات دیگری را به علاقه‌مندی‌ها اضافه کنید."
          action={
            <Button variant="primary" onClick={() => router.push("/products")}>
              <ShoppingCart className="ml-2 h-4 w-4" />
              مشاهده فروشگاه
            </Button>
          }
        />
      );
    }

    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <p className="mb-4 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
          {visibleItems.length} محصول یافت شد
        </p>
        <motion.div variants={slideUpItem}>
          <ProductGrid items={visibleItems} columns={3} />
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="محصولات موردعلاقه" />

        {hasFavorites && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-64">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="جستجو در علاقه‌مندی‌ها..."
                leftElement={<Search className="h-4 w-4" />}
                aria-label="جستجو در علاقه‌مندی‌ها"
              />
            </div>

            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              aria-label="ترتیب نمایش"
              className="h-12 cursor-pointer rounded-xl border-2 border-gray-200 bg-transparent px-4 text-sm text-gray-900 transition-all duration-200 hover:border-gray-300 focus:border-voxcina-blue focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-600"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {renderContent()}
    </div>
  );
}
