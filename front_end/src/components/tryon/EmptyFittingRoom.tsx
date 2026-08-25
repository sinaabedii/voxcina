"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";

interface EmptyFittingRoomProps {
  /** Nothing in the cart at all, as opposed to nothing that can be tried on. */
  cartIsEmpty: boolean;
}

/** Shown when the room has no garment to work with. */
export default function EmptyFittingRoom({ cartIsEmpty }: EmptyFittingRoomProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-center flex-1 relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Decorative gradient wash */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-400/8 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-400/6 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-400/6 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "3s" }} />
      </div>

      <motion.div
        className="w-20 h-20 rounded-2xl bg-background border border-secondary-300 dark:border-voxcina-blue/20 flex items-center justify-center mb-4 relative z-10 shadow-inset-button"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <ShoppingBag className="h-10 w-10 text-voxcina-blue/30 dark:text-voxcina-cream/30" />
      </motion.div>
      <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream mb-2 relative z-10">
        {cartIsEmpty ? "محصولی برای پرو مجازی انتخاب نشده" : "محصولات سبد خرید قابلیت پرو مجازی ندارند"}
      </h2>
      <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-4 max-w-md relative z-10">
        {cartIsEmpty
          ? "ابتدا یک محصول به سبد خرید اضافه کنید."
          : "محصولاتی که تصویر پرو مجازی دارند در اینجا نمایش داده می‌شوند."}
      </p>
      <Link href="/products" className="relative z-10">
        <Button variant="primary" size="lg">مشاهده محصولات</Button>
      </Link>
    </motion.div>
  );
}
