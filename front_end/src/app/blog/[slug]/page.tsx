import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { BlogPost, blogPosts, getBlogPostBySlug } from '@/data/blog';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BlogPostClientContent from '@/components/blog/BlogPostClientContent';

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // Extract all categories for sidebar
  const categories = Array.from(new Set(blogPosts.map((post) => post.category))).sort();

  // Extract all tags for sidebar
  const tags = Array.from(new Set(blogPosts.flatMap((post) => post.tags))).sort();

  return (
    <>
      <Header />
      <Suspense fallback={<BlogPostLoadingSkeleton />}>
        <BlogPostClientContent
          post={post}
          categories={categories}
          tags={tags}
        />
      </Suspense>
      <Footer />
    </>
  );
}

function BlogPostLoadingSkeleton() {
  return (
    <>
      <section className="bg-secondary-100 py-8 md:py-12 lg:py-16">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-3 h-6 w-40 bg-gray-200 animate-pulse rounded-md" />
            
            <div className="mb-3 md:mb-4 h-12 w-full bg-gray-200 animate-pulse rounded-md" />
            
            <div className="mb-4 md:mb-6 flex flex-wrap items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2 h-6 w-32 bg-gray-200 animate-pulse rounded-md" />
              <div className="flex items-center gap-1 h-6 w-24 bg-gray-200 animate-pulse rounded-md" />
              <div className="flex items-center gap-1 h-6 w-28 bg-gray-200 animate-pulse rounded-md" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8 lg:py-12">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <article className="overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-soft">
                <div className="relative h-[200px] sm:h-[300px] md:h-[400px] w-full bg-gray-200 animate-pulse" />
                
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-6 bg-gray-200 animate-pulse rounded-md" style={{width: `${Math.random() * 50 + 50}%`}} />
                    ))}
                  </div>
                  
                  <div className="mt-6 sm:mt-8 flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-6 w-16 bg-gray-200 animate-pulse rounded-full" />
                    ))}
                  </div>
                </div>
              </article>

              <div className="mt-8 md:mt-12 py-6 md:py-8 border-t border-gray-100">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-md mb-6" />
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-56 bg-gray-200 animate-pulse rounded-xl" />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 lg:mt-0 lg:col-span-4">
              <div className="space-y-6 md:space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl sm:rounded-2xl bg-gray-200 h-[200px] animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
