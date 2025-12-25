import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "درباره ما",
  description:
    "با وکسینا آشنا شوید - فروشگاه آنلاین پوشاک و مد با بیش از ۵۰۰۰ محصول با کیفیت. داستان ما، ماموریت و چشم‌انداز آینده.",
  keywords: [
    "درباره وکسینا",
    "فروشگاه آنلاین پوشاک",
    "تاریخچه وکسینا",
    "تیم وکسینا",
    "ماموریت وکسینا",
  ],
  openGraph: {
    title: "درباره ما | وکسینا",
    description:
      "با وکسینا آشنا شوید - فروشگاه آنلاین پوشاک و مد با بیش از ۵۰۰۰ محصول با کیفیت.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/images/Logo/WXTransparent-org.png",
        width: 1200,
        height: 630,
        alt: "درباره وکسینا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "درباره ما | وکسینا",
    description:
      "با وکسینا آشنا شوید - فروشگاه آنلاین پوشاک و مد با بیش از ۵۰۰۰ محصول با کیفیت.",
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  alternates: {
    canonical: "/about",
    languages: {
      'fa-IR': '/about',
      'x-default': '/about',
    },
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
