import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'همکاری با ما',
  description: `فرصت‌های همکاری با وکسینا - تأمین‌کنندگان، شرکای تجاری و فرصت‌های شغلی. با ما همراه شوید و در رشد کسب‌وکار خود سهیم باشید.`,
  keywords: [
    'همکاری با وکسینا',
    'فرصت شغلی',
    'تأمین‌کننده',
    'شریک تجاری',
    'استخدام',
    'وکسینا',
  ],
  openGraph: {
    title: `همکاری با ما | ${APP_NAME}`,
    description: `فرصت‌های همکاری با وکسینا - تأمین‌کنندگان، شرکای تجاری و فرصت‌های شغلی.`,
    type: 'website',
    locale: 'fa_IR',
    images: [
      {
        url: '/images/Logo/WXTransparent-org.png',
        width: 1200,
        height: 630,
        alt: 'همکاری با وکسینا',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `همکاری با ما | ${APP_NAME}`,
    description: `فرصت‌های همکاری با وکسینا - تأمین‌کنندگان، شرکای تجاری و فرصت‌های شغلی.`,
    images: ['/images/Logo/WXTransparent-org.png'],
  },
  alternates: {
    canonical: '/careers',
    languages: {
      'fa-IR': '/careers',
      'x-default': '/careers',
    },
  },
};
