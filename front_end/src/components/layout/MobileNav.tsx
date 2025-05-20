"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";

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
        className="fixed inset-0 bg-voxcina-blue/30 backdrop-blur-sm"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={backdropVariants}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-white/95 dark:bg-voxcina-blue/95 shadow-lg border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={menuVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
          <div className="flex items-center">
            <Link
              href="/"
              className="relative"
              onClick={onClose}
            >
              <div className="relative w-24 sm:w-28 h-10 sm:h-12">
                <Image
                  alt={APP_NAME}
                  priority
                  quality={100}
                  src={"/images/Logo/BlueXTransparent.png"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 6rem, 7rem"
                />
              </div>
            </Link>
          </div>
          <motion.button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <div className="py-4 px-4 sm:px-5 overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <div key={item.href} className="rounded-xl overflow-hidden">
                <motion.div
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                    pathname === item.href
                      ? "bg-voxcina-blue dark:bg-voxcina-cream/20 text-white dark:text-voxcina-cream shadow-sm"
                      : "hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                  }`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={item.href}
                    onClick={
                      item.children ? (e) => e.preventDefault() : onClose
                    }
                    className="text-sm sm:text-base font-medium flex-grow"
                  >
                    {item.label}
                  </Link>

                  {item.children && (
                    <motion.button
                      onClick={(e) => toggleExpand(e, item.href)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/30"
                      aria-label={`باز/بسته کردن منوی ${item.label}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-300",
                          expandedItems[item.href] ? "rotate-180" : ""
                        )}
                      />
                    </motion.button>
                  )}
                </motion.div>

                <AnimatePresence initial={false}>
                  {item.children && expandedItems[item.href] && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="pr-4 mr-1 border-r-2 border-voxcina-blue/20 dark:border-voxcina-cream/20"
                    >
                      <div className="py-2 space-y-1">
                        {item.children.map((child) => (
                          <motion.div
                            key={child.href}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                "block py-2 px-3 rounded-lg text-xs sm:text-sm transition-all duration-300",
                                pathname === child.href
                                  ? "bg-voxcina-cream/50 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream font-medium"
                                  : "text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/20 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                              )}
                            >
                              {child.label}
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/95 dark:bg-voxcina-blue/95 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/sign-in"
                className="block py-2.5 px-4 rounded-xl text-center text-sm font-medium border border-voxcina-blue dark:border-voxcina-cream/30 text-voxcina-blue dark:text-voxcina-cream bg-transparent hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={onClose}
              >
                ورود
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/sign-up"
                className="block py-2.5 px-4 rounded-xl text-center text-sm font-medium bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue hover:bg-voxcina-darkBlue dark:hover:bg-voxcina-cream transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={onClose}
              >
                ثبت نام
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MobileNav;