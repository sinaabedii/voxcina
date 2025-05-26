import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const ModernCategoriesSection = () => {
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const categories = [
    {
      id: 1,
      name: "پوشاک زنانه",
      slug: "women-clothing",
      icon: "👗",
      color: "from-pink-400 to-rose-500",
      shadowColor: "shadow-pink-200",
      products: "2,350",
    },
    {
      id: 2,
      name: "پوشاک مردانه",
      slug: "men-clothing",
      icon: "👔",
      color: "from-blue-400 to-indigo-500",
      shadowColor: "shadow-blue-200",
      products: "1,890",
    },
    {
      id: 3,
      name: "کیف و کفش",
      slug: "bags-shoes",
      icon: "👜",
      color: "from-amber-400 to-orange-500",
      shadowColor: "shadow-amber-200",
      products: "3,120",
    },
    {
      id: 4,
      name: "اکسسوری",
      slug: "accessories",
      icon: "💍",
      color: "from-purple-400 to-violet-500",
      shadowColor: "shadow-purple-200",
      products: "1,450",
    },
    {
      id: 5,
      name: "کودک و نوزاد",
      slug: "kids",
      icon: "🧸",
      color: "from-cyan-400 to-teal-500",
      shadowColor: "shadow-cyan-200",
      products: "890",
    },
    {
      id: 6,
      name: "ورزشی",
      slug: "sports",
      icon: "⚽",
      color: "from-green-400 to-emerald-500",
      shadowColor: "shadow-green-200",
      products: "1,200",
    },
    {
      id: 7,
      name: "آرایشی",
      slug: "beauty",
      icon: "💄",
      color: "from-fuchsia-400 to-pink-500",
      shadowColor: "shadow-fuchsia-200",
      products: "2,100",
    },
    {
      id: 8,
      name: "لوازم خانه",
      slug: "home",
      icon: "🏠",
      color: "from-teal-400 to-cyan-500",
      shadowColor: "shadow-teal-200",
      products: "980",
    },
  ];

  return (
    <section className="py-16  ">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm font-medium mb-4"
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            دسته‌بندی‌ها
          </motion.span>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            انتخاب
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mx-2">
              استایل
            </span>
            شما
          </h2>

          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            دسته‌بندی مورد نظر خود را انتخاب کنید و از خرید لذت ببرید
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden md:flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto mb-16">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200,
                }}
                className="relative"
              >
                <Link href={`/categories/${category.slug}`}>
                  <motion.div
                    className="relative group cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => setSelectedCategory(category.id)}
                    whileHover={{ y: -8 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div
                      className={`relative w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br ${category.color} p-0.5 ${category.shadowColor} shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <span className="text-3xl md:text-4xl lg:text-5xl transform transition-transform duration-300 group-hover:scale-110">
                          {category.icon}
                        </span>
                      </div>
                    </div>

                    <motion.div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                      initial={false}
                      animate={
                        hoveredCategory === category.id
                          ? { scale: 1.15 }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.3 }}
                    />

                    <motion.div
                      className={`absolute -top-2 -right-2 bg-gradient-to-br ${category.color} text-white text-xs font-bold px-2 py-1 rounded-full shadow-md`}
                      initial={{ scale: 0 }}
                      animate={
                        hoveredCategory === category.id
                          ? { scale: 1, rotate: 10 }
                          : { scale: 0 }
                      }
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      {category.products}+
                    </motion.div>

                    {selectedCategory === category.id && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-gray-800"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      />
                    )}
                  </motion.div>

                  <motion.h3
                    className="text-center mt-3 text-sm md:text-base font-medium text-gray-800 group-hover:text-gray-900 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    {category.name}
                  </motion.h3>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="md:hidden mb-12">
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide py-4">
                <div
                  className="flex gap-4 px-4"
                  style={{ width: "max-content" }}
                >
                  {categories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="flex-shrink-0"
                    >
                      <Link href={`/categories/${category.slug}`}>
                        <motion.div
                          className="relative group cursor-pointer"
                          onTouchStart={() => setHoveredCategory(category.id)}
                          onTouchEnd={() => setHoveredCategory(null)}
                          onClick={() => setSelectedCategory(category.id)}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div
                            className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${category.color} p-0.5 ${category.shadowColor} shadow-lg transition-all duration-300`}
                          >
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <span className="text-2xl">{category.icon}</span>
                            </div>
                          </div>

                          <div
                            className={`absolute -top-1 -right-1 bg-gradient-to-br ${category.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}
                          >
                            {category.products}+
                          </div>

                          {selectedCategory === category.id && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-3 border-gray-800"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1.1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            />
                          )}
                        </motion.div>

                        <h3 className="text-center mt-2 text-xs font-medium text-gray-800 px-1">
                          {category.name}
                        </h3>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="absolute left-0 top-1/3 -translate-y-1/2 bg-gradient-to-r from-white via-white to-transparent w-8 h-20 pointer-events-none md:hidden" />
              <div className="absolute right-0 top-1/3 -translate-y-1/2 bg-gradient-to-l from-white via-white to-transparent w-8 h-20 pointer-events-none md:hidden" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModernCategoriesSection;
