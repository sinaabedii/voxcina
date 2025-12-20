import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `راهنمای خرید | ${APP_NAME}`,
  description: `راهنمای کامل خرید از فروشگاه آنلاین وکسینا. مراحل ثبت‌نام، جستجوی محصول، سبد خرید، پرداخت و تحویل سفارش.`,
  keywords: [
    'راهنمای خرید',
    'نحوه خرید',
    'آموزش خرید آنلاین',
    'ثبت سفارش',
    'پرداخت آنلاین',
    'وکسینا',
  ],
  openGraph: {
    title: `راهنمای خرید | ${APP_NAME}`,
    description: `راهنمای کامل خرید از فروشگاه آنلاین وکسینا. مراحل ثبت‌نام، جستجوی محصول، سبد خرید، پرداخت و تحویل سفارش.`,
    type: 'website',
    locale: 'fa_IR',
    images: [
      {
        url: '/images/Logo/WXTransparent-org.png',
        width: 1200,
        height: 630,
        alt: 'راهنمای خرید وکسینا',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `راهنمای خرید | ${APP_NAME}`,
    description: `راهنمای کامل خرید از فروشگاه آنلاین وکسینا.`,
    images: ['/images/Logo/WXTransparent-org.png'],
  },
  alternates: {
    canonical: '/shoppingGuide',
    languages: {
      'fa': '/shoppingGuide',
      'fa-IR': '/shoppingGuide',
      'x-default': '/shoppingGuide',
    },
  },
};
