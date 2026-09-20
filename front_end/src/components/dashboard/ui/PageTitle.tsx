"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: string;
  className?: string;
}

export default function PageTitle({ title, className }: PageTitleProps) {
  return (
    <motion.h1
      className={cn(
        "relative inline-block text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream md:text-3xl",
        className,
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="relative z-10">{title}</span>
      <span className="absolute bottom-1 left-0 -z-0 h-3 w-full rounded-full bg-voxcina-cream opacity-40 dark:bg-voxcina-blue/20" />
    </motion.h1>
  );
}
