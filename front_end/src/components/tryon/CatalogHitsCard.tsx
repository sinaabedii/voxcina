"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import BackendImage from "@/components/BackendImage";
import { formatPrice } from "@/lib/utils";
import { CatalogVariantHit } from "@/types/tryon";

interface CatalogHitsCardProps {
  hits: CatalogVariantHit[];
}

/** What the agent found in the catalog: one card per color variant. */
export default function CatalogHitsCard({ hits }: CatalogHitsCardProps) {
  return (
    <div className="bg-background border border-secondary-300 dark:border-voxcina-blue/30 rounded-2xl p-3.5 mt-3 shadow-soft max-w-md mr-9">
      <div className="flex items-center gap-1.5 mb-2.5">
        <ShoppingBag className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream" />
        <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
          نتایج جستجوی ووکسا در کاتالوگ
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {hits.map((hit) => (
          <Link
            key={`${hit.product_id}:${hit.variant_id}`}
            href={`/products/${hit.product_id}?variant=${encodeURIComponent(hit.variant_id || hit.color || hit.color_name || "")}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-2.5 rounded-xl border border-secondary-300/80 dark:border-voxcina-blue/20 p-2 hover:border-voxcina-blue/40 dark:hover:border-voxcina-cream/40 hover:bg-secondary-100/50 dark:hover:bg-voxcina-blue/20 transition-all group"
          >
            <div className="w-12 h-14 rounded-lg overflow-hidden bg-secondary-100 dark:bg-voxcina-blue/20 flex-shrink-0 border border-secondary-200 dark:border-voxcina-blue/20">
              {hit.image ? (
                <BackendImage
                  src={hit.image}
                  alt={hit.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <ShoppingBag className="w-full h-full p-2 text-voxcina-blue/30" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-voxcina-blue dark:text-voxcina-cream group-hover:underline">
                {hit.product_name}
              </p>
              <p className="text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-0.5">
                {hit.color_name || hit.color || ""}
              </p>
              <p className="text-[11px] font-bold text-voxcina-blue/90 dark:text-voxcina-cream/90 mt-0.5">
                {formatPrice(hit.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
