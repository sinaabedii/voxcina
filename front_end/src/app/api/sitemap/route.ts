import { NextResponse } from 'next/server';

// Define types for the API responses
interface Product {
  id?: string;
  _id?: string;
  updatedAt?: string;
}

interface BlogPost {
  slug: string;
  updatedAt?: string;
}

interface Category {
  name: string;
  slug?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  data?: T[];
}

// تولید نقشه سایت XML پویا
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxcina.com';

    // Check if we should skip API calls during build
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const shouldSkipApiCall = !apiUrl;

    let products: Product[] | ApiResponse<Product> = [];
    let categories: Category[] | ApiResponse<Category> = [];
    let blogPosts: BlogPost[] | ApiResponse<BlogPost> = [];

    if (!shouldSkipApiCall) {
      try {
        // دریافت اطلاعات صفحات پویا (محصولات، دسته‌بندی‌ها، مقالات)
        const [productsRes, categoriesRes, blogPostsRes] = await Promise.all([
          fetch(`${apiUrl}/api/products?limit=1000`),
          fetch(`${apiUrl}/api/categories`),
          fetch(`${apiUrl}/api/blog-posts?limit=100`),
        ]);

        // پردازش داده‌ها
        if (productsRes.ok) {
          products = await productsRes.json() as Product[] | ApiResponse<Product>;
        }

        if (categoriesRes.ok) {
          categories = await categoriesRes.json() as Category[] | ApiResponse<Category>;
        }

        if (blogPostsRes.ok) {
          blogPosts = await blogPostsRes.json() as BlogPost[] | ApiResponse<BlogPost>;
        }
      } catch (fetchError) {
        console.warn('Failed to fetch dynamic data for sitemap, using fallback:', fetchError);
        // Continue with empty arrays - will generate basic sitemap
      }
    }

    // صفحات استاتیک سایت
    const staticPages: { url: string; changefreq: string; priority: string }[] = [
      { url: '/', changefreq: 'daily', priority: '1.0' },
      { url: '/about', changefreq: 'monthly', priority: '0.8' },
      { url: '/contact', changefreq: 'monthly', priority: '0.8' },
      { url: '/products', changefreq: 'daily', priority: '0.9' },
      { url: '/blog', changefreq: 'daily', priority: '0.9' },
      { url: '/shoppingGuide', changefreq: 'monthly', priority: '0.7' },
      { url: '/shipping', changefreq: 'monthly', priority: '0.7' },
      { url: '/returns', changefreq: 'monthly', priority: '0.7' },
      { url: '/orderTracking', changefreq: 'monthly', priority: '0.7' },
    ];

    // ساخت XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // افزودن صفحات استاتیک
    staticPages.forEach((page: { url: string; changefreq: string; priority: string }) => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '  </url>\n';
    });

    // افزودن محصولات
    const productItems = Array.isArray(products) ? products : products.data || [];
    productItems.forEach((product: Product) => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/products/${product.id || product._id}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      const productLastmod = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `    <lastmod>${productLastmod}</lastmod>\n`;
      xml += '  </url>\n';
    });

    // افزودن مقالات بلاگ
    const blogItems = Array.isArray(blogPosts) ? blogPosts : blogPosts.data || [];
    blogItems.forEach((post: BlogPost) => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      const blogLastmod = post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `    <lastmod>${blogLastmod}</lastmod>\n`;
      xml += '  </url>\n';
    });

    // افزودن دسته‌بندی‌ها
    const categoryItems = Array.isArray(categories) ? categories : categories.data || [];
    categoryItems.forEach((category: Category) => {
      const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
      xml += '  <url>\n';
      xml += '    <loc>' + baseUrl + '/categories/' + slug + '</loc>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      const lastmod = category.updatedAt ? new Date(category.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += '    <lastmod>' + lastmod + '</lastmod>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    // ارسال XML با هدرهای مناسب
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
} 