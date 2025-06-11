import type { Metadata } from "next";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import ClientLayout from "../components/layout/ClientLayout";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "مد",
    "پوشاک",
    "لباس",
    "فروشگاه آنلاین",
    "خرید آنلاین",
    "وکسینا",
    "voxcina",
    "لباس مردانه",
    "لباس زنانه",
    "لباس بچگانه",
    "کفش",
    "کیف",
    "اکسسوری",
    "تخفیف",
    "حراج",
    "ارسال رایگان",
  ],
  authors: [{ name: "Voxcina Team" }],
  creator: "Voxcina",
  metadataBase: new URL("https://voxcina.com"),
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: "/images/Logo/WXTransparent-org.png",
        width: 1200,
        height: 630,
        alt: "وکسینا - فروشگاه آنلاین پوشاک و مد",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/images/Logo/WXTransparent-org.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className="scroll-smooth">
      <head>
      <Script id="gtm-script" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KRPC7WM6');
          `}
        </Script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#1A3C69" />
        <link rel="icon" href="/images/Logo/WXTransparent-org.png" sizes="any" />
        
        {/* JSON-LD structured data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "وکسینا",
              alternateName: "Voxcina",
              url: "https://voxcina.com",
              logo: "https://voxcina.com/images/Logo/WXTransparent-org.png",
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+982112345678",
                contactType: "customer service",
                availableLanguage: ["Persian", "English"],
              },
              sameAs: [
                "https://www.instagram.com/voxcina",
                "https://twitter.com/voxcina",
              ],
            }),
          }}
        />
        
        {/* JSON-LD structured data for WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "وکسینا",
              url: "https://voxcina.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://voxcina.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-iransans antialiased selection:bg-primary/20 selection:text-primary">
        <ClientLayout>
          <div className="page-transition-wrapper">
            <main className="flex flex-col min-h-screen">{children}</main>
          </div>
        </ClientLayout>

        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={true}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          toastStyle={{
            fontFamily: 'IranSansX, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(26, 60, 105, 0.15)',
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                const links = document.querySelectorAll('a[href^="#"]');
                links.forEach(link => {
                  link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                      window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                      });
                    }
                  });
                });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}