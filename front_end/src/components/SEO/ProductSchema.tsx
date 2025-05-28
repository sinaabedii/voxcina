import React from 'react';

interface ProductSchemaProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  sku?: string;
  category?: string;
  ratingValue?: number;
  reviewCount?: number;
}

interface ProductSchemaType {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  image: string;
  sku: string;
  mpn: string;
  brand: {
    '@type': string;
    name: string;
  };
  offers: {
    '@type': string;
    url: string;
    priceCurrency: string;
    price: number;
    availability: string;
    seller: {
      '@type': string;
      name: string;
    };
  };
  category?: string;
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
  };
}

const ProductSchema: React.FC<ProductSchemaProps> = ({
  id,
  name,
  description,
  imageUrl,
  price,
  currency = 'IRR',
  availability = 'InStock',
  brand = 'وکسینا',
  sku,
  category,
  ratingValue,
  reviewCount,
}) => {
  const productSchema: ProductSchemaType = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: imageUrl.startsWith('http') ? imageUrl : `https://voxcina.com${imageUrl}`,
    sku: sku || id,
    mpn: id,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    offers: {
      '@type': 'Offer',
      url: `https://voxcina.com/products/${id}`,
      priceCurrency: currency,
      price: price,
      availability: `https://schema.org/${availability}`,
      seller: {
        '@type': 'Organization',
        name: 'وکسینا',
      },
    },
  };

  // اضافه کردن دسته‌بندی اگر موجود باشد
  if (category) {
    productSchema.category = category;
  }

  // اضافه کردن امتیازات و نظرات اگر موجود باشند
  if (ratingValue && reviewCount) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
  );
};

export default ProductSchema; 