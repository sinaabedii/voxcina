import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'همکاری با ما',
  description: `فرصت‌های شغلی و همکاری تجاری وکسینا. موقعیت‌های شغلی باز را ببینید، رزومه PDF خود را ارسال کنید یا درخواست همکاری تجاری ثبت کنید.`,
  keywords: [
    'همکاری با وکسینا',
    'فرصت شغلی',
    'تأمین‌کننده',
    'شریک تجاری',
    'استخدام',
    'ارسال رزومه',
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
