"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Package, Sparkles } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { ColorVariantListItem } from "@/types/product";

interface TrendingPageClientProps {
  items: ColorVariantListItem[];
}

export default function TrendingPageClient({ items }: TrendingPageClientProps) {
  if (items.length === 0) {
    return (
      <div className="container py-20 min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Eye className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-foreground">محبوب‌ترین‌ها در راه‌اند</h2>
          <p className="mt-3 leading-8 text-muted-foreground">
            هنوز بازدید کافی برای رتبه‌بندی محصولات ثبت نشده است. کمی بعد دوباره سر بزنید.
          </p>
          <Link
            href="/products"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-medium"
          >
            <Package className="h-4 w-4" />
            مشاهده همه محصولات
          </Link>
        </div>
      </div>
    );
  }

  const featured = items[0];
  const remaining = items.slice(1);

  return (
    <div className="container py-8 md:py-14">
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary/95 to-slate-950 px-6 py-10 text-primary-foreground shadow-strong md:px-12 md:py-14"
      >
        <div className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            انتخاب کاربران وکسینا
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">پربازدیدترین‌ها</h1>
          <p className="mt-4 max-w-xl text-sm leading-8 text-white/75 md:text-base">
            رنگ‌ها و طرح‌هایی که بیشتر از همه توجه کاربران را جلب کرده‌اند.
          </p>
        </div>
      </motion.header>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-[2rem] border border-primary/10 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-medium md:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-black text-yellow-950">رتبه اول</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
              <Eye className="h-4 w-4 text-primary" />
              {new Intl.NumberFormat("fa-IR").format(featured.viewCount || 0)} بازدید
            </span>
          </div>
          <ProductCard item={featured} glassEffect priority />
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {remaining.slice(0, 3).map((item, index) => (
            <motion.div
              key={`${item.productId}-${item.colorVariant.variantId || index}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.06 }}
              className={index === 2 ? "col-span-2 sm:col-span-1" : ""}
            >
              <ProductCard item={item} glassEffect />
            </motion.div>
          ))}
        </div>
      </div>

      {remaining.length > 3 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground md:text-2xl">ادامه فهرست محبوب‌ها</h2>
            <span className="text-sm text-muted-foreground">{items.length} طرح منتخب</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-5">
            {remaining.slice(3).map((item, index) => (
              <motion.div
                key={`${item.productId}-${item.colorVariant.variantId || index + 3}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
              >
                <ProductCard item={item} />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
