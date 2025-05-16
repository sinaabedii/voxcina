"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductStore } from "@/store/product-store";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/types/product";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface SmartSearchProps {
  className?: string;
  onClose?: () => void;
  placeholder?: string;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  className,
  onClose,
  placeholder = "جستجوی محصولات...",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { products } = useProductStore();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useOnClickOutside(searchRef, () => {
    setShowResults(false);
  });

  const encodedSearchTerm = useMemo(() => {
    return encodeURIComponent(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);

      const trimmedSearchTerm = searchTerm.trim().toLowerCase();
      const filteredProducts = products
        .filter((product) => {
          const inStock = product.inStock;

          if (!inStock) return false;

          const name = product.name.toLowerCase();
          const description = product.description.toLowerCase();
          const brand = product.brand.toLowerCase();
          const category = product.category.toLowerCase();

          return (
            name.includes(trimmedSearchTerm) ||
            description.includes(trimmedSearchTerm) ||
            brand.includes(trimmedSearchTerm) ||
            category.includes(trimmedSearchTerm)
          );
        })
        .sort((a, b) => {
          const aStartsWith = a.name
            .toLowerCase()
            .startsWith(trimmedSearchTerm);
          const bStartsWith = b.name
            .toLowerCase()
            .startsWith(trimmedSearchTerm);

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;

          return 0;
        })
        .slice(0, 5);

      setResults(filteredProducts);
      setShowResults(true);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/products?search=${encodedSearchTerm}`);
      setShowResults(false);
      if (onClose) onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowResults(false);
      if (onClose) onClose();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.trim()})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-yellow-100 dark:bg-yellow-900/40 text-gray-900 dark:text-yellow-100 rounded-sm px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      ref={searchRef}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "pl-10 pr-10 py-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              "text-sm shadow-sm hover:shadow-md focus:shadow-md transition-shadow duration-300",
              "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-12"
            )}
            autoComplete="off"
            onFocus={() => {
              if (searchTerm.trim().length >= 2) {
                setShowResults(true);
              }
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showResults && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          {isSearching ? (
            <div className="p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                در حال جستجو...
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                محصولی یافت نشد
              </p>
            </div>
          ) : (
            <>
              <ul>
                {results.map((product) => (
                  <li
                    key={product.id}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="block p-4 transition-colors"
                      onClick={() => {
                        setShowResults(false);
                        if (onClose) onClose();
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {highlightText(product.name)}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {product.brand} - {product.category}
                          </p>
                        </div>
                        <div className="text-left flex flex-col items-end">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice &&
                            product.originalPrice > product.price && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/products?search=${encodedSearchTerm}`}
                className="block p-3 bg-gray-50 dark:bg-gray-700/50 text-center text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-primary"
                onClick={() => {
                  setShowResults(false);
                  if (onClose) onClose();
                }}
              >
                نمایش تمام نتایج
                <ArrowUpRight className="inline-block h-3.5 w-3.5 mr-1.5" />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
