"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User, Menu, X, Heart } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import MobileNav from "./MobileNav";
import SmartSearch from "@/components/ui/SmartSearch";

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const cart = useCartStore((state) => state.cart);

  const itemCount = cart.items.reduce(
    (count, item) => count + item.quantity,
    0
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        isScrolled
          ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm"
          : "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="container flex h-16 md:h-20 items-center justify-between">
        <button
          className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="فهرست"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <Link
            href="/"
            className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          >
            {APP_NAME}
          </Link>
        </div>

        <nav className="mx-6 hidden lg:flex items-center space-x-4 lg:space-x-6">
          {NAV_ITEMS.map((item) => (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "text-base font-medium transition-colors hover:text-primary ml-6 py-2 px-1",
                  pathname === item.href
                    ? "text-primary relative after:absolute after:bottom-0 after:right-0 after:left-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-600 after:to-purple-600"
                    : "text-gray-700 dark:text-gray-300"
                )}
              >
                {item.label}
              </Link>

              {item.children && (
                <div className="absolute right-0 top-full w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pt-2 z-50">
                  <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block p-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center space-x-2 md:space-x-5 ml-auto lg:ml-0">
          <div className="relative">
            {isSearchOpen ? (
              <div className="absolute right-0 top-0 w-full sm:w-80 flex items-center bg-white dark:bg-gray-900 z-10">
                <SmartSearch
                  onClose={() => setIsSearchOpen(false)}
                  className="w-full"
                />
                <button
                  className="ml-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="بستن جستجو"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                aria-label="جستجو"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>

          <Link
            href="/favorites"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            aria-label="علاقه‌مندی‌ها"
          >
            <Heart className="h-5 w-5" />
          </Link>

          <Link
            href="/sign-in"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            aria-label="حساب کاربری"
          >
            <User className="h-5 w-5" />
          </Link>

          <Link
            href="/cart"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors relative"
            aria-label="سبد خرید"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {isMobileMenuOpen && (
        <MobileNav
          navItems={NAV_ITEMS}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
