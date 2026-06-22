import { MetadataRoute } from 'next';

/**
 * Dynamic Robots.txt Generation using Next.js App Router
 * 
 * This generates a robots.txt at /robots.txt that:
 * - Allows crawling of public pages
 * - Blocks admin and auth routes from indexing
 * - Blocks system directories
 * - References the dynamic sitemap
 * 
 * SEO: Proper robots.txt prevents indexing of private pages
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxcina.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/products',
          '/products/*',
          '/categories/*',
          '/brands/*',
          '/blog',
          '/blog/*',
          '/about',
          '/contact',
          '/faq',
          '/shipping',
          '/returns',
          '/shoppingGuide',
          '/orderTracking',
          '/careers',
          '/collection/*',
        ],
        disallow: [
          // Admin routes - should not be indexed
          '/admin',
          '/admin/*',
          
          // Auth routes - private user authentication
          '/sign-in',
          '/sign-up',
          '/forgot-password',
          '/verify-code',
          
          // Dashboard routes - private user area
          '/dashboard',
          '/dashboard/*',
          
          // Cart and checkout - private user actions
          '/cart',
          '/checkout',
          '/checkout/*',
          
          // API routes - not for crawling
          '/api',
          '/api/*',
          
          // System directories
          '/_next',
          '/_next/*',
          
          // Assistant/chatbot - not for indexing
          '/assistant',
        ],
      },
      {
        // Block specific bots that might cause issues
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
