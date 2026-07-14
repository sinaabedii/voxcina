import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BlogPostClientContent from '@/components/blog/BlogPostClientContent';
import ArticleSchema from '@/components/SEO/ArticleSchema';
import BreadcrumbSchema from '@/components/SEO/BreadcrumbSchema';
import { BlogPost } from '@/types/blog';
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
        imageUrl={post.coverImage || '/images/blog/placeholder.jpg'}
        authorName={post.authorSnapshot?.name || 'تیم وکسینا'}
        authorAvatar={post.authorSnapshot?.avatar}
        publishedAt={post.publishedAt}
        slug={post.slug}
        category={post.category}
        tags={post.tags}
        readTime={post.readTime}
      />

      {/* BreadcrumbList JSON-LD schema for SEO */}
      <BreadcrumbSchema items={breadcrumbItems} />

      <Header />
      <BlogPostClientContent post={post} />
      <Footer />
    </>
  );
}
