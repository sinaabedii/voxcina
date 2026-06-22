'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '@/store/blog-store';
import BlogCard from './BlogCard';
import BlogCategories from './BlogCategories';
import BlogSearch from './BlogSearch';
import BlogSidebar from './BlogSidebar';
import { BlogPost } from '@/types/blog';

interface BlogClientContentProps {
  /** Initial posts fetched on the server for SSR */
  initialPosts?: BlogPost[];
  /** Initial categories extracted from posts */
  initialCategories?: string[];
  /** Initial tags extracted from posts */
  initialTags?: string[];
}

/**
 * Blog Client Content Component
 * 
 * Handles interactive filtering and search for blog posts.
 * Receives initial data from server for SSR, then hydrates for client-side interactions.
 * Requirements: 4.3, 5.3
 */
export default function BlogClientContent({
  initialPosts = [],
  initialCategories = [],
  initialTags = [],
}: BlogClientContentProps) {
  const searchParams = useSearchParams();
  const {
    posts: storePosts,
    categories: storeCategories,
    tags: storeTags,
    fetchPosts,
  } = useBlogStore();

  // Use server-provided data initially, fall back to store data
  const blogPosts = initialPosts.length > 0 ? initialPosts : storePosts;
  const categories = initialCategories.length > 0 ? initialCategories : storeCategories;
  const tags = initialTags.length > 0 ? initialTags : storeTags;

  const [filteredPosts, setFilteredPosts] = useState(blogPosts);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Sync store with initial data if store is empty
  useEffect(() => {
    if (storePosts.length === 0 && initialPosts.length === 0) {
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update filtered posts when blogPosts changes (for initial render)
  useEffect(() => {
    setFilteredPosts(blogPosts);
  }, [blogPosts]);

  // Filter posts based on category, tag, and search term
  useEffect(() => {
    let result = [...blogPosts];

    const categoryParam = searchParams.get('category');
    const tagParam = searchParams.get('tag');
    const searchParam = searchParams.get('search');

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
          post.tags.some((tag) => tag.toLowerCase().includes(term.toLowerCase()))
      );
    }

    setFilteredPosts(result);
  }, [searchParams, selectedCategory, searchTerm, blogPosts]);

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <>
      <div className="mx-auto max-w-3xl mb-8">
        <BlogSearch onSearch={handleSearch} />
      </div>

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
            <BlogSidebar posts={blogPosts} categories={categories} tags={tags} />
          </div>
        </div>
      </div>
    </>
  );
} 