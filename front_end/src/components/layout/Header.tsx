"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, User, Menu, X, ShoppingBag } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import MobileNav from "./MobileNav";
import SmartSearch from "@/components/ui/SmartSearch";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const cart = useCartStore((state) => state.cart);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

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
            <motion.button
              className="lg:hidden p-1.5 sm:p-2 rounded-full text-voxcina-blue/80 hover:text-voxcina-blue dark:text-voxcina-cream/80 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 mr-1.5 sm:mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="فهرست"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
            </motion.button>

            <Link href="/" className="flex items-center group">
              <div className="relative w-20 sm:w-24 md:w-28 lg:w-32 h-8 sm:h-10 md:h-12 transition-all duration-300">
                <Image
                  alt={APP_NAME}
                  priority
                  quality={100}
                  src={"/images/Logo/BlueXTransparent.png"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 5rem, (max-width: 768px) 6rem, (max-width: 1024px) 7rem, 8rem"
                />
              </div>
            </Link>
          </div>

          <nav className="mx-auto hidden lg:flex items-center space-x-1 xl:space-x-2">
            {NAV_ITEMS.map((item) => (
              <div key={item.href} className="relative group px-1">
                <Link
                  href={item.href}
                  className={cn(
                    "text-sm lg:text-base font-medium transition-all duration-300 hover:text-voxcina-blue dark:hover:text-voxcina-cream mx-1 lg:mx-2 xl:mx-3 py-2 px-2 lg:px-3 rounded-full relative",
                    pathname === item.href
                      ? "text-voxcina-blue dark:text-voxcina-cream font-semibold bg-voxcina-cream/20 dark:bg-voxcina-blue/20"
                      : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/15 dark:hover:bg-voxcina-blue/15"
                  )}
                >
                  {item.label}
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
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.div
                  className="absolute right-3 sm:right-4 md:right-6 top-full mt-2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] lg:w-80 flex items-center bg-white/95 dark:bg-voxcina-blue/95 z-10 rounded-xl shadow-md border border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SmartSearch
                    onClose={() => setIsSearchOpen(false)}
                    className="w-full"
                  />
                  <motion.button
                    className="ml-2 p-1.5 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
                    onClick={() => setIsSearchOpen(false)}
                    aria-label="بستن جستجو"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 sm:p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
              aria-label="جستجو"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
            </motion.button>
            <Link
              href="/cart"
              className="p-1.5 sm:p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
              aria-label="سبد خرید"
            >
              <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue text-xs rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex items-center justify-center shadow-sm animate-pulse-soft text-[10px] sm:text-xs">
                  {itemCount}
                </span>
              )}
            </Link>
            <motion.div className="relative">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="p-1.5 sm:p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
                  aria-label="حساب کاربری"
                >
                  <User className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/sign-in")}
                  className="px-3 py-1.5 rounded-full text-voxcina-blue/80 hover:text-voxcina-blue dark:text-voxcina-cream/80 dark:hover:text-voxcina-cream bg-voxcina-cream/20 dark:bg-voxcina-blue/20 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 font-medium transition-all duration-300"
                  aria-label="ورود یا ثبت نام"
                >
                  ورود|ثبت نام
                </button>
              )}
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <MobileNav
              navItems={NAV_ITEMS}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>
      </header>
    </div>
  );
};

export default Header;
