import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export async function generateMetadata({ params }: { params: { categorySlug: string } }): Promise<Metadata> {
  try {
    // دریافت اطلاعات دسته‌بندی از API
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories/${params.categorySlug}`);
    
    if (!res.ok) {
      return {
        title: `دسته‌بندی یافت نشد | ${APP_NAME}`,
        description: 'متأسفانه دسته‌بندی مورد نظر یافت نشد.',
      };
    }

    const category = await res.json();
    
    // متادیتای بهینه شده برای سئو
    return {
      title: `${category.name} | ${APP_NAME}`,
      description: category.description || `خرید آنلاین محصولات دسته‌بندی ${category.name} با بهترین قیمت و کیفیت از فروشگاه آنلاین ${APP_NAME}`,
      keywords: [
        category.name,
        'خرید آنلاین',
        'فروشگاه اینترنتی',
        'وکسینا',
        ...category.keywords || [],
      ],
      openGraph: {
        title: `${category.name} | ${APP_NAME}`,
        description: category.description || `خرید آنلاین محصولات دسته‌بندی ${category.name} از فروشگاه ${APP_NAME}`,
        images: [
          {
            url: category.image || '/images/categories/placeholder.jpg',
            width: 1200,
            height: 630,
            alt: category.name,
          },
        ],
        locale: 'fa_IR',
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating category metadata:', error);
    return {
      title: `دسته‌بندی‌ها | ${APP_NAME}`,
      description: `مشاهده و خرید محصولات با کیفیت از فروشگاه آنلاین ${APP_NAME}`,
    };
  }
} 