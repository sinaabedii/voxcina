import React from 'react';

/**
 * Item for ItemList schema generation
 */
export interface ItemListItem {
  /** Product/item name */
  name: string;
  /** URL to the item page */
  url: string;
  /** Image URL */
  image?: string;
}

interface ItemListSchemaProps {
  /** Name of the list (e.g., category name) */
  listName: string;
  /** Description of the list */
  description?: string;
  /** Array of items in the list */
  items: ItemListItem[];
  /** URL of the list page */
  listUrl: string;
}

/**
 * JSON-LD structured data type for ItemList schema
 */
interface ItemListSchemaType {
  '@context': string;
  '@type': string;
  name: string;
  description?: string;
  url: string;
  numberOfItems: number;
  itemListElement: {
    '@type': string;
    position: number;
    name: string;
    url: string;
    image?: string;
  }[];
}

/**
 * ItemListSchema Component
 * 
 * Renders JSON-LD structured data for product links in listing pages.
 * Follows schema.org ItemList specification.
 * 
 * SEO: ItemList schema helps search engines understand product collections
 * and can enable rich snippets in search results.
 * 
 * @example
 * <ItemListSchema
 *   listName="لباس مردانه"
 *   description="مجموعه لباس‌های مردانه وکسینا"
 *   listUrl="https://voxcina.com/categories/men"
 *   items={[
 *     { name: 'پیراهن مردانه', url: '/products/123' },
 *     { name: 'شلوار جین', url: '/products/456' },
 *   ]}
 * />
 */
const ItemListSchema: React.FC<ItemListSchemaProps> = ({
  listName,
  description,
  items,
  listUrl,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  // Limit to first 10 items for schema (Google recommendation)
  const schemaItems = items.slice(0, 10);

  const itemListSchema: ItemListSchemaType = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: listUrl.startsWith('http') ? listUrl : `https://voxcina.com${listUrl}`,
    numberOfItems: items.length,
    itemListElement: schemaItems.map((item, index) => {
      const itemData: ItemListSchemaType['itemListElement'][0] = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `https://voxcina.com${item.url}`,
      };

      // Add image if available
      if (item.image) {
        itemData.image = item.image.startsWith('http')
          ? item.image
          : `https://voxcina.com${item.image}`;
      }

      return itemData;
    }),
  };

  // Add description if provided
  if (description) {
    itemListSchema.description = description;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
    />
  );
};

export default ItemListSchema;
