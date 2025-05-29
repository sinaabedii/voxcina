import React, { useState } from "react";
import Link from "next/link";

const ModernCategoriesSection = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const categories = [
    {
      id: 1,
      name: "پوشاک زنانه",
      slug: "women-clothing",
      icon: "👗",
      color: "from-pink-400 to-rose-500",
      shadowColor: "shadow-pink-200",
      products: "50",
    },
    {
      id: 2,
      name: "پوشاک مردانه",
      slug: "men-clothing",
      icon: "👔",
      color: "from-blue-400 to-indigo-500",
      shadowColor: "shadow-blue-200",
      products: "100",
    },
    {
      id: 3,
      name: "کیف و کفش",
      slug: "bags-shoes",
      icon: "👜",
      color: "from-amber-400 to-orange-500",
      shadowColor: "shadow-amber-200",
      products: "20",
    },
    {
      id: 4,
      name: "اکسسوری",
      slug: "accessories",
      icon: "💍",
      color: "from-purple-400 to-violet-500",
      shadowColor: "shadow-purple-200",
      products: "50",
    },
    {
      id: 5,
      name: "آرایشی",
      slug: "beauty",
      icon: "💄",
      color: "from-fuchsia-400 to-pink-500",
      shadowColor: "shadow-fuchsia-200",
      products: "20",
    },
  ];

  return (
    <section className="py-16 bg-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm font-medium mb-4">
            دسته‌بندی‌ها
          </span>

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
        </div>

        <div className="relative">
          <div className="hidden md:flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto mb-16">
            {categories.map((category) => (
              <div
                key={category.id}
                className="relative"
              >
                <Link href={`/categories/${category.slug}`}>
                  <div
                    className="relative group cursor-pointer transition-transform duration-300 hover:-translate-y-2"
                    onClick={() => setSelectedCategory(category.id)}
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

                    <div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-20 group-hover:scale-110 transition-all duration-300`}
                    />

                    <div
                      className={`absolute -top-2 -right-2 bg-gradient-to-br ${category.color} text-white text-xs font-bold px-2 py-1 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-300`}
                    >
                      {category.products}+
                    </div>

                    {selectedCategory === category.id && (
                      <div
                        className="absolute inset-0 rounded-full border-4 border-gray-800 scale-110"
                      />
                    )}
                  </div>

                  <h3
                    className="text-center mt-3 text-sm md:text-base font-medium text-gray-800 group-hover:text-gray-900 transition-colors"
                  >
                    {category.name}
                  </h3>
                </Link>
              </div>
            ))}
          </div>

          <div className="md:hidden mb-12">
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide py-4">
                <div
                  className="flex gap-4 px-4"
                  style={{ width: "max-content" }}
                >
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex-shrink-0 opacity-0 animate-fadeIn"
                      style={{
                        animationDelay: `${category.id * 0.05}s`,
                        animationFillMode: 'forwards'
                      }}
                    >
                      <Link href={`/categories/${category.slug}`}>
                        <div
                          className="relative group cursor-pointer active:scale-95 transition-transform duration-150"
                          onClick={() => setSelectedCategory(category.id)}
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
                            <div
                              className="absolute inset-0 rounded-full border-3 border-gray-800 scale-110"
                            />
                          )}
                        </div>

                        <h3 className="text-center mt-2 text-xs font-medium text-gray-800 px-1">
                          {category.name}
                        </h3>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModernCategoriesSection;
