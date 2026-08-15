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
    
    // Canonical path for this product
    const canonicalPath = `/products/${params.productId}`;

    // Shared by openGraph and twitter so the two cards can't drift apart.
    const socialDescription = product.description?.substring(0, 160) || `خرید ${product.name} با قیمت ${formattedPrice} تومان`;

    // NOTE: no `images` key on openGraph/twitter below, deliberately.
    //
    // `opengraph-image.tsx` in this folder renders a real 1200x630 branded card
    // (product photo, price, discount badge). Next only applies that file
    // convention when metadata does not set the images itself — an explicit
    // `openGraph.images` silently overrides it. This page used to point
    // og:image straight at the raw upload while declaring it 1200x630, so the
    // generated card never shipped and the dimensions described a file that was
    // whatever shape the photographer uploaded (a sampled product image is
    // 1600x1200). Leaving images unset hands both cards back to the generator,
    // which is correctly sized by construction.
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
        description: socialDescription,
        // Page-level openGraph replaces the root layout's object rather than
        // merging into it, so siteName has to be restated here or og:site_name
        // disappears from product pages.
        siteName: APP_NAME,
        locale: 'fa_IR',
        type: 'website',
      },
      // Twitter is resolved independently of openGraph — without this block the
      // page inherits the root layout's card and shares as the site logo and
      // homepage title instead of the product.
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: socialDescription,
      },
      alternates: {
        canonical: canonicalPath,
        languages: {
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
