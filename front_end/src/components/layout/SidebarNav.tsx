"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { DASHBOARD_NAV_ITEMS } from "@/lib/dashboard-nav";

interface SidebarNavProps {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  variant?: "compact" | "default";
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (pathname === href) return true;
  if (pathname.startsWith(href + "/")) return true;
  return false;
}

export default function SidebarNav({ pathname, onNavigate, onLogout, variant = "compact" }: SidebarNavProps) {
  const isCompact = variant === "compact";
  const linkPadding = isCompact ? "px-3 py-2.5 rounded-lg" : "px-4 py-3 rounded-xl";
  const iconSize = isCompact ? "w-7 h-7 mr-2.5" : "w-8 h-8 mr-3";
  const hoverX = isCompact ? 2 : 3;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      className={isCompact ? "space-y-2" : "space-y-2"}
    >
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <motion.div key={item.href} variants={itemVariants} whileHover={{ x: hoverX }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center text-sm transition-all duration-300",
                linkPadding,
                active
                  ? "bg-voxcina-blue dark:bg-voxcina-cream/90 text-white dark:text-voxcina-blue font-medium shadow-sm"
                  : "text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 hover:text-voxcina-blue dark:hover:text-voxcina-cream",
              )}
            >
              <div className={cn("flex items-center justify-center rounded-lg transition-all duration-300", iconSize, active ? "bg-white/20 dark:bg-voxcina-blue/20" : "bg-voxcina-cream/50 dark:bg-voxcina-blue/50 text-voxcina-blue/70 dark:text-voxcina-cream/70")}>{item.icon}</div>
              {item.name}
            </Link>
          </motion.div>
        );
      })}

      <motion.div variants={itemVariants} whileHover={{ x: hoverX }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
        <button onClick={onLogout} className={cn("flex items-center text-sm transition-all duration-300 w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10", linkPadding)}>
          <div className={cn("flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400", iconSize)}>
            <LogOut className={isCompact ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5"} />
          </div>
          خروج از حساب
        </button>
      </motion.div>
    </motion.div>
  );
}
