import { Product, Review } from '@/types/product';

interface ProductJsonLdProps {
  product: Product;
  url: string;
  /** Average rating from reviews (optional, for SSR) */
  avgRating?: number;
  /** Total review count (optional, for SSR) */
  reviewCount?: number;
  /** Approved reviews fetched during server rendering */
  reviews?: Review[];
}

type ApiReview = Review & {
  user_name?: string;
  created_at?: string;
};

const SITE_URL = "https://voxcina.com";

function absoluteUrl(value: string): string {
  return value.startsWith("http") ? value : `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

/**
 * JSON-LD Structured Data Component for Product Pages
 * 
 * This is a Server Component that renders structured data in the initial HTML.
 * Search engines can read this data without executing JavaScript.
 * 
 * Requirements: 1.2 - Include structured data (JSON-LD) in initial HTML response
 */
export default function ProductJsonLd({
  product,
  url,
  avgRating,
  reviewCount: propReviewCount,
  reviews = [],
}: ProductJsonLdProps) {
  if (!product) return null;
  
  // محاسبه قیمت - use price directly since discountPrice doesn't exist
  const price = product.price;
  
  // وضعیت موجودی - check colorVariants for inventory
  const inStock = product.colorVariants?.some(cv => cv.sizes?.some(s => s.quantity > 0)) ?? false;
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  
  // Keep structured data aligned with the approved reviews shown on the page.
  const ratingValue = avgRating ?? product.average_rating ?? 0;
  const reviewCount = propReviewCount ?? product.review_count ?? 0;
  const brandName = product.brand?.trim() || "وکسینا";
  const description = product.description?.trim() ||
    `${product.name} از برند ${brandName} برای خرید آنلاین از فروشگاه وکسینا.`;

  const reviewSchema = reviews
    .map((review) => {
      const apiReview = review as ApiReview;
      const authorName = review.userName?.trim() || apiReview.user_name?.trim();
      const reviewBody = review.comment?.trim();
      const datePublished = review.date || apiReview.created_at;

      if (!authorName || !reviewBody || !datePublished || review.rating < 1 || review.rating > 5) {
        return null;
      }

      return {
        '@type': 'Review',
        reviewBody,
        datePublished,
        author: {
          '@type': 'Person',
          name: authorName,
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1,
        },
      };
    })
    .filter((review): review is NonNullable<typeof review> => review !== null)
    .slice(0, 5);
  
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
    image: images.map(absoluteUrl),
    description,
    sku: product.id, // use id instead of sku
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(url),
      priceCurrency: 'IRR',
      price: price * 10, // تبدیل تومان به ریال
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // use a fixed date since saleEndDate doesn't exist
      itemCondition: 'https://schema.org/NewCondition',
      availability,
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        customerRemorseReturnFees: 'https://schema.org/ReturnShippingFees',
        itemDefectReturnFees: 'https://schema.org/FreeReturn',
        merchantReturnLink: `${SITE_URL}/returns`,
      },
      seller: {
        '@type': 'Organization',
        name: 'وکسینا',
      },
    },
    ...(reviewSchema.length > 0 && { review: reviewSchema }),
    ...(reviewCount > 0 && ratingValue > 0 && {
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
