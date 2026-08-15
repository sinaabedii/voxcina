import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "تماس با ما",
  description:
    "با تیم وکسینا در ارتباط باشید. آدرس: تهران، پاسداران بوستان پنجم کوی گلشن پلاک ۱۴. تلفن: 021-22325653. ایمیل: info@voxcina.com",
  keywords: [
    "تماس با وکسینا",
    "آدرس وکسینا",
    "شماره تماس وکسینا",
    "پشتیبانی وکسینا",
    "ایمیل وکسینا",
  ],
  openGraph: {
    title: "تماس با ما | وکسینا",
    description:
      "با تیم وکسینا در ارتباط باشید. آدرس، تلفن و ایمیل برای پشتیبانی و سوالات شما.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/images/Logo/WXTransparent-org.png",
        width: 1200,
        height: 630,
        alt: "تماس با وکسینا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "تماس با ما | وکسینا",
    description:
      "با تیم وکسینا در ارتباط باشید. آدرس، تلفن و ایمیل برای پشتیبانی و سوالات شما.",
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  alternates: {
    canonical: "/contact",
    languages: {
      'fa-IR': '/contact',
      'x-default': '/contact',
    },
  },
};

// LocalBusiness JSON-LD structured data
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "وکسینا",
  alternateName: ["ووکسینا", "Voxcina"],
  description: "فروشگاه آنلاین پوشاک و مد با بیش از ۵۰۰۰ محصول با کیفیت",
  url: "https://voxcina.com",
  logo: "https://voxcina.com/images/Logo/WXTransparent-org.png",
  image: "https://voxcina.com/images/Logo/WXTransparent-org.png",
  telephone: "+982122325653",
  email: "info@voxcina.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "پاسداران بوستان پنجم کوی گلشن پلاک ۱۴",
    addressLocality: "تهران",
    addressCountry: "IR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 35.762843063507674,
    longitude: 51.46413943689942,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
      opens: "09:00",
      closes: "17:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Thursday",
      opens: "09:00",
      closes: "13:00",
    },
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+982122325653",
      contactType: "customer service",
      availableLanguage: ["Persian", "English"],
    },
    {
      "@type": "ContactPoint",
      email: "support@voxcina.com",
      contactType: "technical support",
      availableLanguage: ["Persian", "English"],
    },
  ],
  sameAs: [
    "https://www.instagram.com/voxcina",
    "https://x.com/voxcina",
  ],
  priceRange: "$$",
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <ContactClient />
    </>
  );
}
