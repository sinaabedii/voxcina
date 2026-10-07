"use client";

import React from "react";
import { Sparkles } from "lucide-react";
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
  title = "ویژگی‌ها و مشخصات محصول",
  emptyMessage,
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

  if (!hasAttributes) {
    if (!emptyMessage) return null;
    return <p className="text-xs text-foreground/50">{emptyMessage}</p>;
  }

  return (
    <div className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-lg bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream">
          <Sparkles className="size-3.5" />
        </span>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {validAttributes.map((attribute, index) => (
          <div
            key={`${attribute.name}-${index}`}
            className="flex flex-col justify-center rounded-xl border border-voxcina-blue/10 bg-white/70 p-3 shadow-2xs backdrop-blur-xs transition-colors hover:border-voxcina-blue/20 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <span className="text-xs font-medium text-foreground/55">
              {attribute.shownName || attribute.name}
            </span>
            <span className="mt-1 text-sm font-semibold text-foreground">
              {attribute.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductAttributes;
