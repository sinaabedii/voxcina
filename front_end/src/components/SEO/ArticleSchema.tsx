import React from 'react';

/**
 * Props for the ArticleSchema component
 */
interface ArticleSchemaProps {
  /** Article title */
  title: string;
  /** Article description/excerpt */
  description: string;
  /** URL of the article's cover image */
  imageUrl: string;
  /** Author name */
  authorName: string;
  /** Author avatar URL (optional) */
  authorAvatar?: string;
  /** ISO date string of publication */
  publishedAt: string;
  /** ISO date string of last modification (optional) */
  modifiedAt?: string;
  /** Article slug for URL generation */
  slug: string;
  /** Article category */
  category?: string;
  /** Article tags/keywords */
  tags?: string[];
  /** Estimated read time in minutes */
  readTime?: number;
}

/**
 * JSON-LD structured data type for Article schema
 */
interface ArticleSchemaType {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  image: string;
  author: {
    '@type': string;
    name: string;
    image?: string;
  };
  publisher: {
    '@type': string;
    name: string;
    logo: {
      '@type': string;
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  inLanguage: string;
  mainEntityOfPage: {
    '@type': string;
    '@id': string;
  };
  articleSection?: string;
  keywords?: string;
  wordCount?: number;
}

/**
 * ArticleSchema Component
 * 
 * Renders JSON-LD structured data for blog articles to improve SEO.
 * Follows schema.org Article specification.
 * 
 * Requirements: 4.2
 * 
 * @example
 * <ArticleSchema
 *   title="راهنمای خرید کفش"
 *   description="نکات مهم برای انتخاب کفش مناسب"
 *   imageUrl="/images/blog/shoes-guide.jpg"
 *   authorName="تیم وکسینا"
 *   publishedAt="2024-01-15T10:00:00Z"
 *   slug="shoes-buying-guide"
 *   category="راهنمای خرید"
 *   tags={['کفش', 'راهنما', 'خرید']}
 * />
 */
const ArticleSchema: React.FC<ArticleSchemaProps> = ({
  title,
  description,
  imageUrl,
  authorName,
  authorAvatar,
  publishedAt,
  modifiedAt,
  slug,
  category,
  tags,
  readTime,
}) => {
  // Ensure image URL is absolute
  const absoluteImageUrl = imageUrl.startsWith('http') 
    ? imageUrl 
    : `https://voxcina.com${imageUrl}`;

  // Ensure author avatar URL is absolute if provided
  const absoluteAuthorAvatar = authorAvatar 
    ? (authorAvatar.startsWith('http') ? authorAvatar : `https://voxcina.com${authorAvatar}`)
    : undefined;

  // Calculate approximate word count from read time (assuming 200 words per minute)
  const wordCount = readTime ? readTime * 200 : undefined;

  const articleSchema: ArticleSchemaType = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description,
    image: absoluteImageUrl,
    author: {
      '@type': 'Person',
      name: authorName,
      ...(absoluteAuthorAvatar && { image: absoluteAuthorAvatar }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'وکسینا',
      logo: {
        '@type': 'ImageObject',
        url: 'https://voxcina.com/images/Logo/BlueXTransparent.png',
      },
    },
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    inLanguage: 'fa-IR',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://voxcina.com/blog/${slug}`,
    },
  };

  // Add optional fields if provided
  if (category) {
    articleSchema.articleSection = category;
  }

  if (tags && tags.length > 0) {
    articleSchema.keywords = tags.join(', ');
  }

  if (wordCount) {
    articleSchema.wordCount = wordCount;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
    />
  );
};

export default ArticleSchema;
