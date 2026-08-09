"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

interface MobileNavProps {
  navItems: NavItem[];
  onClose: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ navItems, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const toggleExpand = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 animate-fadeIn bg-voxcina-blue/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed inset-y-0 right-0 w-4/5 max-w-xs animate-slideInRight bg-white/95 shadow-lg backdrop-blur-sm border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 dark:bg-voxcina-blue/95 sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
          <Link href="/" className="relative" onClick={onClose}>
            <div className="relative w-20 sm:w-24 h-8 sm:h-10">
              <Image
                alt={APP_NAME}
                priority
                quality={100}
                src={"/images/Logo/BlueXTransparent.png"}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 5rem, 6rem"
              />
            </div>
          </Link>
          
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="py-3 sm:py-4 px-3 sm:px-4 overflow-y-auto max-h-[calc(100vh-9rem)] sm:max-h-[calc(100vh-10rem)] scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
          <nav className="space-y-1.5 sm:space-y-2">
            {navItems.map((item) => (
              <div key={item.href} className="rounded-lg sm:rounded-xl overflow-hidden">
                <div
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 ${
                    pathname === item.href
                      ? "bg-voxcina-blue dark:bg-voxcina-cream/20 text-white dark:text-voxcina-cream shadow-sm"
                      : "hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                  }`}
                >
                  <Link
                    href={item.href}
                    onClick={item.children ? (e) => e.preventDefault() : onClose}
                    className="text-xs sm:text-sm font-medium flex-grow"
                  >
                    {item.label}
                  </Link>

                  {item.children && (
                    <button
                      onClick={(e) => toggleExpand(e, item.href)}
                      className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/30"
                      aria-label={`باز/بسته کردن منوی ${item.label}`}
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300",
                          expandedItems[item.href] ? "rotate-180" : ""
                        )}
                      />
                    </button>
                  )}
                </div>

                {item.children && expandedItems[item.href] && (
                    <div className="animate-slideDown pr-3 sm:pr-4 mr-1 border-r-2 border-voxcina-blue/20 dark:border-voxcina-cream/20">
                      <div className="py-1.5 sm:py-2 space-y-1">
                        {item.children.map((child) => (
                          <div
                            key={child.href}
                          >
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                "block py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-xs sm:text-sm transition-all duration-300",
                                pathname === child.href
                                  ? "bg-voxcina-cream/50 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream font-medium"
                                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/20 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                              )}
                            >
                              {child.label}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/95 dark:bg-voxcina-blue/95 backdrop-blur-sm">
          {isAuthenticated ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/dashboard");
                }}
                className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-center text-xs sm:text-sm font-medium bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue hover:bg-voxcina-darkBlue dark:hover:bg-voxcina-cream transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {user?.name || "حساب کاربری"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <Link
                  href="/sign-in"
                  className="block py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-center text-xs sm:text-sm font-medium border border-voxcina-blue dark:border-voxcina-cream/30 text-voxcina-blue dark:text-voxcina-cream bg-transparent hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 shadow-sm hover:shadow-md"
                  onClick={onClose}
                >
                  ورود
                </Link>
              </div>
              <div>
                <Link
                  href="/sign-up"
                  className="block py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-center text-xs sm:text-sm font-medium bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue hover:bg-voxcina-darkBlue dark:hover:bg-voxcina-cream transition-all duration-300 shadow-sm hover:shadow-md"
                  onClick={onClose}
                >
                  ثبت نام
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
