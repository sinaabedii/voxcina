import type { Metadata } from "next";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ClientLayout from "../components/layout/ClientLayout";

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
  ],
  authors: [{ name: "Voxcina Team" }],
  creator: "Voxcina",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#1A3C69" />
        <link rel="icon" href="/images/Logo/WXTransparent-org.png" sizes="any" />
      </head>
      <body className="min-h-screen bg-background text-foreground font-iransans antialiased selection:bg-primary/20 selection:text-primary">
        <ClientLayout>
          <div className="page-transition-wrapper">
            <main className="flex flex-col min-h-screen">{children}</main>
          </div>
        </ClientLayout>

        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            className: "voxcina-toast",
            duration: 5000,
            style: {
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 20px rgba(26, 60, 105, 0.1)",
              direction: "rtl",
              fontFamily: "IranSansX, sans-serif",
              padding: "16px",
            },
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