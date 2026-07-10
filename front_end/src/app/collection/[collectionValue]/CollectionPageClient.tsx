"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ArrowRight } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { ColorVariantListItem } from "@/types/product";
import CollectionIntro from "@/components/collection/CollectionIntro";
import CollectionScrollShowcase from "@/components/collection/CollectionScrollShowcase";
import TexturedBackground from "@/components/ui/TexturedBackground";

interface CollectionPageClientProps {
  title: string;
  tagline: string;
  items: ColorVariantListItem[];
}

export default function CollectionPageClient({
  title,
  tagline,
  items,
}: CollectionPageClientProps) {
  const router = useRouter();
  const [introDone, setIntroDone] = useState(false);

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
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-2 rounded-full bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-voxcina-blue dark:text-voxcina-cream shadow-medium hover:bg-white dark:hover:bg-voxcina-blue transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت</span>
      </button>

      <main className="relative isolate min-h-screen">
        {items.length === 0 ? (
          <div className="py-24 text-center">
            <TexturedBackground withLogo={false} />
            <div className="container">
              <Package className="w-16 h-16 text-voxcina-blue/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4 text-voxcina-blue">محصولی در این کالکشن یافت نشد</h2>
              <p className="text-voxcina-blue/70 mb-8">
                در حال حاضر محصولی در این کالکشن موجود نیست.
              </p>
              <Link href="/products">
                <Button variant="primary" size="lg">
                  مشاهده همه محصولات
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <CollectionScrollShowcase items={items} />
        )}
      </main>

      <Footer />
    </>
  );
}
