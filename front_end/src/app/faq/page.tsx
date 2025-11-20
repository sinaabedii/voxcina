import type { Metadata } from "next";
import FAQClient from "./client";
import type { Faq } from "@/types/faq";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description:
    "سوالات متداول کاربران و پاسخ‌های مربوط به روند ثبت سفارش، ارسال، پیگیری و خدمات پس از فروش در وکسینا.",
  alternates: {
    canonical: "/faq",
  },
};

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

export default async function FAQPage() {
  const { faqs, error } = await getFaqs();

  return <FAQClient faqs={faqs} error={error} />;
}
