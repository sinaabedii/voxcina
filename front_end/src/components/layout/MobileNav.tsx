"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );

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

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
  };

  const menuVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
  };

  const dropdownVariants = {
    hidden: { height: 0, opacity: 0, overflow: "hidden" },
    visible: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      },
    },
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={backdropVariants}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-white dark:bg-gray-900 shadow-xl"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={menuVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            منو
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-4 px-5 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <nav className="space-y-4">
            {navItems.map((item) => (
              <div key={item.href} className="rounded-xl overflow-hidden">
                <div
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    pathname === item.href
                      ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 text-primary"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                  } transition-colors`}
                >
                  <Link
                    href={item.href}
                    onClick={
                      item.children ? (e) => e.preventDefault() : onClose
                    }
                    className="text-base font-medium flex-grow"
                  >
                    {item.label}
                  </Link>

                  {item.children && (
                    <button
                      onClick={(e) => toggleExpand(e, item.href)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                      aria-label={`باز/بسته کردن منوی ${item.label}`}
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-300",
                          expandedItems[item.href] ? "rotate-180" : ""
                        )}
                      />
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {item.children && expandedItems[item.href] && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="pr-4 mr-1 border-r border-gray-200 dark:border-gray-700"
                    >
                      <div className="py-2 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              "block py-2 px-3 rounded-lg text-sm transition-colors",
                              pathname === child.href
                                ? "bg-gray-50 dark:bg-gray-800 text-primary font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/sign-in"
              className="flex items-center justify-center py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              ورود
            </Link>
            <Link
              href="/sign-up"
              className="flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors"
              onClick={onClose}
            >
              ثبت نام
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MobileNav;
