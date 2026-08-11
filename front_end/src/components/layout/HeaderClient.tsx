"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Search, User, Menu, ShoppingBag, Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import MobileNav from "./MobileNav";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";

const SmartSearch = dynamic(() => import("@/components/ui/SmartSearch"), {
  ssr: false,
  loading: () => null,
});

// Type definition for navigation items
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

interface HeaderClientProps {
  navItems: NavItem[];
}

const HeaderClient: React.FC<HeaderClientProps> = ({ navItems }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { cart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
          requestAnimationFrame(() => {
            const nextIsScrolled = window.scrollY > 10;
            setIsScrolled((current) =>
              current === nextIsScrolled ? current : nextIsScrolled
            );
            ticking = false;
          });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-40 w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
        <header
          className={cn(
            "w-full max-w-7xl mx-auto rounded-xl sm:rounded-2xl md:rounded-3xl transition-all duration-500 ease-in-out",
            isScrolled
              ? "bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-lg"
              : "bg-white dark:bg-voxcina-blue/95 border border-voxcina-cream/20 dark:border-voxcina-blue/20 shadow-md"
          )}
        >
          <div className="container mx-auto flex h-14 sm:h-16 md:h-18 lg:h-20 items-center justify-between px-3 sm:px-4 md:px-6">
            <div className="flex items-center">
              <button
                className="mr-1.5 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-voxcina-blue/80 transition-all duration-300 hover:bg-voxcina-cream/30 hover:text-voxcina-blue dark:text-voxcina-cream/80 dark:hover:bg-voxcina-blue/30 dark:hover:text-voxcina-cream sm:mr-2"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="فهرست"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </button>

              <Link href="/" className="flex items-center group">
                <div className="relative flex h-8 w-20 items-center transition-all duration-300 sm:h-10 sm:w-24 md:h-12 md:w-28 lg:w-32">
                  <Image
                    alt={APP_NAME}
                    priority
                    quality={85}
                    src={"/images/Logo/BlueXTransparent.png"}
                    width={1335}
                    height={940}
                    className="h-auto max-h-full w-auto max-w-full object-contain"
                    sizes="(max-width: 640px) 5rem, (max-width: 768px) 6rem, (max-width: 1024px) 7rem, 8rem"
                  />
                </div>
              </Link>
            </div>

            <nav className="mx-auto hidden lg:flex items-center gap-x-3 lg:gap-x-4 xl:gap-x-5">
              {navItems.map((item) => (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={cn(
                      "text-sm lg:text-base font-medium transition-all duration-300 hover:text-voxcina-blue dark:hover:text-voxcina-cream py-2 px-3 rounded-full relative",
                      pathname === item.href
                        ? "text-voxcina-blue dark:text-voxcina-cream font-semibold bg-voxcina-cream/20 dark:bg-voxcina-blue/20"
                        : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/15 dark:hover:bg-voxcina-blue/15"
                    )}
                  >
                    <span className="flex items-center gap-0.5">
                      {item.label}
                      {item.children && (
                        <ChevronDown className="w-3 h-3 text-current" />
                      )}
                    </span>
                  </Link>

                  {item.children && (
                    <div className="absolute right-0 top-full w-56 lg:w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pt-2 z-50 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-white/95 dark:bg-voxcina-blue/95 p-3 rounded-xl shadow-md border border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm animate-fade-in">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block p-2.5 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg transition-all duration-200"
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

            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-voxcina-blue/70 transition-all duration-300 hover:bg-voxcina-cream/30 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:bg-voxcina-blue/30 dark:hover:text-voxcina-cream group"
                aria-label="جستجو"
              >
                <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
              </button>
              
              <Link
                href="/cart"
                 className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-voxcina-blue/70 transition-all duration-300 hover:bg-voxcina-cream/30 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:bg-voxcina-blue/30 dark:hover:text-voxcina-cream group"
                aria-label="سبد خرید"
              >
                <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
                <span className="sr-only">سبد خرید</span>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue text-xs rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex items-center justify-center shadow-sm animate-pulse-soft text-[10px] sm:text-xs">
                    {itemCount}
                  </span>
                )}
              </Link>
              
              <div className="relative flex items-center gap-1">
                {isAuthenticated && user?.role === "admin" && (
                  <Link
                    href="/admin"
                     className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-yellow-600 transition-all duration-300 hover:bg-yellow-100 hover:text-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-900 dark:hover:text-yellow-300 group"
                    aria-label="پنل ادمین"
                    title="پنل ادمین"
                  >
                    <Shield className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
                    <span className="sr-only">پنل ادمین</span>
                  </Link>
                )}
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                     className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-voxcina-blue/70 transition-all duration-300 hover:bg-voxcina-cream/30 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:bg-voxcina-blue/30 dark:hover:text-voxcina-cream group"
                    aria-label="حساب کاربری"
                  >
                    <User className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/sign-in")}
                     className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-green-600 transition-all duration-300 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900 dark:hover:text-green-300 group"
                    aria-label="ورود یا ثبت‌نام"
                  >
                    <User className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <MobileNav
          navItems={navItems}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <SmartSearch
          isOpen
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
};

export default HeaderClient;
