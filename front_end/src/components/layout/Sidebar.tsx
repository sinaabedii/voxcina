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
    <aside className="w-full h-full bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
      <div className="py-8 px-4">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
            حساب کاربری
          </h2>
          <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
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
                <motion.div 
                  key={item.href} 
                  variants={itemVariants}
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue font-medium shadow-sm"
                        : "text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all duration-300",
                        isActive
                          ? "bg-white/20 dark:bg-voxcina-blue/20"
                          : "bg-voxcina-cream/50 dark:bg-voxcina-blue/50 text-voxcina-blue/70 dark:text-voxcina-cream/70"
                      )}
                    >
                      {item.icon}
                    </div>
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}

            <motion.div 
              variants={itemVariants}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg mr-3 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                  <LogOut className="w-5 h-5" />
                </div>
                خروج از حساب
              </button>
            </motion.div>
          </motion.div>
        </nav>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-voxcina-blue dark:bg-voxcina-cream flex items-center justify-center text-white dark:text-voxcina-blue font-bold text-lg shadow-sm">
            ک
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
              کاربر نمونه
            </p>
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
              example@email.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;