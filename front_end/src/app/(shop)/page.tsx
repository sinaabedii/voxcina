"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useProductStore } from "@/store/product-store";
import ProductGrid from "@/components/product/ProductGrid";
import { DEMO_BANNERS } from "@/lib/constants";
import { categories } from "@/data/categories";

export default function HomePage() {
  const {
    featuredProducts,
    newProducts,
    fetchFeaturedProducts,
    fetchNewProducts,
    isLoading,
  } = useProductStore();

  useEffect(() => {
    fetchFeaturedProducts();
    fetchNewProducts();
  }, [fetchFeaturedProducts, fetchNewProducts]);

  const mainCategories = categories.slice(0, 5);

  return (
    <div className="pb-16">
      <section className="relative h-[400px] md:h-[500px] mb-12 overflow-hidden">
        <div className="relative h-full w-full">
          <Image
            src="/images/banners/main-banner.jpg"
            alt="بنر اصلی"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex items-center">
            <div className="container">
              <div className="max-w-lg text-white">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  کالکشن جدید تابستانه
                </h1>
                <p className="text-lg md:text-xl mb-8">
                  با مجموعه جدید تابستانه ما، استایل تابستانی خود را متحول کنید
                </p>
                <Link
                  href="/categories/summer"
                  className="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-opacity-90 transition-colors"
                >
                  مشاهده کالکشن
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mb-16">
        <h2 className="text-2xl font-bold mb-8">دسته‌بندی‌های محبوب</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {mainCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group"
            >
              <div className="relative h-40 rounded-lg overflow-hidden">
                <Image
                  src={category.image || "/images/placeholder.jpg"}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <h3 className="text-white text-lg font-medium">
                    {category.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">محصولات پرطرفدار</h2>
          <Link
            href="/products?sort=popular"
            className="text-primary hover:underline"
          >
            مشاهده همه
          </Link>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">در حال بارگذاری محصولات...</p>
          </div>
        ) : (
          <ProductGrid products={featuredProducts} columns={4} />
        )}
      </section>

      <section className="container mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEMO_BANNERS.map((banner) => (
            <Link
              key={banner.id}
              href={banner.href}
              className="relative h-60 rounded-lg overflow-hidden group"
            >
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center p-4 group-hover:bg-black/40 transition-colors">
                <h3 className="text-white text-xl font-bold mb-2">
                  {banner.title}
                </h3>
                <p className="text-white text-sm md:text-base">
                  {banner.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">جدیدترین محصولات</h2>
          <Link
            href="/products?sort=newest"
            className="text-primary hover:underline"
          >
            مشاهده همه
          </Link>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">در حال بارگذاری محصولات...</p>
          </div>
        ) : (
          <ProductGrid products={newProducts} columns={4} />
        )}
      </section>

      <section className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t pt-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">ارسال سریع و رایگان</h3>
            <p className="text-sm text-muted-foreground">
              برای سفارش‌های بالای ۵۰۰ هزار تومان
            </p>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">ضمانت اصالت کالا</h3>
            <p className="text-sm text-muted-foreground">
              تضمین اصل بودن تمامی محصولات
            </p>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">تنوع محصولات</h3>
            <p className="text-sm text-muted-foreground">
              هزاران محصول از صدها برند معتبر
            </p>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">پرداخت امن</h3>
            <p className="text-sm text-muted-foreground">
              درگاه‌های پرداخت معتبر و امن
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
