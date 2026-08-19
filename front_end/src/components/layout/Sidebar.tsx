"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { User, Package, MapPin, Heart, LogOut, Settings, Menu, X, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const Sidebar = ({ embedded = false }: { embedded?: boolean }) => {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const isActiveHref = (href: string) => {
    if (pathname === href) return true;
    if (pathname.startsWith(href + "/")) return true;
    return false;
  };

  const sidebarItems = [
    {
      name: "داشبورد",
      href: "/dashboard",
      icon: <User className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      name: "سفارشهای من",
      href: "/dashboard/orders",
      icon: <Package className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      name: "آدرسهای من",
      href: "/dashboard/addresses",
      icon: <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      name: "علاقهمندیها",
      href: "/dashboard/favorites",
      icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      name: "تخفیفهای من",
      href: "/dashboard/discounts",
      icon: <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      name: "تنظیمات حساب",
      href: "/dashboard/settings",
      icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const sidebarVariants = {
    hidden: { x: "-100%" },
    visible: {
      x: 0,
      transition: { type: "spring" as const, damping: 25, stiffness: 300 },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
  };

  if (embedded) {
    return (
      <div className="py-4 px-4">
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
            {sidebarItems.map((item) => {
              const isActive = isActiveHref(item.href);
              return (
                <motion.div
                  key={item.href}
                  variants={itemVariants}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue font-medium shadow-sm"
                        : "text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-lg mr-2.5 transition-all duration-300",
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
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-300 w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg mr-2.5 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                  <LogOut className="w-4 h-4" />
                </div>
                خروج از حساب
              </button>
            </motion.div>
          </motion.div>
        </nav>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-24 sm:top-28 right-4 z-30">
        <motion.button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 sm:p-3 rounded-xl bg-white/95 dark:bg-voxcina-blue/95 backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-lg text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-full min-h-screen sticky top-4 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm rounded-2xl border border-voxcina-cream/20 dark:border-voxcina-blue/20 shadow-md overflow-hidden">
        <div className="py-6 px-4 h-full min-h-[calc(100vh-2rem)]">
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
              حساب کاربری
            </h2>
            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
              مدیریت اطلاعات و سفارشها
            </p>
          </div>

          <nav className="space-y-2 flex-1">
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
              className="space-y-2"
            >
              {sidebarItems.map((item) => {
                const isActive = isActiveHref(item.href);

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
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  خروج از حساب
                </button>
              </motion.div>
            </motion.div>
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
            <motion.div
              className="fixed inset-0 bg-voxcina-blue/30 backdrop-blur-sm"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={backdropVariants}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              className="fixed inset-y-0 right-0 w-4/5 max-w-xs bg-white/98 dark:bg-voxcina-blue/98 shadow-xl border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-md flex flex-col"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sidebarVariants}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
                <h2 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">
                  حساب کاربری
                </h2>
                <motion.button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Mobile Navigation */}
              <div className="flex-1 py-4 px-4 overflow-y-auto bg-white/95 dark:bg-voxcina-blue/95">
                <nav className="space-y-2 h-full">
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
                    {sidebarItems.map((item) => {
                      const isActive = isActiveHref(item.href);

                      return (
                        <motion.div
                          key={item.href}
                          variants={itemVariants}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-300",
                              isActive
                                ? "bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue font-medium shadow-sm"
                                : "text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center w-7 h-7 rounded-lg mr-2.5 transition-all duration-300",
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
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-300 w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg mr-2.5 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                          <LogOut className="w-4 h-4" />
                        </div>
                        خروج از حساب
                      </button>
                    </motion.div>
                  </motion.div>
                </nav>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
