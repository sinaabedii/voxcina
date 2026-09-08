"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface AdminToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Toggles the collapsible filter panel. Omit to hide the filter button. */
  filterOpen?: boolean;
  onToggleFilters?: () => void;
  /** Render the filter panel permanently without a toggle button. */
  filtersAlwaysOpen?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standard admin search + collapsible-filter toolbar. Replaces the
 * copy-pasted search row + filter Card panel in every list page.
 */
export default function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "جستجو...",
  filterOpen,
  onToggleFilters,
  filtersAlwaysOpen = false,
  hasActiveFilters = false,
  onClearFilters,
  children,
  className,
}: AdminToolbarProps) {
  const collapsible = onToggleFilters !== undefined && children !== undefined && !filtersAlwaysOpen;
  const pinned = filtersAlwaysOpen && children !== undefined;
  const panelOpen = pinned || filterOpen;

  return (
    <div className={cn("mb-6", className)}>
      <motion.div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 text-sm placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
            placeholder={searchPlaceholder}
          />
        </div>
        {collapsible && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              "md:w-auto w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20",
              filterOpen && "bg-voxcina-blue/5 dark:bg-voxcina-blue/20"
            )}
          >
            <SlidersHorizontal className="w-4 h-4 ml-2" />
            فیلترها
            {hasActiveFilters && (
              <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-voxcina-blue dark:bg-voxcina-cream" />
            )}
          </Button>
        )}
      </motion.div>

      <AnimatePresence>
        {(pinned || (collapsible && panelOpen)) && (
          <motion.div
            initial={pinned ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="mt-3 border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
              <CardContent className="p-4 md:p-5">
                {children}
                {onClearFilters && hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearFilters}
                      className="rounded-xl border-red-200 text-red-500 dark:border-red-800/40 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4 ml-1" />
                      پاک کردن فیلترها
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
