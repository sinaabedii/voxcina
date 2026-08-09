import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BlogPostClientContent from '@/components/blog/BlogPostClientContent';
import ArticleSchema from '@/components/SEO/ArticleSchema';
import BreadcrumbSchema from '@/components/SEO/BreadcrumbSchema';
import type { BlogCategory, BlogPost } from '@/types/blog';
import { serverFetch } from '@/lib/server-api';

interface BlogPostPageProps {
  params: { slug: string };
}

/**
 * Blog Post Detail Page - Server Component
 * 
 * Fetches blog post data on the server using absolute URLs for Docker compatibility.
 * Includes JSON-LD structured data for Article schema.
 */
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await serverFetch<BlogPost>(`/api/blog-posts/${params.slug}`, {
    revalidate: 3600,
    tags: ['blog', `blog-${params.slug}`],
  });

  if (!post) {
    return {
      title: 'مقاله یافت نشد',
      description: 'متأسفانه مقاله مورد نظر یافت نشد.',
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/blog/${post.slug}`;
  const authorName = post.authorSnapshot?.name || 'تیم وکسینا';
  const coverImage = post.coverImage || post.coverImageId || '/images/blog/placeholder.jpg';

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: authorName }],
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: canonicalPath,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      section: post.category,
      tags: post.tags,
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    alternates: {
      canonical: canonicalPath,
      languages: {
        'fa-IR': canonicalPath,
        'x-default': canonicalPath,
      },
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = params;

  // Fetch the blog post by slug using server-side fetch utility
  const post = await serverFetch<BlogPost>(`/api/blog-posts/${slug}`, {
    revalidate: 3600,
    tags: ['blog', `blog-${slug}`],
  });

  // Return 404 if post not found
  if (!post) {
    notFound();
  }

  // Fetch related posts (same category) server-side so the section and its
  // internal links are present in the initial SSR HTML, not only after a
  // client-side fetch.
  const [relatedResponse, categoryResponse] = await Promise.all([
    serverFetch<{ data: BlogPost[] } | BlogPost[]>(
      `/api/blog-posts?category=${encodeURIComponent(post.category)}&limit=4`,
      { revalidate: 3600, tags: ['blog', `blog-category-${post.category}`] }
    ),
    serverFetch<BlogCategory[]>('/api/blog/categories', {
      revalidate: 3600,
      tags: ['blog-categories'],
    }),
  ]);
  const relatedCandidates = Array.isArray(relatedResponse) ? relatedResponse : relatedResponse?.data || [];
  const relatedPosts = relatedCandidates.filter((p) => p.id !== post.id).slice(0, 3);
  const categories = (categoryResponse || []).map((category) => category.name);

  // Build breadcrumb items for JSON-LD schema (Home > Blog > Post)
  const breadcrumbItems = [
    { name: 'خانه', url: '/' },
    { name: 'بلاگ', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  return (
    <>
      {/* JSON-LD Structured Data for Article */}
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        imageUrl={post.coverImage || post.coverImageId || '/images/blog/placeholder.jpg'}
        authorName={post.authorSnapshot?.name || 'تیم وکسینا'}
        authorAvatar={post.authorSnapshot?.avatar}
        publishedAt={post.publishedAt}
        modifiedAt={post.updatedAt}
        slug={post.slug}
        category={post.category}
        tags={post.tags}
        readTime={post.readTime}
      />

      {/* BreadcrumbList JSON-LD schema for SEO */}
      <BreadcrumbSchema items={breadcrumbItems} />

      <Header />
      <BlogPostClientContent
        post={post}
        relatedPosts={relatedPosts}
        categories={categories}
      />
      <Footer />
    </>
  );
}
