import { Order } from "@/types/order";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Order price breakdown. Shipping and discount rows only appear when the
 * order actually carries them, mirroring the admin order detail summary.
 */
export default function OrderSummary({ order, className }: { order: Order; className?: string }) {
  const itemsSubtotal = order.items.reduce(
    (total, item) => total + item.price_at_purchase * item.quantity,
    0,
  );
  const shippingCost = order.shipping_cost || 0;
  const discountAmount = order.discount_amount || 0;

  return (
    <div className={cn("rounded-lg bg-voxcina-cream/20 px-3 py-2 text-xs dark:bg-voxcina-blue/5", className)}>
      <div className="flex justify-between text-voxcina-blue/70 dark:text-voxcina-cream/70">
        <span>جمع محصولات</span>
        <span>{formatPrice(itemsSubtotal)}</span>
      </div>

      {shippingCost > 0 && (
        <div className="mt-1 flex justify-between text-voxcina-blue/70 dark:text-voxcina-cream/70">
          <span>هزینه ارسال</span>
          <span>{formatPrice(shippingCost)}</span>
        </div>
      )}

      {discountAmount > 0 && (
        <div className="mt-1 flex justify-between text-green-600 dark:text-green-400">
          <span>
            تخفیف
            {order.discount_code && (
              <span className="text-voxcina-blue/50 dark:text-voxcina-cream/50"> ({order.discount_code})</span>
            )}
          </span>
          <span>-{formatPrice(discountAmount)}</span>
        </div>
      )}

      <div className="mt-1.5 flex justify-between border-t border-voxcina-cream/50 pt-1.5 text-sm font-bold text-voxcina-blue dark:border-voxcina-blue/20 dark:text-voxcina-cream md:text-base">
        <span>مبلغ نهایی</span>
        <span>{formatPrice(order.total_amount)}</span>
      </div>
    </div>
  );
}
