import React from "react";
import ProductCard from "./ProductCard";
import { Product } from "@/types/product";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

interface ProductGridProps {
  products: Product[] | null | undefined;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
  glassEffect?: boolean;
  ribbonLabel?: string;
  onAddToCart?: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  columns = 4,
  className = "",
  glassEffect = false,
  ribbonLabel,
  onAddToCart,
}) => {
  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];
  
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        mass: 0.8,
        duration: 0.4,
      },
    },
  };

  if (safeProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-secondary/20 rounded-xl border border-border/10 shadow-soft min-h-[300px] animate-fadeIn">
        <div className="bg-secondary/40 p-4 rounded-full mb-4">
          <ShoppingBag className="h-10 w-10 text-primary/60" />
        </div>
        <h3 className="text-xl font-medium text-primary mb-2">محصولی یافت نشد</h3>
        <p className="text-muted-foreground text-center max-w-md">
          متأسفانه محصولی با معیارهای انتخاب شده پیدا نشد. لطفاً فیلترهای جستجو را تغییر دهید یا بعداً دوباره امتحان کنید.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={`grid ${gridCols[columns]} gap-4 sm:gap-5 md:gap-6 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {safeProducts.map((product) => (
        <motion.div
          key={product.id}
          variants={itemVariant}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
          className="h-full"
        >
          <ProductCard
            product={product}
            glassEffect={glassEffect}
            ribbonLabel={ribbonLabel}
            onAddToCart={onAddToCart}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ProductGrid;