import { Metadata } from 'next';
import { BlogPost } from '@/types/blog';
import { serverFetch, serverFetchWithFallback, CACHE_TIMES } from '@/lib/server-api';

/**
 * Generate metadata for blog post pages
 * Uses server-side fetch with absolute URLs for Docker compatibility
 * Requirements: 4.4, 6.1
 */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await serverFetch<BlogPost>(`/api/blog-posts/${params.slug}`, {
    revalidate: CACHE_TIMES.BLOG_POST,
    tags: ['blog', `blog-${params.slug}`],
  });

  if (!post) {
    return {
      title: 'مقاله یافت نشد',
      description: 'متأسفانه مقاله مورد نظر یافت نشد.',
    };
  }

  const canonicalPath = `/blog/${params.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: post.coverImage || '/images/blog/placeholder.jpg',
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    alternates: {
      canonical: canonicalPath,
      languages: {
        'fa': canonicalPath,
        'fa-IR': canonicalPath,
        'x-default': canonicalPath,
      },
    },
  };
}

/**
 * Generate static params for blog posts
 * Uses server-side fetch with absolute URLs for Docker compatibility
 * Requirements: 4.4, 6.1
 */
export async function generateStaticParams() {
  const response = await serverFetchWithFallback<{ data: BlogPost[] } | BlogPost[]>(
    '/api/blog-posts',
    { data: [] },
    { revalidate: CACHE_TIMES.BLOG_POST, tags: ['blog'] }
  );
  
  const posts = Array.isArray(response) ? response : response.data || [];
  return posts.map((post) => ({ slug: post.slug }));
} 