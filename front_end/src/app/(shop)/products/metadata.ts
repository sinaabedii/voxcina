import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `محصولات | ${APP_NAME}`,
  description: `مشاهده و خرید آنلاین جدیدترین محصولات با کیفیت از فروشگاه اینترنتی ${APP_NAME}. تنوع بالا، قیمت مناسب و ارسال سریع به سراسر کشور.`,
  keywords: [
    'خرید آنلاین',
    'فروشگاه اینترنتی',
    'وکسینا',
    'محصولات',
    'لباس',
    'پوشاک',
    'مد روز',
    'تخفیف',
    'حراج',
  ],
  openGraph: {
    title: `محصولات | ${APP_NAME}`,
    description: `مشاهده و خرید آنلاین جدیدترین محصولات با کیفیت از فروشگاه اینترنتی ${APP_NAME}`,
    images: [
      {
        url: '/images/products/header.jpg',
        width: 1200,
        height: 630,
        alt: `محصولات ${APP_NAME}`,
      },
    ],
    locale: 'fa_IR',
    type: 'website',
  },
  alternates: {
    canonical: '/products',
    languages: {
      'fa': '/products',
      'fa-IR': '/products',
      'x-default': '/products',
    },
  },
}; 