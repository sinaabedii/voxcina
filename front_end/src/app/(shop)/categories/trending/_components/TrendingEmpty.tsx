import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TexturedBackground from "@/components/ui/TexturedBackground";

/**
 * Shown before any variant has enough traffic to rank.
 *
 * Carries the same textured masthead as the populated page so an empty list
 * reads as a list that has not filled yet, not as a broken route, and always
 * offers somewhere to go next.
 */
export default function TrendingEmpty() {
  return (
    <section className="relative isolate flex min-h-[62vh] items-center overflow-hidden rounded-b-[2.5rem]">
      <TexturedBackground />

      <div className="container flex flex-col items-center px-6 py-20 text-center">
        <span className="text-xs tracking-widest text-voxcina-blue/55 sm:text-sm">
          بر پایهٔ بازدید کاربران
        </span>

        <h1 className="mt-4 text-[11vw] font-bold leading-[1.02] text-voxcina-blue sm:text-[7vw] lg:text-[4.75rem]">
          فهرست هنوز خالی است
        </h1>

        <p className="mt-5 max-w-[44ch] text-sm leading-8 text-voxcina-blue/65 sm:text-base">
          رتبه‌بندی زمانی ساخته می‌شود که بازدید کافی روی رنگ‌ها و طرح‌ها ثبت شده
          باشد. تا آن زمان، همهٔ محصولات در دسترس‌اند.
        </p>

        <Link
          href="/products"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-voxcina-blue px-7 py-3.5 text-sm font-bold text-voxcina-cream shadow-[0_16px_36px_-16px_rgba(10,27,60,0.8)] transition-all duration-300 hover:bg-voxcina-darkBlue hover:shadow-[0_20px_44px_-16px_rgba(10,27,60,0.9)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 focus-visible:ring-offset-2"
        >
          مشاهده همهٔ محصولات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
