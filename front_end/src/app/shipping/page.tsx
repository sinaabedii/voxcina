import type { Metadata } from "next";
import ShippingClient from "./ShippingClient";

export const metadata: Metadata = {
  title: "روش‌های ارسال",
  description:
    "اطلاعات کامل درباره روش‌های ارسال سفارش در وکسینا. ارسال سریع ۲۴ ساعته، ارسال عادی ۲ تا ۴ روز کاری و تحویل حضوری رایگان.",
  keywords: [
    "ارسال سفارش وکسینا",
    "روش‌های ارسال",
    "هزینه ارسال",
    "ارسال سریع",
    "تحویل حضوری",
    "پیگیری سفارش",
  ],
  openGraph: {
    title: "روش‌های ارسال | وکسینا",
    description:
      "اطلاعات کامل درباره روش‌های ارسال سفارش در وکسینا. ارسال سریع، عادی و تحویل حضوری.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/images/Logo/WXTransparent-org.png",
        width: 1200,
        height: 630,
        alt: "روش‌های ارسال وکسینا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "روش‌های ارسال | وکسینا",
    description:
      "اطلاعات کامل درباره روش‌های ارسال سفارش در وکسینا. ارسال سریع، عادی و تحویل حضوری.",
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  alternates: {
    canonical: "/shipping",
    languages: {
      'fa-IR': '/shipping',
      'x-default': '/shipping',
    },
  },
};

export default function ShippingPage() {
  return <ShippingClient />;
}
