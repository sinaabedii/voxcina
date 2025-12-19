import { Product } from '@/types/product';

interface ProductJsonLdProps {
  product: Product;
  url: string;
  /** Average rating from reviews (optional, for SSR) */
  avgRating?: number;
  /** Total review count (optional, for SSR) */
  reviewCount?: number;
}

/**
 * JSON-LD Structured Data Component for Product Pages
 * 
 * This is a Server Component that renders structured data in the initial HTML.
 * Search engines can read this data without executing JavaScript.
 * 
 * Requirements: 1.2 - Include structured data (JSON-LD) in initial HTML response
 */
export default function ProductJsonLd({ product, url, avgRating, reviewCount: propReviewCount }: ProductJsonLdProps) {
  if (!product) return null;
  
  // محاسبه قیمت - use price directly since discountPrice doesn't exist
  const price = product.price;
  
  // وضعیت موجودی - check colorVariants for inventory
  const inStock = product.colorVariants?.some(cv => cv.sizes?.some(s => s.quantity > 0)) ?? false;
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  
  // امتیاز و تعداد نظرات - use props if provided, otherwise use product fields or defaults
  const ratingValue = avgRating ?? product.average_rating ?? 0;
  const reviewCount = propReviewCount ?? product.review_count ?? 0;
  
  // نوع محصول - use category_ids instead of categories
  const productCategory = product.category_ids?.[0] || 'پوشاک';
  
  // تصاویر محصول - use mainImages or first colorVariant images
  const images = product.mainImages || 
    (product.colorVariants?.[0]?.images) || 
    [];
  
  // ساخت داده ساختاریافته
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: images,
    description: product.description,
    sku: product.id, // use id instead of sku
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'IRR',
      price: price * 10, // تبدیل تومان به ریال
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // use a fixed date since saleEndDate doesn't exist
      itemCondition: 'https://schema.org/NewCondition',
      availability,
      seller: {
        '@type': 'Organization',
        name: 'وکسینا',
      },
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue,
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
} 