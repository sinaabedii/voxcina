import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
  try {
    // استفاده از API برای دریافت اطلاعات محصول
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/products/${params.productId}`);
    
    if (!res.ok) {
      return {
        title: `محصول یافت نشد | ${APP_NAME}`,
        description: 'متأسفانه محصول مورد نظر یافت نشد.',
      };
    }

    const product = await res.json();
    
    // قیمت با تخفیف یا قیمت اصلی
    const price = product.discountPrice || product.price;
    const formattedPrice = new Intl.NumberFormat('fa-IR').format(price);
    
    // ساخت متادیتای بهینه شده برای سئو
    return {
      title: `${product.name} | ${APP_NAME}`,
      description: product.description?.substring(0, 160) || `خرید ${product.name} با بهترین قیمت و کیفیت از فروشگاه آنلاین ${APP_NAME}`,
      keywords: [
        product.name,
        product.brand,
        ...product.categories,
        ...product.tags || [],
        'خرید آنلاین',
        'فروشگاه اینترنتی',
        'وکسینا'
      ],
      openGraph: {
        title: product.name,
        description: product.description?.substring(0, 160) || `خرید ${product.name} با قیمت ${formattedPrice} تومان`,
        images: [
          {
            url: product.images?.[0] || '/images/products/placeholder.jpg',
            width: 1200,
            height: 630,
            alt: product.name,
          },
        ],
        locale: 'fa_IR',
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: `محصولات | ${APP_NAME}`,
      description: `مشاهده و خرید محصولات با کیفیت از فروشگاه آنلاین ${APP_NAME}`,
    };
  }
} 