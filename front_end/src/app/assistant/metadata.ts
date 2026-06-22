import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'دستیار هوشمند',
  description: `دستیار هوشمند وکسینا - پاسخگویی به سوالات شما درباره محصولات، سفارشات و خدمات فروشگاه با استفاده از هوش مصنوعی.`,
  keywords: [
    'دستیار هوشمند',
    'چت‌بات',
    'پشتیبانی آنلاین',
    'هوش مصنوعی',
    'وکسینا',
  ],
  openGraph: {
    title: `دستیار هوشمند | ${APP_NAME}`,
    description: `دستیار هوشمند وکسینا - پاسخگویی به سوالات شما با استفاده از هوش مصنوعی.`,
    type: 'website',
    locale: 'fa_IR',
    images: [
      {
        url: '/images/Logo/WXTransparent-org.png',
        width: 1200,
        height: 630,
        alt: 'دستیار هوشمند وکسینا',
      },
    ],
  },
  alternates: {
    canonical: '/assistant',
    languages: {
      'fa-IR': '/assistant',
      'x-default': '/assistant',
    },
  },
};
