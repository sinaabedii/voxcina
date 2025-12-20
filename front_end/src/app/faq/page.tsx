import type { Metadata } from "next";
import FAQClient from "./client";
import type { Faq } from "@/types/faq";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description:
    "سوالات متداول کاربران و پاسخ‌های مربوط به روند ثبت سفارش، ارسال، پیگیری و خدمات پس از فروش در وکسینا.",
  keywords: [
    "سوالات متداول وکسینا",
    "راهنمای خرید",
    "پشتیبانی وکسینا",
    "نحوه ثبت سفارش",
    "ارسال سفارش",
    "بازگشت کالا",
  ],
  openGraph: {
    title: "سوالات متداول | وکسینا",
    description:
      "پاسخ به سوالات متداول درباره ثبت سفارش، ارسال، پیگیری و خدمات پس از فروش در وکسینا.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/images/Logo/WXTransparent-org.png",
        width: 1200,
        height: 630,
        alt: "سوالات متداول وکسینا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "سوالات متداول | وکسینا",
    description:
      "پاسخ به سوالات متداول درباره ثبت سفارش، ارسال، پیگیری و خدمات پس از فروش در وکسینا.",
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  alternates: {
    canonical: "/faq",
    languages: {
      'fa': '/faq',
      'fa-IR': '/faq',
      'x-default': '/faq',
    },
  },
};

// Force this page to be dynamic (not statically generated at build time)
export const dynamic = "force-dynamic";

interface FaqPageData {
  faqs: Faq[];
  error?: string;
}

async function getFaqs(): Promise<FaqPageData> {
  const baseUrl =
    process.env.GO_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://server:8080";

  try {
    const res = await fetch(`${baseUrl}/api/faqs`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("Failed to fetch FAQs", res.status, res.statusText);
      return {
        faqs: [],
        error:
          "مشکلی در بارگذاری سوالات متداول پیش آمد. لطفاً بعداً دوباره تلاش کنید.",
      };
    }

    const data = (await res.json()) as Faq[];
    return { faqs: data };
  } catch (err) {
    console.error("Error fetching FAQs", err);
    return {
      faqs: [],
      error:
        "مشکلی در بارگذاری سوالات متداول پیش آمد. لطفاً بعداً دوباره تلاش کنید.",
    };
  }
}

// Generate FAQPage JSON-LD schema from FAQ data
function generateFaqSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((faq) => faq.is_active !== false)
      .map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
  };
}

export default async function FAQPage() {
  const { faqs, error } = await getFaqs();

  const faqSchema = generateFaqSchema(faqs);

  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
        />
      )}
      <FAQClient faqs={faqs} error={error} />
    </>
  );
}
