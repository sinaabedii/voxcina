import type { Metadata } from "next";
import ReturnsClient from "./ReturnsClient";

export const metadata: Metadata = {
  title: "شرایط بازگشت کالا",
  description:
    "شرایط و قوانین بازگشت کالا در وکسینا. ضمانت رضایت ۷ روزه، نحوه مرجوع کردن کالا و بازگشت وجه.",
  keywords: [
    "بازگشت کالا وکسینا",
    "مرجوعی کالا",
    "ضمانت بازگشت",
    "شرایط مرجوعی",
    "بازگشت وجه",
    "تعویض کالا",
  ],
  openGraph: {
    title: "شرایط بازگشت کالا | وکسینا",
    description:
      "شرایط و قوانین بازگشت کالا در وکسینا. ضمانت رضایت ۷ روزه و بازگشت وجه.",
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/images/Logo/WXTransparent-org.png",
        width: 1200,
        height: 630,
        alt: "شرایط بازگشت کالا وکسینا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "شرایط بازگشت کالا | وکسینا",
    description:
      "شرایط و قوانین بازگشت کالا در وکسینا. ضمانت رضایت ۷ روزه و بازگشت وجه.",
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  alternates: {
    canonical: "/returns",
    languages: {
      'fa': '/returns',
      'fa-IR': '/returns',
      'x-default': '/returns',
    },
  },
};

export default function ReturnsPage() {
  return <ReturnsClient />;
}
