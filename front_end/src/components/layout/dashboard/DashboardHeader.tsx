"use client";

import Link from "next/link";
import Image from "next/image";
import { Home, Bell, ShoppingCart, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

interface DashboardHeaderProps {
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export default function DashboardHeader({ isMobileSidebarOpen, onToggleMobileSidebar }: DashboardHeaderProps) {
  const { user, logout } = useAuthStore();
  const { cart } = useCartStore();
  const itemCount = cart.items.reduce((c, i) => c + i.quantity, 0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#profile-menu") && !target.closest("#profile-button")) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white/80 dark:bg-voxcina-blue/90 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 py-3 px-4 md:px-6 sticky top-0 z-40 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
            onClick={onToggleMobileSidebar}
            aria-label={isMobileSidebarOpen ? "بستن منو" : "باز کردن منو"}
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="flex items-center">
            <Image src="/images/Logo/BlueXTransparent.png" alt="Voxcina" width={140} height={48} className="h-10 w-auto" priority />
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <Link href="/" className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors" aria-label="صفحه اصلی">
            <Home size={18} />
          </Link>

          <motion.button className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 relative transition-colors" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Bell size={18} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
          </motion.button>

          <Link href="/cart" className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 relative transition-colors" aria-label="سبد خرید">
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-voxcina-blue dark:bg-voxcina-cream rounded-full text-white dark:text-voxcina-blue text-[10px] flex items-center justify-center">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          <div className="relative">
            <motion.button
              id="profile-button"
              className="flex items-center gap-2 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 py-1 px-2 rounded-lg transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative w-9 h-9 rounded-xl bg-voxcina-cream dark:bg-voxcina-blue/50 flex items-center justify-center overflow-hidden border-2 border-white/80 dark:border-voxcina-blue/80 shadow-sm">
                {user?.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">{user?.name?.charAt(0) || "V"}</span>}
              </div>
              <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream hidden sm:inline-block">{user?.name || "کاربر"}</span>
            </motion.button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  id="profile-menu"
                  className="absolute left-0 mt-2 w-52 bg-white/90 dark:bg-voxcina-blue/90 rounded-xl shadow-md py-1 z-50 border border-voxcina-cream dark:border-voxcina-blue/50 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, type: "spring" as const, stiffness: 300, damping: 25 }}
                >
                  <div className="px-4 py-3 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
                    <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">{user?.name}</p>
                    <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">{user?.email}</p>
                  </div>
                  <Link href="/" className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors">صفحه اصلی</Link>
                  <Link href="/dashboard" className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors">داشبورد</Link>
                  <Link href="/dashboard/settings" className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors">تنظیمات حساب</Link>
                  <button className="w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors" onClick={() => logout?.()}>
                    خروج از حساب
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
