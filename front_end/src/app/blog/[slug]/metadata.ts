import { Metadata } from 'next';
import { blogPosts, getBlogPostBySlug } from '@/data/blog';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'مقاله یافت نشد | وکسینا',
      description: 'متأسفانه مقاله مورد نظر یافت نشد.',
    };
  }

  return {
    title: `${post.title} | وکسینا`,
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
  };
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
} 