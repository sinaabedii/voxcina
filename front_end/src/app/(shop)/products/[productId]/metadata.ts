import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';
import { serverFetch, CACHE_TIMES } from '@/lib/server-api';
import { Product } from '@/types/product';

/**
 * Generate metadata for product detail pages using server-side data fetching.
 * Uses GO_BACKEND_URL for Docker internal networking.
 * 
 * Requirements: 1.1, 1.3, 6.1, 6.3
 */
export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
  try {
    // Fetch product using server-side utility with ISR caching
    const product = await serverFetch<Product>(`/api/products/${params.productId}`, {
      revalidate: CACHE_TIMES.PRODUCT_DETAIL,
      tags: ['product', `product-${params.productId}`]
    });
    
    if (!product) {
      return {
        title: 'محصول یافت نشد',
        description: 'متأسفانه محصول مورد نظر یافت نشد.',
      };
    }
    
    // Format price for display
    const formattedPrice = new Intl.NumberFormat('fa-IR').format(product.price);
    
    // Get product images
    const images = product.mainImages || product.colorVariants?.[0]?.images || [];
    
    // Canonical path for this product
    const canonicalPath = `/products/${params.productId}`;
    
    // Build SEO-optimized metadata
    return {
      title: product.name,
      description: product.description?.substring(0, 160) || `خرید ${product.name} با بهترین قیمت و کیفیت از فروشگاه آنلاین ${APP_NAME}`,
      keywords: [
        product.name,
        product.brand || '',
        'خرید آنلاین',
        'فروشگاه اینترنتی',
        'وکسینا'
      ].filter(Boolean),
      openGraph: {
        title: product.name,
        description: product.description?.substring(0, 160) || `خرید ${product.name} با قیمت ${formattedPrice} تومان`,
        images: images.length > 0 ? [
          {
            url: images[0],
            width: 1200,
            height: 630,
            alt: product.name,
          },
        ] : [],
        locale: 'fa_IR',
        type: 'website',
      },
      alternates: {
        canonical: canonicalPath,
        languages: {
          'fa': canonicalPath,
          'fa-IR': canonicalPath,
          'x-default': canonicalPath,
        },
      },
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: 'محصولات',
      description: `مشاهده و خرید محصولات با کیفیت از فروشگاه آنلاین ${APP_NAME}`,
    };
  }
}
