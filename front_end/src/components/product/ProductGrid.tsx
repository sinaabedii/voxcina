import React from "react";
import ProductCard from "./ProductCard";
import { Product } from "@/types/product";
import { motion } from "framer-motion";

interface ProductGridProps {
  products: Product[] | null | undefined;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
  glassEffect?: boolean;
  ribbonLabel?: string;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  columns = 4,
  className = "",
  glassEffect = false,
  ribbonLabel,
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
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      className={`grid ${gridCols[columns]} gap-4 md:gap-6 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {safeProducts.map((product) => (
        <motion.div
          key={product.id}
          variants={itemVariant}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
        >
          <ProductCard
            product={product}
            glassEffect={glassEffect}
            ribbonLabel={ribbonLabel}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ProductGrid;
