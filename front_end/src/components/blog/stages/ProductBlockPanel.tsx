"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import Button from "@/components/ui/Button";
import { BlogBlock } from "@/types/blog";
import { useBlogAdminStore, MatchedProductCandidate } from "@/store/blog-admin-store";

interface ProductBlockPanelProps {
  postId: string;
  block: BlogBlock;
}

/**
 * Admin-facing resolution UI for a single "product" block: the writer only
 * left a short description here, so an admin must either search the catalog
 * manually or trigger AI auto-match before the post can publish (see
 * ValidatePublicationReadiness on the backend).
 */
export default function ProductBlockPanel({ postId, block }: ProductBlockPanelProps) {
  const { searchProductBlockCandidates, autoMatchProductBlock, selectProductBlock } = useBlogAdminStore();

  const [showSearch, setShowSearch] = useState(!block.productId);
  const [query, setQuery] = useState(block.productDescription || "");
  const [results, setResults] = useState<MatchedProductCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState(false);

  const isResolved = !!block.productId;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const candidates = await searchProductBlockCandidates(postId, query.trim());
      setResults(candidates);
      if (candidates.length === 0) {
        toast.error("محصولی با این توضیحات پیدا نشد");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAutoMatch = async () => {
    setMatching(true);
    try {
      const ok = await autoMatchProductBlock(postId, block.order);
      if (ok) {
        toast.success("محصول پیشنهادی انتخاب شد");
        setShowSearch(false);
      } else {
        toast.error("محصول مناسبی پیدا نشد — جستجوی دستی را امتحان کنید");
      }
    } finally {
      setMatching(false);
    }
  };

  const handleSelect = async (candidate: MatchedProductCandidate) => {
    const ok = await selectProductBlock(postId, block.order, candidate.productId, candidate.colorHex);
    if (ok) {
      toast.success("محصول انتخاب شد");
      setShowSearch(false);
      setResults([]);
    } else {
      toast.error("خطا در انتخاب محصول");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        توضیح نویسنده: <span className="italic">«{block.productDescription}»</span>
      </p>

      {isResolved && !showSearch && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-3">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-white">
            {block.productImage && (
              <Image src={block.productImage} alt={block.productName || ""} fill className="object-contain" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">{block.productName}</p>
            <p className="text-xs text-gray-500">{block.productColorName}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
            تغییر انتخاب
          </Button>
        </div>
      )}

      {(!isResolved || showSearch) && (
        <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
          <Button variant="outline" size="sm" onClick={handleAutoMatch} disabled={matching}>
            {matching ? "در حال جستجو..." : "پیشنهاد خودکار با هوش مصنوعی"}
          </Button>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی محصول..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" disabled={searching}>
              {searching ? "..." : "جستجو"}
            </Button>
          </form>

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {results.map((c) => (
                <button
                  key={`${c.productId}-${c.colorHex}`}
                  onClick={() => handleSelect(c)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-gray-200 p-2 text-right hover:border-primary hover:bg-primary-50/40"
                >
                  <div className="relative h-16 w-full overflow-hidden rounded bg-gray-50">
                    {c.image && <Image src={c.image} alt={c.name} fill className="object-contain" />}
                  </div>
                  <p className="line-clamp-1 text-xs font-bold text-gray-900">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.colorName}</p>
                </button>
              ))}
            </div>
          )}

          {isResolved && (
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="text-xs text-gray-500 underline"
            >
              انصراف
            </button>
          )}
        </div>
      )}
    </div>
  );
}
