"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Brand } from "@/types/brand";
import { ColorVariantListItem } from "@/types/product";

interface BrandPageClientProps {
  brand: Brand;
  products: ColorVariantListItem[];
}

/**
 * Brand Page Client Component
 * 
 * Handles animations and interactive elements for the brand page.
 * Receives server-fetched data as props.
 */
export default function BrandPageClient({ brand, products }: BrandPageClientProps) {
  return (
    <div className="container py-8 md:py-12">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        {brand.logo && (
          <img
            src={brand.logo.startsWith('http') ? brand.logo : brand.logo}
            alt={brand.name}
            className="h-20 w-auto mx-auto mb-4 object-contain"
          />
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          {brand.name}
        </h1>
        {brand.description && (
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {brand.description}
          </p>
        )}
      </motion.div>

      {/* Products Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {products.length} محصول
        </p>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
        >
          {products.map((product, index) => (
            <motion.div
              key={product.productId || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProductCard item={product} priority={index === 0} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">محصولی یافت نشد</h2>
          <p className="text-muted-foreground">
            در حال حاضر محصولی برای این برند موجود نیست
          </p>
        </div>
      )}
    </div>
  );
}
