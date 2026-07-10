"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ArrowRight } from "lucide-react";
import { Flip } from "@/lib/gsap";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { ColorVariantListItem, PaginationInfo } from "@/types/product";
import CollectionIntro from "@/components/collection/CollectionIntro";
import StuckProductGrid, { StuckProductGridMobile } from "@/components/collection/StuckProductGrid";
import CollectionFilterBar from "@/components/collection/CollectionFilterBar";
import CollectionProductGrid from "@/components/collection/CollectionProductGrid";

interface CollectionPageClientProps {
  collectionValue: string;
  title: string;
  tagline: string;
  items: ColorVariantListItem[];
  pagination: PaginationInfo | null;
  currentPage: number;
  initialFilters: {
    sort?: string;
    inStockOnly?: boolean;
  };
}

export default function CollectionPageClient({
  collectionValue,
  title,
  tagline,
  items,
  pagination,
  currentPage,
  initialFilters,
}: CollectionPageClientProps) {
  const router = useRouter();
  const [introDone, setIntroDone] = useState(false);
  const pendingFlipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null);

  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.totalItems || items.length;

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (initialFilters.sort) params.set("sort", initialFilters.sort);
    if (initialFilters.inStockOnly) params.set("inStockOnly", "true");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const base = `/collection/${collectionValue}`;
    return qs ? `${base}?${qs}` : base;
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
  };

  return (
    <>
      {!introDone && (
        <CollectionIntro
          title={title}
          tagline={tagline}
          onExitComplete={() => setIntroDone(true)}
        />
      )}

      <button
        type="button"
        onClick={handleBack}
        aria-label="بازگشت"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-voxcina-blue dark:text-voxcina-cream shadow-medium hover:bg-white dark:hover:bg-voxcina-blue transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت</span>
      </button>

      <main className="min-h-screen bg-background">
        <StuckProductGrid title={title} items={items} />
        <StuckProductGridMobile title={title} items={items} />

        <section className="container py-8 md:py-12">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">محصولی در این کالکشن یافت نشد</h2>
              <p className="text-muted-foreground mb-8">
                در حال حاضر محصولی در این کالکشن موجود نیست.
              </p>
              <Link href="/products">
                <Button variant="primary" size="lg">
                  مشاهده همه محصولات
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <CollectionFilterBar
                collectionValue={collectionValue}
                currentPage={currentPage}
                totalItems={totalItems}
                initialSort={initialFilters.sort}
                initialInStockOnly={initialFilters.inStockOnly}
                pendingFlipStateRef={pendingFlipStateRef}
              />

              <CollectionProductGrid items={items} pendingFlipStateRef={pendingFlipStateRef} />

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  {currentPage > 1 && (
                    <Link
                      href={buildPageUrl(currentPage - 1)}
                      className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/70 transition-colors text-sm"
                    >
                      قبلی
                    </Link>
                  )}

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Link
                          key={pageNum}
                          href={buildPageUrl(pageNum)}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm transition-colors ${
                            currentPage === pageNum
                              ? "bg-voxcina-blue text-white"
                              : "bg-secondary hover:bg-secondary/70"
                          }`}
                        >
                          {pageNum}
                        </Link>
                      );
                    })}
                  </div>

                  {currentPage < totalPages && (
                    <Link
                      href={buildPageUrl(currentPage + 1)}
                      className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/70 transition-colors text-sm"
                    >
                      بعدی
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
