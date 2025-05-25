import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const ModernCategoriesSection = () => {
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  const categories = [
    {
      id: 1,
      name: "پوشاک زنانه",
      slug: "women-clothing",
      icon: "👗",
      color: "from-pink-500 to-rose-600",
      lightColor: "from-pink-50 to-rose-50",
      products: "2,350",
      description: "جدیدترین ترندهای مد زنانه",
    },
    {
      id: 2,
      name: "پوشاک مردانه",
      slug: "men-clothing",
      icon: "👔",
      color: "from-blue-500 to-indigo-600",
      lightColor: "from-blue-50 to-indigo-50",
      products: "1,890",
      description: "استایل مردانه و شیک",
    },
    {
      id: 3,
      name: "کیف و کفش",
      slug: "bags-shoes",
      icon: "👜",
      color: "from-amber-500 to-orange-600",
      lightColor: "from-amber-50 to-orange-50",
      products: "3,120",
      description: "لوازم جانبی لوکس",
    },
    {
      id: 4,
      name: "اکسسوری",
      slug: "accessories",
      icon: "💍",
      color: "from-purple-500 to-violet-600",
      lightColor: "from-purple-50 to-violet-50",
      products: "1,450",
      description: "جواهرات و زیورآلات",
    },
    {
      id: 5,
      name: "کودک و نوزاد",
      slug: "kids",
      icon: "🧸",
      color: "from-cyan-500 to-teal-600",
      lightColor: "from-cyan-50 to-teal-50",
      products: "890",
      description: "لباس‌های شاد کودکانه",
    },
    {
      id: 6,
      name: "ورزشی",
      slug: "sports",
      icon: "⚽",
      color: "from-green-500 to-emerald-600",
      lightColor: "from-green-50 to-emerald-50",
      products: "1,200",
      description: "پوشاک ورزشی حرفه‌ای",
    },
  ];

  return (
    <section className="py-12 md:py-20 ">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-gray-900">
            دسته‌بندی محصولات
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
            محصولات مورد علاقه خود را از میان دسته‌بندی‌های متنوع ما پیدا کنید
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Link href={`/categories/${category.slug}`}>
                <div
                  className={`relative group cursor-pointer bg-gradient-to-br ${category.lightColor} rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-lg`}
                  onMouseEnter={() => setHoveredCategory(category.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div className="text-3xl md:text-4xl mb-4">
                    {category.icon}
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {category.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {category.products}+ محصول
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                        category.color
                      } flex items-center justify-center transform transition-transform duration-300 ${
                        hoveredCategory === category.id ? "scale-110" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
                      category.color
                    } rounded-b-2xl transform origin-left transition-transform duration-300 ${
                      hoveredCategory === category.id
                        ? "scale-x-100"
                        : "scale-x-0"
                    }`}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 md:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                به دنبال چیز خاصی هستید؟
              </h3>
              <p className="text-gray-600 mb-6">
                با بیش از 10,000 محصول از برندهای معتبر، هر آنچه نیاز دارید را
                در وکسینا پیدا کنید
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/categories"
                  className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
                >
                  <span>همه دسته‌بندی‌ها</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full font-medium border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>جستجوی پیشرفته</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-6">
              {[
                { number: "150+", label: "برند معتبر" },
                { number: "10K+", label: "محصول متنوع" },
                { number: "98%", label: "رضایت مشتری" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModernCategoriesSection;
