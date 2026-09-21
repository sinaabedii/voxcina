import { Package, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/order-utils";

const GUIDE_ITEMS: ReadonlyArray<{
  status: keyof typeof ORDER_STATUS_LABELS;
  description: string;
  dotClassName: string;
  textClassName: string;
}> = [
  {
    status: "pending",
    description: "سفارش شما ثبت شده و منتظر پرداخت است.",
    dotClassName: "bg-amber-400",
    textClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    status: "processing",
    description: "پرداخت شما موفق بوده و سفارش در حال آماده سازی است.",
    dotClassName: "bg-sky-400",
    textClassName: "text-sky-600 dark:text-sky-400",
  },
  {
    status: "shipped",
    description: "سفارش شما آماده و در مسیر ارسال است.",
    dotClassName: "bg-blue-400",
    textClassName: "text-blue-600 dark:text-blue-400",
  },
  {
    status: "delivered",
    description: "سفارش شما با موفقیت تحویل داده شده است.",
    dotClassName: "bg-green-400",
    textClassName: "text-green-600 dark:text-green-400",
  },
  {
    status: "cancelled",
    description: "سفارش شما لغو شده است.",
    dotClassName: "bg-red-400",
    textClassName: "text-red-600 dark:text-red-400",
  },
];

/** Static help cards shown under the order list. */
export default function OrdersGuide({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 md:grid-cols-2", className)}>
      <Card className="overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-soft backdrop-blur-sm transition-shadow hover:shadow-medium dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
        <CardHeader className="bg-gradient-to-r from-voxcina-cream/50 to-voxcina-cream/30 pb-3 dark:from-voxcina-blue/30 dark:to-voxcina-blue/20">
          <CardTitle className="flex items-center text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
            <Package className="ml-2 h-5 w-5" />
            راهنمای پیگیری سفارش
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ul className="space-y-2 text-sm">
            {GUIDE_ITEMS.map((item) => (
              <li key={item.status} className="flex items-start">
                <span
                  aria-hidden
                  className={cn("ml-2 mt-1.5 h-3 w-3 flex-shrink-0 rounded-full", item.dotClassName)}
                />
                <span>
                  <strong className={item.textClassName}>{ORDER_STATUS_LABELS[item.status]}:</strong>{" "}
                  {item.description}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-voxcina-cream bg-white/90 shadow-soft backdrop-blur-sm transition-shadow hover:shadow-medium dark:border-voxcina-blue/30 dark:bg-voxcina-blue/10">
        <CardHeader className="bg-gradient-to-r from-voxcina-cream/50 to-voxcina-cream/30 pb-3 dark:from-voxcina-blue/30 dark:to-voxcina-blue/20">
          <CardTitle className="flex items-center text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">
            <Truck className="ml-2 h-5 w-5" />
            اطلاعات ارسال
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="mb-4 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
            برای پیگیری وضعیت ارسال سفارش خود، می‌توانید از کد رهگیری پستی استفاده نمایید که در صورت
            وجود، در کنار سفارش نمایش داده می‌شود.
          </p>
          <div className="flex items-center rounded-xl bg-voxcina-cream/30 p-3 dark:bg-voxcina-blue/30">
            <div className="ml-3 rounded-xl bg-voxcina-cream/50 p-2 dark:bg-voxcina-blue/40">
              <Truck className="h-6 w-6 text-voxcina-blue dark:text-voxcina-cream" />
            </div>
            <div>
              <h4 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                پیگیری مرسولات پستی
              </h4>
              <p className="mt-1 text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
                کد رهگیری را در قسمت جزئیات سفارش یا کنار آن می‌توانید مشاهده کنید.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
