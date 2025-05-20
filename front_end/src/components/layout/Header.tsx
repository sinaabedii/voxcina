"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useCartStore } from "@/store/cart-store";
import MobileNav from "./MobileNav";
import SmartSearch from "@/components/ui/SmartSearch";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const cart = useCartStore((state) => state.cart);

  // const itemCount = cart.items.reduce(
  //   (count, item) => count + item.quantity,
  //   0
  // );

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
        "sticky top-0 z-40 w-full transition-all duration-500 ease-in-out",
        isScrolled
          ? "bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-md"
          : "bg-white dark:bg-voxcina-blue/95 border-b border-voxcina-cream/20 dark:border-voxcina-blue/20 shadow-sm"
      )}
    >
      <div className="container mx-auto flex h-16 sm:h-18 md:h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <motion.button
            className="lg:hidden p-2 rounded-full text-voxcina-blue/80 hover:text-voxcina-blue dark:text-voxcina-cream/80 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 mr-2 sm:mr-3"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="فهرست"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.button>

          <Link
            href="/"
            className="flex items-center group"
          >
            <div className="relative w-24 sm:w-28 md:w-32 h-10 sm:h-12 md:h-12 transition-all duration-300">
              <Image
                alt={APP_NAME}
                priority
                quality={100}
                src={"/images/Logo/BlueXTransparent.png"}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 6rem, (max-width: 768px) 7rem, 8rem"
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
                  "text-base font-medium transition-all duration-300 hover:text-voxcina-blue dark:hover:text-voxcina-cream mx-2 md:mx-3 py-2 px-1 relative",
                  pathname === item.href
                    ? "text-voxcina-blue dark:text-voxcina-cream font-semibold after:absolute after:bottom-0 after:right-0 after:left-0 after:h-0.5 after:bg-voxcina-blue dark:after:bg-voxcina-cream after:rounded-full"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70 after:absolute after:bottom-0 after:right-0 after:left-0 after:h-0.5 after:bg-voxcina-blue dark:after:bg-voxcina-cream after:scale-x-0 after:origin-right hover:after:scale-x-100 after:transition-transform after:duration-300 after:rounded-full"
                )}
              >
                {item.label}
              </Link>

              {item.children && (
                <div className="absolute right-0 top-full w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pt-2 z-50 transform translate-y-2 group-hover:translate-y-0">
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

        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          <AnimatePresence>
            {isSearchOpen ? (
              <motion.div 
                className="absolute right-4 md:right-6 top-full mt-2 w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] lg:w-80 flex items-center bg-white/95 dark:bg-voxcina-blue/95 z-10 rounded-xl shadow-md border border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm"
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
                  <X className="h-5 w-5" />
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          <motion.button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
            aria-label="جستجو"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Search className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-voxcina-blue dark:bg-voxcina-cream group-hover:w-1/2 transition-all duration-300"></span>
          </motion.button>

          {/* <motion.div className="relative">
            <Link
              href="/favorites"
              className="p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
              aria-label="علاقه‌مندی‌ها"
            >
              <Heart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-voxcina-blue dark:bg-voxcina-cream group-hover:w-1/2 transition-all duration-300"></span>
            </Link>
          </motion.div> */}
          
          <motion.div className="relative">
            <Link
              href="/sign-in"
              className="p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
              aria-label="حساب کاربری"
            >
              <User className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-voxcina-blue dark:bg-voxcina-cream group-hover:w-1/2 transition-all duration-300"></span>
            </Link>
          </motion.div>

          {/* <Link
            href="/cart"
            className="p-2 rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 relative group"
            aria-label="سبد خرید"
          >
            <ShoppingBag className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center shadow-sm animate-pulse-soft">
                {itemCount}
              </span>
            )}
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-voxcina-blue dark:bg-voxcina-cream group-hover:w-1/2 transition-all duration-300"></span>
          </Link> */}
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
  );
};

export default Header;