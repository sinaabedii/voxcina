"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { APP_NAME } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ShoppingCart,
  Search,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingBag,
  Percent,
  Star,
  Bot,
  FileText,
  Settings,
  Headphones,
  HelpCircle,
  Image,
  Activity,
  ShoppingBasket,
  Ticket,
  RotateCcw,
  Briefcase,
} from "lucide-react";

/**
 * A sidebar item is active when the current route is it, or is nested under it.
 *
 * "/admin" is compared exactly: every admin route starts with that prefix, so a
 * prefix test would leave the dashboard permanently highlighted.
 */
function isSectionActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  
  // Use the new protected route hook with admin role requirement (Requirement 3.4)
  const { isLoading, isAuthorized } = useProtectedRoute({
    requiredAuth: true,
    requiredRole: 'admin',
    nonAdminRedirectUrl: '/dashboard', // Redirect non-admin users to dashboard
  });
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  // Close the mobile drawer whenever the route changes. The previous version
  // listened for `popstate`, which only fires on browser back/forward — never
  // on a <Link> click, the case that actually matters here.
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Sidebar items for admin
  const sidebarItems = [
    {
      name: "داشبورد",
      href: "/admin",
      icon: <LayoutDashboard className="w-5 h-5 ml-3" />,
    },
    {
      name: "محصولات",
      href: "/admin/products",
      icon: <Package className="w-5 h-5 ml-3" />,
    },
    {
      name: "دسته‌بندی‌ها",
      href: "/admin/categories",
      icon: <Tags className="w-5 h-5 ml-3" />,
    },
    {
      name: "برندها",
      href: "/admin/brands",
      icon: <ShoppingBag className="w-5 h-5 ml-3" />,
    },
    {
      name: "سفارش‌ها",
      href: "/admin/orders",
      icon: <ShoppingCart className="w-5 h-5 ml-3" />,
    },
    {
      name: "درخواست‌های مرجوعی",
      href: "/admin/returns",
      icon: <RotateCcw className="w-5 h-5 ml-3" />,
    },
    {
      name: "سبدهای خرید",
      href: "/admin/carts",
      icon: <ShoppingBasket className="w-5 h-5 ml-3" />,
    },
    {
      name: "تیکت‌ها",
      href: "/admin/tickets",
      icon: <Headphones className="w-5 h-5 ml-3" />,
    },
    {
      name: "همکاری و استخدام",
      href: "/admin/careers",
      icon: <Briefcase className="w-5 h-5 ml-3" />,
    },
    {
      name: "کاربران",
      href: "/admin/users",
      icon: <Users className="w-5 h-5 ml-3" />,
    },
    {
      name: "فعالیت کاربران",
      href: "/admin/activity",
      icon: <Activity className="w-5 h-5 ml-3" />,
    },
    {
      name: "تخفیف‌ها",
      href: "/admin/discounts",
      icon: <Percent className="w-5 h-5 ml-3" />,
    },
    {
      name: "کدها و کوپن‌ها",
      href: "/admin/vouchers",
      icon: <Ticket className="w-5 h-5 ml-3" />,
    },
    {
      name: "نظرات",
      href: "/admin/reviews",
      icon: <Star className="w-5 h-5 ml-3" />,
    },
    {
      name: "گفتگوهای هوش مصنوعی",
      href: "/admin/ai-chats",
      icon: <Bot className="w-5 h-5 ml-3" />,
    },
    {
      name: "بلاگ‌ها",
      href: "/admin/blogs",
      icon: <FileText className="w-5 h-5 ml-3" />,
    },
    {
      name: "تصاویر هیرو",
      href: "/admin/hero-images",
      icon: <Image className="w-5 h-5 ml-3" />,
    },
    {
      name: "سوالات متداول",
      href: "/admin/faqs",
      icon: <HelpCircle className="w-5 h-5 ml-3" />,
    },
    {
      name: "تنظیمات",
      href: "/admin/settings",
      icon: <Settings className="w-5 h-5 ml-3" />,
    },
  ];

  const handleLogout = () => {
    logout && logout();
    router.push("/sign-in");
  };

  // Show loading state during auth verification (Requirement 3.5)
  if (isLoading) {
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

  // Don't render content if not authorized (redirect is handled by hook)
  if (!isAuthorized) {
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

            <Link href="/admin" className="flex items-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue flex items-center justify-center text-white font-bold text-sm ml-2 shadow-sm">
                {APP_NAME.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream hidden sm:inline-block">
                  {APP_NAME}
                </span>
                <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 hidden sm:inline-block">
                  پنل مدیریت
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center bg-voxcina-cream/30 dark:bg-voxcina-blue/30 rounded-xl w-80 px-3 py-2 border border-voxcina-cream/50 dark:border-voxcina-blue/50 shadow-inner-soft backdrop-blur-sm">
            <Search
              size={18}
              className="text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-2"
            />
            <input
              type="text"
              placeholder="جستجو در پنل مدیریت..."
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
                      {user?.name?.charAt(0) || "A"}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream hidden sm:inline-block">
                  {user?.name || "مدیر"}
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
                      href="/admin"
                      className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    >
                      پنل مدیریت
                    </Link>
                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    >
                      مشاهده فروشگاه
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="block px-4 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                    >
                      تنظیمات
                    </Link>
                    <button
                      className="w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors"
                      onClick={handleLogout}
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
                className="fixed inset-y-0 right-0 flex w-72 flex-col bg-white/90 dark:bg-voxcina-blue/90 z-50 md:hidden border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm shadow-lg"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
              >
                <div className="flex-shrink-0 p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex items-center justify-between">
                  <h2 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                    پنل مدیریت {APP_NAME}
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
                <div className="w-full flex-1 min-h-0 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
                  <div className="py-8 px-4">
                    <nav>
                      <div className="space-y-1">
                        {sidebarItems.map((item) => {
                          const isActive = isSectionActive(pathname, item.href);

                          return (
                            <motion.div
                              key={item.href}
                              whileHover={{ x: 3 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Link
                                href={item.href}
                                className={`flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 ${
                                  isActive
                                    ? "bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue font-medium shadow-sm"
                                    : "text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                                }`}
                                onClick={() => setIsMobileSidebarOpen(false)}
                              >
                                <div
                                  className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all duration-300 ${
                                    isActive
                                      ? "bg-white/20 dark:bg-voxcina-blue/20"
                                      : "bg-voxcina-cream/50 dark:bg-voxcina-blue/50 text-voxcina-blue/70 dark:text-voxcina-cream/70"
                                  }`}
                                >
                                  {item.icon}
                                </div>
                                {item.name}
                              </Link>
                            </motion.div>
                          );
                        })}

                        <motion.div
                          whileHover={{ x: 3 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            onClick={handleLogout}
                            className="flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg mr-3 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                              <LogOut className="w-5 h-5 ml-3" />
                            </div>
                            خروج از حساب
                          </button>
                        </motion.div>
                      </div>
                    </nav>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* The sticky sidebar must have a *bounded* height for `overflow-y-auto`
            to mean anything. It previously used `h-full`, which resolves to the
            full flex-row height, so the box was as tall as its ~19 items: there
            was no overflow to scroll, and because the element is sticky the tail
            of the menu stayed parked below the fold, unreachable on any viewport
            shorter than the menu. Pinning it to the viewport minus the 4rem
            header makes the sidebar scroll on its own.
            `shrink-0` stops a wide admin table from squeezing it. */}
        <aside
          aria-label="منوی پنل مدیریت"
          className="hidden md:block w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-l border-voxcina-cream/30 dark:border-voxcina-blue/30 py-6 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
          <div className="py-8 px-4">
            <div className="px-4 mb-6">
              <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
                پنل مدیریت
              </h2>
              <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
                مدیریت فروشگاه و محتوا
              </p>
            </div>

            <nav>
              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = isSectionActive(pathname, item.href);

                  return (
                    <motion.div
                      key={item.href}
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        href={item.href}
                        className={`flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 ${
                          isActive
                            ? "bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue font-medium shadow-sm"
                            : "text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all duration-300 ${
                            isActive
                              ? "bg-white/20 dark:bg-voxcina-blue/20"
                              : "bg-voxcina-cream/50 dark:bg-voxcina-blue/50 text-voxcina-blue/70 dark:text-voxcina-cream/70"
                          }`}
                        >
                          {item.icon}
                        </div>
                        {item.name}
                      </Link>
                    </motion.div>
                  );
                })}

                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg mr-3 bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                      <LogOut className="w-5 h-5 ml-3" />
                    </div>
                    خروج از حساب
                  </button>
                </motion.div>
              </div>
            </nav>
          </div>
        </aside>

        <motion.main
          className="flex-grow p-4 md:p-6 lg:p-8 overflow-x-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}
