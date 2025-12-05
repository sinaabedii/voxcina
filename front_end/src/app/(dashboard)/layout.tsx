"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { APP_NAME } from "@/lib/constants";
import Sidebar from "@/components/layout/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  Moon,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push("/sign-in");
      }
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#profile-menu") &&
        !target.closest("#profile-button")
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileSidebarOpen(false);
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-voxcina-blue/95 transition-all duration-300">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-cream/10 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
            در حال بررسی وضعیت ورود...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-voxcina-blue/95 transition-all duration-300">
      <header className="bg-white/80 dark:bg-voxcina-blue/90 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 py-3 px-4 md:px-6 sticky top-0 z-30 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              aria-label={isMobileSidebarOpen ? "بستن منو" : "باز کردن منو"}
            >
              {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link href="/" className="flex items-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue flex items-center justify-center text-white font-bold text-sm ml-2 shadow-sm">
                {APP_NAME.charAt(0)}
              </div>
              <span className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream hidden sm:inline-block">
                {APP_NAME}
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-xl w-80 px-3 py-2 border border-voxcina-cream/50 dark:border-voxcina-blue/50 shadow-inner-soft backdrop-blur-sm">
            <Search
              size={18}
              className="text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-2"
            />
            <input
              type="text"
              placeholder="جستجو در فروشگاه..."
              className="bg-transparent border-none focus:outline-none text-sm w-full text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <motion.button
              className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 relative transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={18} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </motion.button>

            <Link
              href="/cart"
              className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 relative transition-colors"
            >
              <ShoppingCart size={18} />
              <span className="absolute top-0 right-0 w-4 h-4 bg-voxcina-blue dark:bg-voxcina-cream rounded-full text-white dark:text-voxcina-blue text-[10px] flex items-center justify-center">
                3
              </span>
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
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                      {user?.name?.charAt(0) || "V"}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream hidden sm:inline-block">
                  {user?.name || "کاربر"}
                </span>
              </motion.button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    id="profile-menu"
                    className="absolute left-0 mt-2 w-52 bg-white/90 dark:bg-voxcina-blue/90 rounded-xl shadow-md py-1 z-50 border border-voxcina-cream dark:border-voxcina-blue/50 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{
                      duration: 0.2,
                      type: "spring" as const,
                      stiffness: 300,
                      damping: 25,
                    }}
                  >
                    <div className="px-4 py-3 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
                      <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                        {user?.name}
                      </p>
                      <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    >
                      صفحه اصلی
                    </Link>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    >
                      داشبورد
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    >
                      تنظیمات حساب
                    </Link>
                    <button
                      className="w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                      onClick={() => logout && logout()}
                    >
                      خروج از حساب
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-voxcina-blue/30 backdrop-blur-sm z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
              />

              <motion.div
                className="fixed inset-y-0 right-0 w-72 bg-white/90 dark:bg-voxcina-blue/90 z-50 md:hidden border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm shadow-lg"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
              >
                <div className="p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex items-center justify-between">
                  <h2 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                    {APP_NAME}
                  </h2>
                  <motion.button
                    className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="hidden md:block w-72 h-full sticky top-16 border-l border-voxcina-cream/30 dark:border-voxcina-blue/30 py-6 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
          <Sidebar />
        </div>

        <motion.main
          className="flex-grow p-4 md:p-6 lg:p-8 overflow-x-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto">{children}</div>
        </motion.main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-voxcina-blue/90 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 py-3 px-4 flex justify-around items-center z-30 backdrop-blur-sm shadow-md">
        <Link href="/dashboard" className="flex flex-col items-center group">
          <div className="p-2 text-voxcina-blue/70 group-hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:group-hover:text-voxcina-cream rounded-full group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30 transition-colors">
            <User size={18} />
          </div>
          <span className="text-xs mt-1 text-voxcina-blue/70 dark:text-voxcina-cream/70 group-hover:text-voxcina-blue dark:group-hover:text-voxcina-cream transition-colors">
            داشبورد
          </span>
        </Link>
        <Link href="/products" className="flex flex-col items-center group">
          <div className="p-2 text-voxcina-blue/70 group-hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:group-hover:text-voxcina-cream rounded-full group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30 transition-colors">
            <Search size={18} />
          </div>
          <span className="text-xs mt-1 text-voxcina-blue/70 dark:text-voxcina-cream/70 group-hover:text-voxcina-blue dark:group-hover:text-voxcina-cream transition-colors">
            جستجو
          </span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center group">
          <div className="p-2 text-voxcina-blue/70 group-hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:group-hover:text-voxcina-cream rounded-full group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30 transition-colors relative">
            <ShoppingCart size={18} />
            <span className="absolute top-0 right-0 w-4 h-4 bg-voxcina-blue dark:bg-voxcina-cream rounded-full text-white dark:text-voxcina-blue text-[10px] flex items-center justify-center">
              3
            </span>
          </div>
          <span className="text-xs mt-1 text-voxcina-blue/70 dark:text-voxcina-cream/70 group-hover:text-voxcina-blue dark:group-hover:text-voxcina-cream transition-colors">
            سبد خرید
          </span>
        </Link>
        <button
          className="flex flex-col items-center group"
          onClick={() => logout && logout()}
        >
          <div className="p-2 text-voxcina-blue/70 group-hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:group-hover:text-voxcina-cream rounded-full group-hover:bg-voxcina-cream/30 dark:group-hover:bg-voxcina-blue/30 transition-colors">
            <LogOut size={18} />
          </div>
          <span className="text-xs mt-1 text-voxcina-blue/70 dark:text-voxcina-cream/70 group-hover:text-voxcina-blue dark:group-hover:text-voxcina-cream transition-colors">
            خروج
          </span>
        </button>
      </div>
    </div>
  );
}
