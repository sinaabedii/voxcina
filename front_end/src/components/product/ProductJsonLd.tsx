import { Product } from '@/types/product';

interface ProductJsonLdProps {
  product: Product;
  url: string;
}

// کامپوننت برای افزودن نشانه‌گذاری ساختاریافته محصول
export default function ProductJsonLd({ product, url }: ProductJsonLdProps) {
  if (!product) return null;
  
  // محاسبه قیمت - use price directly since discountPrice doesn't exist
  const price = product.price;
  
  // وضعیت موجودی
  const inStock = product.variants.some(v => v.quantity > 0);
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  
  // امتیاز و تعداد نظرات - ratings property doesn't exist, use default values
  const ratingValue = 0;
  const reviewCount = 0;
  
  // نوع محصول - use category_ids instead of categories
  const productCategory = product.category_ids?.[0] || 'پوشاک';
  
  // تصاویر محصول
  const images = product.images || [];
  
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