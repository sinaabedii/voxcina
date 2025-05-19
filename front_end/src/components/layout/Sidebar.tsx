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
    <aside className="w-64 bg-card border-l border-border/10 min-h-[calc(100vh-4rem)] shadow-soft">
      <div className="py-8 px-4">
        <div className="px-4 mb-6">
          <h2 className="text-lg font-bold text-primary">
            حساب کاربری
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
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
                        ? "bg-primary text-primary-foreground font-medium shadow-soft"
                        : "text-foreground hover:bg-secondary hover:text-primary"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all duration-200",
                        isActive
                          ? "bg-primary-foreground/20"
                          : "bg-secondary text-foreground group-hover:bg-primary/10"
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
                className="flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 w-full text-destructive hover:bg-destructive/10"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg mr-3 bg-destructive/10 text-destructive">
                  <LogOut className="w-5 h-5" />
                </div>
                خروج از حساب
              </button>
            </motion.div>
          </motion.div>
        </nav>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 border-t border-border/10">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-soft">
            ک
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-foreground">
              کاربر نمونه
            </p>
            <p className="text-xs text-muted-foreground">
              example@email.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;