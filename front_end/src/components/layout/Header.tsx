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
        "sticky top-0 z-40 w-full transition-all duration-300 voxcina-nav",
        isScrolled
          ? "bg-card/80 backdrop-blur-md border-b border-border/10 shadow-medium"
          : "bg-card border-b border-border/5 shadow-soft"
      )}
    >
      <div className="voxcina-container flex h-16 md:h-20 items-center justify-between">
        <button
          className="lg:hidden p-2 rounded-full hover:bg-secondary transition-all duration-200"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="فهرست"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </button>

        <div className="flex items-center">
          <Link
            href="/"
            className="text-xl md:text-2xl font-bold text-primary hover:opacity-90 transition-opacity relative group"
          >
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{APP_NAME}</span>
            <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
          </Link>
        </div>

        <nav className="mx-6 hidden lg:flex items-center space-x-4 lg:space-x-6">
          {NAV_ITEMS.map((item) => (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "text-base font-medium transition-all duration-200 hover:text-primary ml-6 py-2 px-1 relative",
                  pathname === item.href
                    ? "text-primary font-bold after:absolute after:bottom-0 after:right-0 after:left-0 after:h-0.5 after:bg-primary after:rounded-full"
                    : "text-foreground hover:text-primary after:absolute after:bottom-0 after:right-0 after:left-0 after:h-0.5 after:bg-primary after:scale-x-0 after:origin-right hover:after:scale-x-100 after:transition-transform after:duration-300 after:rounded-full"
                )}
              >
                {item.label}
              </Link>

              {item.children && (
                <div className="absolute right-0 top-full w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pt-2 z-50 transform translate-y-2 group-hover:translate-y-0">
                  <div className="voxcina-card p-3 animate-fade-in">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block p-2.5 text-sm text-foreground hover:bg-secondary hover:text-primary rounded-lg transition-all duration-200"
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
              <div className="absolute right-0 top-0 w-full sm:w-80 flex items-center bg-card z-10 rounded-lg shadow-medium border border-border/10 animate-fade-in">
                <SmartSearch
                  onClose={() => setIsSearchOpen(false)}
                  className="w-full"
                />
                <button
                  className="ml-2 p-1.5 rounded-full hover:bg-secondary transition-all duration-200"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="بستن جستجو"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full hover:bg-secondary text-foreground hover:text-primary transition-all duration-200"
                aria-label="جستجو"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>

          <Link
            href="/favorites"
            className="p-2 rounded-full hover:bg-secondary text-foreground hover:text-primary transition-all duration-200 relative group"
            aria-label="علاقه‌مندی‌ها"
          >
            <Heart className="h-5 w-5" />
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-1/2 transition-all duration-300"></span>
          </Link>

          <Link
            href="/sign-in"
            className="p-2 rounded-full hover:bg-secondary text-foreground hover:text-primary transition-all duration-200 relative group"
            aria-label="حساب کاربری"
          >
            <User className="h-5 w-5" />
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-1/2 transition-all duration-300"></span>
          </Link>

          <Link
            href="/cart"
            className="p-2 rounded-full hover:bg-secondary text-foreground hover:text-primary transition-all duration-200 relative group"
            aria-label="سبد خرید"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-soft animate-pulse-soft">
                {itemCount}
              </span>
            )}
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-1/2 transition-all duration-300"></span>
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