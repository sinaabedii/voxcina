"use client";

import React from "react";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ProductAttribute } from "@/types/product";

interface ProductAttributesProps {
  attributes?: ProductAttribute[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

const ProductAttributes: React.FC<ProductAttributesProps> = ({
  attributes,
  title = "ویژگی‌های محصول",
  emptyMessage = "ویژگی خاصی درج نشده است",
  className,
}) => {
  // Filter out empty, false, or "0" values
  const validAttributes = attributes?.filter(
    (attr) =>
      attr.value &&
      attr.value.trim() !== "" &&
      attr.value.toLowerCase() !== "false" &&
      attr.value !== "0"
  );

  const hasAttributes = validAttributes && validAttributes.length > 0;

  return (
    <motion.div
      className={cn(
        "bg-secondary/30 rounded-xl p-4 mb-6 shadow-soft backdrop-blur-sm",
        className
      )}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-sm font-medium mb-3 text-foreground">{title}</h3>
      <ul className="space-y-2">
        {hasAttributes ? (
          validAttributes.map((attribute, index) => (
            <li key={index} className="text-sm flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 ml-2 flex-shrink-0" />
              <span className="text-foreground/80">
                {attribute.shownName || attribute.name}: {attribute.value}
              </span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">{emptyMessage}</li>
        )}
      </ul>
    </motion.div>
  );
};

export default ProductAttributes;
