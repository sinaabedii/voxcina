import type { Metadata } from "next";
import { APP_NAME, APP_DESCRIPTION, SEO_DEFAULT_TITLE } from "@/lib/constants";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import ClientLayout from "../components/layout/ClientLayout";
import { NavigationProvider } from "@/context/navigation";
import type { NavItem } from "@/components/layout/HeaderClient";
import GoogleAnalytics from "../components/GoogleAnalytics";

interface CategoryApi {
  id?: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  show_in_header?: boolean;
}

// Helper to build nav items (depth 1-2)
// Uses clean URLs (/categories/slug) instead of query parameters for better SEO
function buildNavItems(categories: CategoryApi[]): NavItem[] {
  const map = new Map<string, NavItem>();
  const roots: NavItem[] = [];

  categories.forEach((cat) => {
    const key = String(cat.id ?? cat.slug);
    // Use clean URL with slug instead of query parameter for SEO
    const item: NavItem = {
      label: cat.name,
      href: `/categories/${cat.slug}`,
      children: [],
    };
    map.set(key, item);
  });

  categories.forEach((cat) => {
    const parentKey = cat.parent_id ? String(cat.parent_id) : null;
    const currentKey = String(cat.id ?? cat.slug);

    if (parentKey && map.has(parentKey)) {
      const parent = map.get(parentKey)!;
      parent.children = parent.children || [];
      parent.children.push(map.get(currentKey)!);
    } else {
      roots.push(map.get(currentKey)!);
    }
  });

  roots.forEach((r) => {
    if (r.children && r.children.length === 0) delete r.children;
  });

  return roots;
}

export const metadata: Metadata = {
  title: {
    default: SEO_DEFAULT_TITLE,
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
    title: SEO_DEFAULT_TITLE,
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
    title: SEO_DEFAULT_TITLE,
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
    canonical: "https://voxcina.com/",
    languages: {
      'fa-IR': 'https://voxcina.com/',
      'x-default': 'https://voxcina.com/',
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // Fetch categories for header (server-side)
  let navItems: NavItem[] = [];
  try {
    // Skip API calls during build/static generation if no API URL is available
    const shouldSkipApiCall = !process.env.GO_BACKEND_URL && !process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!shouldSkipApiCall) {
      const baseUrl =
        process.env.GO_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "http://server:8080"; // works inside docker-compose network; fallback to localhost when running locally
      const res = await fetch(`${baseUrl}/api/categories`, {
        next: { revalidate: process.env.NODE_ENV === "development" ? 0 : 600 }, // 10-minute revalidation in production, no cache in dev
      });
      if (res.ok) {
        const data = (await res.json()) as CategoryApi[];
        navItems = buildNavItems(data.filter((c) => c.show_in_header));
      }
    }
  } catch (err) {
    console.error("Failed to fetch header categories", err);
    // Continue with empty navItems - will use fallback navigation
  }

  // Always include Home as the first item
  const homeItem: NavItem = { label: "خانه", href: "/" };
  const productsItem: NavItem = { label: "محصولات", href: "/products" };
  const tryonItem: NavItem = { label: "پرو مجازی", href: "/tryon" };
  navItems = [
    homeItem,
    productsItem,
    tryonItem,
    ...navItems.filter((i) => i.href !== "/" && i.href !== "/products" && i.href !== "/tryon"),
  ];

  return (
    <html lang="fa" dir="rtl" className="scroll-smooth">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#1A3C69" />
        <link rel="icon" href="/images/Logo/WXTransparent-org.png" sizes="any" />
        
        {/* Preload critical fonts for better CLS and LCP */}
        <link
          rel="preload"
          as="font"
          href="/fonts/iransansx-regular.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          href="/fonts/iransansx-bold.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
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
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <NavigationProvider navItems={navItems}>
        <ClientLayout>
          <div className="page-transition-wrapper">
            <main className="flex flex-col min-h-screen">{children}</main>
          </div>
        </ClientLayout>
        </NavigationProvider>

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