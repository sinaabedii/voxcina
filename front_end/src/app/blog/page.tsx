"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { blogPosts } from "@/data/blog";
import BlogCard from "@/components/blog/BlogCard";
import BlogCategories from "@/components/blog/BlogCategories";
import BlogSearch from "@/components/blog/BlogSearch";
import BlogSidebar from "@/components/blog/BlogSidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function BlogPage() {
  const searchParams = useSearchParams();
  const [filteredPosts, setFilteredPosts] = useState(blogPosts);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get("category")
  );
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const categories = Array.from(
    new Set(blogPosts.map((post) => post.category))
  ).sort();

  const tags = Array.from(
    new Set(blogPosts.flatMap((post) => post.tags))
  ).sort();

  useEffect(() => {
    let result = [...blogPosts];

    const categoryParam = searchParams.get("category");
    const tagParam = searchParams.get("tag");
    const searchParam = searchParams.get("search");

    if (categoryParam) {
      setSelectedCategory(categoryParam);
      result = result.filter((post) => post.category === categoryParam);
    } else if (selectedCategory) {
      result = result.filter((post) => post.category === selectedCategory);
    }

    if (tagParam) {
      result = result.filter((post) => post.tags.includes(tagParam));
    }

    if (searchParam || searchTerm) {
      const term = searchParam || searchTerm;
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(term.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(term.toLowerCase()) ||
          post.content.toLowerCase().includes(term.toLowerCase()) ||
          post.tags.some((tag) =>
            tag.toLowerCase().includes(term.toLowerCase())
          )
      );
    }

    setFilteredPosts(result);
  }, [searchParams, selectedCategory, searchTerm]);

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <>
      <Header />
      <section className="py-10">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-3 md:mb-4 text-3xl md:text-4xl lg:text-5xl font-bold text-voxcina-blue">
              بلاگ وکسینا
            </h1>
            <p className="mb-6 md:mb-8 text-sm md:text-lg text-gray-600">
              آخرین مقالات، راهنمای خرید و نکات کاربردی درباره مد و پوشاک
            </p>
            <BlogSearch onSearch={handleSearch} />
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <BlogCategories
                  posts={blogPosts}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategorySelect}
                />
              </div>

              {filteredPosts.length > 0 ? (
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  {filteredPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className={index === 0 ? "col-span-1 sm:col-span-2" : ""}
                    >
                      <BlogCard
                        post={post}
                        variant={index === 0 ? "featured" : "default"}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-6 md:p-8 text-center shadow-soft">
                  <h3 className="mb-2 text-xl font-bold text-voxcina-blue">
                    مقاله‌ای یافت نشد!
                  </h3>
                  <p className="text-sm md:text-base text-gray-600">
                    با معیارهای جستجوی فعلی هیچ مقاله‌ای یافت نشد. لطفاً جستجوی
                    دیگری را امتحان کنید.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 lg:mt-0 lg:col-span-4">
              <div className="sticky top-24">
                <BlogSidebar
                  posts={blogPosts}
                  categories={categories}
                  tags={tags}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
