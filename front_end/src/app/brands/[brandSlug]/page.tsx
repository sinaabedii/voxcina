import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { serverFetch, serverFetchWithFallback, CACHE_TIMES } from "@/lib/server-api";
import { Brand } from "@/types/brand";
import { ColorVariantListItem } from "@/types/product";
import { APP_NAME } from "@/lib/constants";
import BreadcrumbSchema, { BreadcrumbItem } from "@/components/SEO/BreadcrumbSchema";
import ItemListSchema, { ItemListItem } from "@/components/SEO/ItemListSchema";
import BrandPageClient from "@/app/brands/[brandSlug]/BrandPageClient";

interface BrandPageProps {
  params: { brandSlug: string };
}

/**
 * Server-side brand data fetching for SSR.
 * Fetches brand info and products on the server.
 * 
 * SEO: Brand pages are important for product discovery
 */
async function getBrandData(brandSlug: string) {
  // Fetch all brands
  const brandsResponse = await serverFetch<Brand[] | { brands: Brand[] }>('/api/brands', {
    revalidate: CACHE_TIMES.BRANDS,
    tags: ['brands']
  });

  if (!brandsResponse) {
    return null;
  }

  // Handle both array and object response formats
  const brandsArray = Array.isArray(brandsResponse) 
    ? brandsResponse 
    : brandsResponse.brands || [];

  // Find brand by slug or name (case-insensitive)
  const decodedSlug = decodeURIComponent(brandSlug);
  const brand = brandsArray.find((b: Brand) =>
    b.slug?.toLowerCase() === decodedSlug.toLowerCase() ||
    b.name?.toLowerCase() === decodedSlug.toLowerCase() ||
    b.name === decodedSlug
  );

  if (!brand) {
    return null;
  }

  // Fetch products for this brand
  const productsResponse = await serverFetchWithFallback<{ products?: ColorVariantListItem[]; data?: ColorVariantListItem[] } | ColorVariantListItem[]>(
    `/api/products?brand=${encodeURIComponent(brand.name)}`,
    { products: [] },
    { revalidate: CACHE_TIMES.PRODUCTS_LIST, tags: ['products', `brand-${brand.id}`] }
  );

  // Handle different response formats
  let products: ColorVariantListItem[] = [];
  if (Array.isArray(productsResponse)) {
    products = productsResponse;
  } else if (productsResponse.products) {
    products = productsResponse.products;
  } else if (productsResponse.data) {
    products = productsResponse.data;
  }

  return { brand, products };
}

/**
 * Generate dynamic metadata for brand pages
 */
export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const data = await getBrandData(params.brandSlug);

  if (!data) {
    return {
      title: 'برند یافت نشد',
      description: 'متأسفانه برند مورد نظر یافت نشد.',
    };
  }

  const { brand, products } = data;
  const productCount = products.length;

  return {
    title: brand.name,
    description: brand.description || `خرید آنلاین محصولات برند ${brand.name} با بهترین قیمت و کیفیت از فروشگاه آنلاین ${APP_NAME}. ${productCount} محصول موجود.`,
    keywords: [
      brand.name,
      'خرید آنلاین',
      'فروشگاه اینترنتی',
      'وکسینا',
      'برند',
      brand.slug,
    ],
    openGraph: {
      title: `${brand.name} | ${APP_NAME}`,
      description: brand.description || `خرید آنلاین محصولات برند ${brand.name} از فروشگاه ${APP_NAME}`,
      images: brand.logo ? [
        {
          url: brand.logo.startsWith('http') ? brand.logo : `https://voxcina.com${brand.logo}`,
          width: 400,
          height: 400,
          alt: brand.name,
        },
      ] : [],
      locale: 'fa_IR',
      type: 'website',
    },
    alternates: {
      canonical: `https://voxcina.com/brands/${params.brandSlug}`,
      languages: {
        'fa-IR': `https://voxcina.com/brands/${params.brandSlug}`,
        'x-default': `https://voxcina.com/brands/${params.brandSlug}`,
      },
    },
  };
}

/**
 * Brand Page - Server Component
 * 
 * This page is rendered on the server with full brand and product data,
 * including JSON-LD structured data for SEO.
 * 
 * SEO: Brand pages are important for product discovery
 */
export default async function BrandPage({ params }: BrandPageProps) {
  const { brandSlug } = params;
  
  // Fetch brand data on the server
  const data = await getBrandData(brandSlug);
  
  // Return 404 for non-existent brands
  if (!data) {
    notFound();
  }

  const { brand, products } = data;

  // Build breadcrumb items for schema
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: 'خانه', url: '/' },
    { name: 'برندها', url: '/brands' },
    { name: brand.name, url: `/brands/${brandSlug}` },
  ];

  // Build item list for schema
  const itemListItems: ItemListItem[] = products.map((product) => ({
    name: product.name,
    url: `/products/${product.productId}`,
    image: product.colorVariant?.images?.[0] || '',
    price: product.price,
    availability: product.inStock ? 'InStock' : 'OutOfStock',
  }));

  return (
    <>
      {/* BreadcrumbList JSON-LD Schema */}
      <BreadcrumbSchema items={breadcrumbItems} />
      
      {/* ItemList JSON-LD Schema for products */}
      {products.length > 0 && (
        <ItemListSchema
          listName={`محصولات ${brand.name}`}
          description={brand.description || `مجموعه محصولات برند ${brand.name} در فروشگاه وکسینا`}
          listUrl={`/brands/${brandSlug}`}
          items={itemListItems}
        />
      )}

      {/* Brand Page Content - Client Component for animations */}
      <BrandPageClient brand={brand} products={products} />
    </>
  );
}
