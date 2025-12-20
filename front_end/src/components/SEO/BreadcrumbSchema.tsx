import React from 'react';

/**
 * Breadcrumb item for schema generation
 */
export interface BreadcrumbItem {
  /** Display name of the breadcrumb */
  name: string;
  /** URL path for the breadcrumb */
  url: string;
}

interface BreadcrumbSchemaProps {
  /** Array of breadcrumb items in order from root to current page */
  items: BreadcrumbItem[];
}

/**
 * JSON-LD structured data type for BreadcrumbList schema
 */
interface BreadcrumbListSchemaType {
  '@context': string;
  '@type': string;
  itemListElement: {
    '@type': string;
    position: number;
    name: string;
    item: string;
  }[];
}

/**
 * BreadcrumbSchema Component
 * 
 * Renders JSON-LD structured data for breadcrumb navigation to improve SEO.
 * Follows schema.org BreadcrumbList specification.
 * 
 * SEO: Breadcrumb schema improves search result appearance and helps
 * search engines understand site hierarchy.
 * 
 * @example
 * <BreadcrumbSchema
 *   items={[
 *     { name: 'خانه', url: 'https://voxcina.com/' },
 *     { name: 'برندها', url: 'https://voxcina.com/brands' },
 *     { name: 'نایک', url: 'https://voxcina.com/brands/nike' },
 *   ]}
 * />
 */
const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return null;
  }

  const breadcrumbSchema: BreadcrumbListSchemaType = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `https://voxcina.com${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
  );
};

export default BreadcrumbSchema;
