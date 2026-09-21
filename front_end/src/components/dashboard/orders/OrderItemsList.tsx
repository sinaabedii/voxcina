import { Package } from "lucide-react";
import { OrderItem } from "@/types/order";
import { cn, formatPrice, toPersianNumber } from "@/lib/utils";

export function orderItemName(item: OrderItem): string {
  return item.product.name || item.product_name || `محصول شناسه: ${item.product.id}`;
}

export function orderItemVariantSummary(item: OrderItem): string {
  const parts: string[] = [];
  if (item.variant?.size && item.variant.size !== "N/A") parts.push(item.variant.size);
  const color = item.variant?.colorName || item.variant?.color;
  if (color && color !== "N/A") parts.push(color);
  return parts.join(" · ");
}

/**
 * Order line items. One responsive layout replaces the two copy-pasted
 * desktop/mobile blocks the detail page used to carry.
 */
export default function OrderItemsList({
  items,
  className,
}: {
  items: OrderItem[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => {
        const name = orderItemName(item);
        const variant = orderItemVariantSummary(item);
        const image = item.product.image || item.product_image;

        return (
          <div
            key={`${item.product.id}-${index}`}
            className="flex gap-2.5 rounded-lg border border-voxcina-cream/50 p-2 transition-shadow hover:shadow-sm dark:border-voxcina-blue/20 md:p-2.5"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-voxcina-cream/30 dark:bg-voxcina-blue/10 md:h-14 md:w-14">
              {image ? (
                <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-voxcina-blue/30 dark:text-voxcina-cream/30 md:h-6 md:w-6" />
              )}
            </div>

            <div className="min-w-0 flex-grow">
              <h4 className="truncate text-[13px] font-semibold text-voxcina-blue dark:text-voxcina-cream md:text-sm">
                {name}
              </h4>
              {(item.product.brand || variant) && (
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 md:text-[11px]">
                  {item.product.brand && <span>{item.product.brand}</span>}
                  {item.product.brand && variant && <span aria-hidden>·</span>}
                  {variant && <span>{variant}</span>}
                </div>
              )}
              <p className="mt-0.5 text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 md:text-[11px]">
                {toPersianNumber(item.quantity)} × {formatPrice(item.price_at_purchase)}
              </p>
            </div>

            <div className="flex-shrink-0 text-left">
              <p className="text-[13px] font-bold text-voxcina-blue dark:text-voxcina-cream md:text-sm">
                {formatPrice(item.price_at_purchase * item.quantity)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
