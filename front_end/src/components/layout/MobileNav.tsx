"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/lib/constants";

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
        className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-card shadow-strong border-l border-border/10"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={menuVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/10">
          <h2 className="text-xl font-bold text-primary">
            {APP_NAME}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-4 px-5 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <nav className="space-y-3">
            {navItems.map((item) => (
              <div key={item.href} className="rounded-xl overflow-hidden">
                <div
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary text-foreground hover:text-primary"
                  }`}
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
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10"
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
                      className="pr-4 mr-1 border-r-2 border-primary/20"
                    >
                      <div className="py-2 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              "block py-2 px-3 rounded-lg text-sm transition-all duration-200",
                              pathname === child.href
                                ? "bg-secondary text-primary font-medium"
                                : "text-foreground hover:bg-secondary hover:text-primary"
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

        <div className="absolute bottom-0 inset-x-0 p-5 border-t border-border/10 bg-card">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/sign-in"
              className="voxcina-button-secondary"
              onClick={onClose}
            >
              ورود
            </Link>
            <Link
              href="/sign-up"
              className="voxcina-button-primary"
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