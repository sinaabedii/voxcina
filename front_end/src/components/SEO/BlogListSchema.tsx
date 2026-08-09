import React from 'react';
import type { BlogPost } from '@/types/blog';

interface BlogListSchemaProps {
  posts: BlogPost[];
  page: number;
  limit: number;
  total: number;
  canonicalPath: string;
}

/** Describes the public blog index and its article links to crawlers. */
export default function BlogListSchema({
  posts,
  page,
  limit,
  total,
  canonicalPath,
}: BlogListSchemaProps) {
  if (posts.length === 0) return null;

  const baseUrl = 'https://voxcina.com';
  const absoluteImageUrl = (image: string) =>
    image.startsWith('http')
      ? image
      : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'بلاگ وکسینا | مقالات و راهنمای مد و پوشاک',
    description: 'مقالات آموزشی و راهنمای خرید در زمینه مد و پوشاک، ترندهای روز و نگهداری لباس.',
    url: `${baseUrl}${canonicalPath}`,
    inLanguage: 'fa-IR',
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: total || posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: (page - 1) * limit + index + 1,
        name: post.title,
        url: `${baseUrl}/blog/${post.slug}`,
        ...(post.coverImage || post.coverImageId
          ? { image: absoluteImageUrl(post.coverImage || post.coverImageId || '') }
          : {}),
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
