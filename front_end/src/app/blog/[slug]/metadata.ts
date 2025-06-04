import { Metadata } from 'next';
import { BlogPost } from '@/types/blog';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const res = await fetch(`/api/blog-posts/${params.slug}`);

  if (!res.ok) {
    return {
      title: 'مقاله یافت نشد | وکسینا',
      description: 'متأسفانه مقاله مورد نظر یافت نشد.',
    };
  }

  const post: BlogPost = await res.json();

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
  const res = await fetch('/api/blog-posts');
  if (!res.ok) return [];
  const json = await res.json();
  const posts: BlogPost[] = Array.isArray(json) ? json : json.data;
  return posts.map((post) => ({ slug: post.slug }));
} 