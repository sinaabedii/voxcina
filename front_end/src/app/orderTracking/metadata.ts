import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'پیگیری سفارش',
  description: `پیگیری وضعیت سفارش در فروشگاه آنلاین وکسینا. با وارد کردن کد پیگیری یا شماره موبایل، از وضعیت سفارش خود مطلع شوید.`,
  keywords: [
    'پیگیری سفارش',
    'وضعیت سفارش',
    'کد پیگیری',
    'ردیابی سفارش',
    'وکسینا',
  ],
  openGraph: {
    title: `پیگیری سفارش | ${APP_NAME}`,
    description: `پیگیری وضعیت سفارش در فروشگاه آنلاین وکسینا. با وارد کردن کد پیگیری یا شماره موبایل، از وضعیت سفارش خود مطلع شوید.`,
    type: 'website',
    locale: 'fa_IR',
    images: [
      {
        url: '/images/Logo/WXTransparent-org.png',
        width: 1200,
        height: 630,
        alt: 'پیگیری سفارش وکسینا',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `پیگیری سفارش | ${APP_NAME}`,
    description: `پیگیری وضعیت سفارش در فروشگاه آنلاین وکسینا.`,
    images: ['/images/Logo/WXTransparent-org.png'],
  },
  alternates: {
    canonical: '/orderTracking',
    languages: {
      'fa': '/orderTracking',
      'fa-IR': '/orderTracking',
      'x-default': '/orderTracking',
    },
  },
};
