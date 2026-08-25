import { CartReconciliation } from "@/types/product";

// Editing or deleting a product can take something out of a shopper's cart.
// That is not a change the admin should have to discover later, so both the
// edit and the delete path report exactly what reached the carts.
export function describeCartReconciliation({
  cartsChanged,
  itemsRemoved,
  itemsReduced,
}: CartReconciliation): string {
  const fa = (value: number) => value.toLocaleString("fa-IR");
  const changes: string[] = [];
  if (itemsRemoved > 0) {
    changes.push(`${fa(itemsRemoved)} مورد حذف شد`);
  }
  if (itemsReduced > 0) {
    changes.push(`تعداد ${fa(itemsReduced)} مورد کاهش یافت`);
  }
  if (changes.length === 0) {
    return `${fa(cartsChanged)} سبد خرید به‌روزرسانی شد.`;
  }
  return `${fa(cartsChanged)} سبد خرید به‌روزرسانی شد: ${changes.join(" و ")}.`;
}
