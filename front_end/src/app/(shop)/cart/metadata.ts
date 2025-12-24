import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: "سبد خرید",
  description: `مشاهده و مدیریت سبد خرید شما در فروشگاه آنلاین ${APP_NAME}. بررسی محصولات، اعمال کد تخفیف و ادامه فرآیند خرید.`,
  keywords: [
    'سبد خرید',
    'خرید آنلاین',
    'فروشگاه اینترنتی',
    'وکسینا',
    'تخفیف',
  ],
  openGraph: {
    title: `سبد خرید | ${APP_NAME}`,
    description: `مشاهده و مدیریت سبد خرید شما در فروشگاه آنلاین ${APP_NAME}`,
    locale: 'fa_IR',
    type: 'website',
  },
  alternates: {
    canonical: '/cart',
    languages: {
      'fa': '/cart',
      'fa-IR': '/cart',
      'x-default': '/cart',
    },
  },
  // Cart pages should not be indexed by search engines
  robots: {
    index: false,
    follow: true,
  },
};
