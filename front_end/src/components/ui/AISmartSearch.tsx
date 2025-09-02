"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  ArrowUpRight,
  Loader2,
  Sparkles,
  TrendingUp,
  Bot,
  User,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/types/product";
import { motion, AnimatePresence } from "framer-motion";

interface AISmartSearchProps {
  isOpen?: boolean;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

interface AISearchResponse {
  ai_response: string;
  products: Product[];
  success: boolean;
  is_ai_generated: boolean;
  search_query: string;
}

const AISmartSearch: React.FC<AISmartSearchProps> = ({
  isOpen = false,
  onClose,
  placeholder = "جستجوی هوشمند در محصولات...",
  className = "",
  value,
  onChange,
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [aiResponse, setAIResponse] = useState<string>("");
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchTerm = value !== undefined ? value : internalSearchTerm;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      setAIResponse("");
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performAISearch(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const performAISearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await fetch("/api/search/smart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      if (response.ok) {
        const data: AISearchResponse = await response.json();
        setResults(data.products || []);
        setAIResponse(data.ai_response || "");
        setIsAIGenerated(data.is_ai_generated);
        
        // Add to search history
        if (query.trim() && !searchHistory.includes(query.trim())) {
          setSearchHistory(prev => [query.trim(), ...prev].slice(0, 5));
        }
      } else {
        console.error("AI search failed:", response.statusText);
        setResults([]);
        setAIResponse("");
        setIsAIGenerated(false);
      }
    } catch (error) {
      console.error("AI search error:", error);
      setResults([]);
      setAIResponse("");
      setIsAIGenerated(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      if (onClose) onClose();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalSearchTerm(newValue);
    }
  };

  const setSearchValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalSearchTerm(newValue);
    }
  };

  const handleClearSearch = () => {
    if (onChange) {
      onChange("");
    } else {
      setInternalSearchTerm("");
    }
    setResults([]);
    setShowResults(false);
    setAIResponse("");
    setIsAIGenerated(false);
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
              className="bg-primary-100 text-primary-700 rounded-md px-1 font-semibold"
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
      >
        {/* Search Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-primary-600">
              <Sparkles className="w-5 h-5" />
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              جستجوی هوشمند
            </h3>
            <button
              onClick={onClose}
              className="mr-auto p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={placeholder}
                className="w-full pr-12 pl-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-right"
                dir="rtl"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
              {isSearching && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {showResults && (
            <div className="p-6">
              {/* AI Response */}
              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed text-right" dir="rtl">
                        {aiResponse}
                      </p>
                      {isAIGenerated && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary-600">
                          <Sparkles className="w-3 h-3" />
                          <span>پاسخ هوشمند AI</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Products Results */}
              {results.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    محصولات پیشنهادی
                  </h4>
                  {results.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={`/products/${product.id}`}
                        onClick={() => onClose?.()}
                        className="block p-4 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          {product.images?.[0] && (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-right">
                            <h5 className="text-sm font-medium text-gray-900 truncate">
                              {highlightText(product.name)}
                            </h5>
                            <p className="text-xs text-gray-500 mt-1">
                              {highlightText(product.brand || "")}
                            </p>
                            <p className="text-sm font-semibold text-primary-600 mt-1">
                              {formatPrice(product.price)} تومان
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : searchTerm.trim().length >= 2 && !isSearching ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    محصولی برای "{searchTerm}" پیدا نشد
                  </p>
                  <button
                    onClick={handleSubmit}
                    className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    مشاهده همه نتایج جستجو
                  </button>
                </div>
              ) : null}

              {/* Search History */}
              {searchHistory.length > 0 && searchTerm.trim().length === 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    جستجوهای اخیر
                  </h4>
                  <div className="space-y-2">
                    {searchHistory.map((historyItem, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchValue(historyItem)}
                        className="block w-full text-right p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {historyItem}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {showResults && searchTerm && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Search className="w-4 h-4" />
              مشاهده همه نتایج برای "{searchTerm}"
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AISmartSearch;
