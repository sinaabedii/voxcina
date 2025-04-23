"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, Package, MapPin, Heart, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";

const Sidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const sidebarItems = [
    {
      name: "داشبورد",
      href: "/dashboard",
      icon: <User className="w-5 h-5 ml-3" />,
    },
    {
      name: "سفارش‌های من",
      href: "/dashboard/orders",
      icon: <Package className="w-5 h-5 ml-3" />,
    },
    {
      name: "آدرس‌های من",
      href: "/dashboard/addresses",
      icon: <MapPin className="w-5 h-5 ml-3" />,
    },
    {
      name: "علاقه‌مندی‌ها",
      href: "/dashboard/favorites",
      icon: <Heart className="w-5 h-5 ml-3" />,
    },
    {
      name: "تنظیمات حساب",
      href: "/dashboard/settings",
      icon: <Settings className="w-5 h-5 ml-3" />,
    },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 min-h-[calc(100vh-4rem)] shadow-sm">
      <div className="py-8 px-4">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            حساب کاربری
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            مدیریت اطلاعات و سفارش‌ها
          </p>
        </div>

        <nav className="space-y-2">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {sidebarItems.map((item, index) => {
              const isActive = pathname === item.href;

              return (
                <motion.div key={item.href} variants={itemVariants}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors",
                        isActive
                          ? "bg-white/20"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {item.icon}
                    </div>
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}

            <motion.div variants={itemVariants}>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-3 text-sm rounded-xl transition-colors w-full text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg mr-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                خروج از حساب
              </button>
            </motion.div>
          </motion.div>
        </nav>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            ک
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              کاربر نمونه
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              example@email.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
