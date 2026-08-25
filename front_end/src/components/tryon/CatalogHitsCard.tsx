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
    <div className="bg-background border border-voxcina-blue/20 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <ShoppingBag className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream" />
        <p className="text-[11px] font-bold text-voxcina-blue dark:text-voxcina-cream">نتیجه جستجوی ووکسا</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hits.map((hit) => (
          <Link
            key={`${hit.product_id}:${hit.variant_id}`}
            href={`/products/${hit.product_id}?variant=${encodeURIComponent(hit.variant_id || hit.color || hit.color_name || "")}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-2 rounded-lg border border-secondary-300 dark:border-voxcina-blue/20 p-1.5 hover:border-voxcina-blue/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-md overflow-hidden bg-background flex-shrink-0">
              {hit.image ? (
                <BackendImage src={hit.image} alt={hit.product_name} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="w-full h-full p-2 text-voxcina-blue/30" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium truncate text-voxcina-blue dark:text-voxcina-cream">{hit.product_name}</p>
              <p className="text-[9px] text-voxcina-blue/60 dark:text-voxcina-cream/60">{hit.color_name || hit.color || ""}</p>
              <p className="text-[10px] font-semibold text-voxcina-blue dark:text-voxcina-cream">{formatPrice(hit.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
