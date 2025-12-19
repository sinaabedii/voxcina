import { notFound } from "next/navigation";
import { serverFetch, serverFetchWithFallback, CACHE_TIMES } from "@/lib/server-api";
import { Product, Review } from "@/types/product";
import { Category } from "@/types/category";
import ProductJsonLd from "@/components/product/ProductJsonLd";
import ProductActions from "@/components/product/ProductActions";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductGrid from "@/components/product/ProductGrid";
import { ColorVariantListItem } from "@/types/product";

// Re-export metadata generation
export { generateMetadata } from "./metadata";

interface ProductDetailPageProps {
  params: {
    productId: string;
  };
}

/**
 * Server-side product data fetching for SSR.
 * Fetches product, reviews, categories, and similar products on the server.
 * 
 * Requirements: 1.1, 1.3, 1.4, 6.1, 6.2, 6.3
 */
async function getProductData(productId: string) {
  // Fetch product with 60-second ISR revalidation
  const product = await serverFetch<Product>(`/api/products/${productId}`, {
    revalidate: CACHE_TIMES.PRODUCT_DETAIL,
    tags: ['product', `product-${productId}`]
  });

  if (!product) {
    return null;
  }

  // Fetch reviews and categories in parallel for better performance
  const [reviews, categories, allProducts] = await Promise.all([
    serverFetchWithFallback<Review[]>(
      `/api/products/${productId}/reviews`,
      [],
      { revalidate: CACHE_TIMES.PRODUCT_DETAIL, tags: ['reviews', `reviews-${productId}`] }
    ),
    serverFetchWithFallback<Category[]>(
      '/api/categories',
      [],
      { revalidate: CACHE_TIMES.CATEGORIES, tags: ['categories'] }
    ),
    serverFetchWithFallback<{ data: ColorVariantListItem[] }>(
      '/api/products?limit=20',
      { data: [] },
      { revalidate: CACHE_TIMES.PRODUCTS_LIST, tags: ['products'] }
    )
  ]);

  // Get category name for breadcrumbs
  const categoryName = product.category_ids?.[0]
    ? categories.find(c => c.id === product.category_ids[0])?.name || ''
    : '';

  // Filter similar products (same category, different product)
  const similarProducts = (allProducts.data || [])
    .filter(p => 
      product.category_ids?.length > 0 &&
      p.category_ids?.some(catId => product.category_ids.includes(catId)) &&
      p.productId !== product.id
    )
    .slice(0, 4);

  return {
    product,
    reviews,
    categoryName,
    similarProducts
  };
}

/**
 * Product Detail Page - Server Component
 * 
 * This page is rendered on the server with full product data,
 * including JSON-LD structured data for SEO.
 * 
 * Requirements:
 * - 1.1: Return HTML with product name, description, price, images without JS
 * - 1.2: Include JSON-LD structured data in initial HTML
 * - 1.3: Fetch product data from backend API on server
 * - 1.4: Cache response for 60 seconds using ISR
 * - 1.5: Return 404 for non-existent products
 */
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = params;
  
  // Fetch all product data on the server
  const data = await getProductData(productId);
  
  // Requirement 1.5: Return 404 for non-existent products
  if (!data) {
    notFound();
  }

  const { product, reviews, categoryName, similarProducts } = data;

  // Build product URL for structured data
  const productUrl = `/products/${productId}`;

  // Calculate average rating for structured data
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <>
      {/* Requirement 1.2: JSON-LD structured data in server response */}
      <ProductJsonLd 
        product={product} 
        url={productUrl} 
        avgRating={avgRating}
        reviewCount={reviews.length}
      />

      <div className="container py-8 md:py-16">
        {/* Breadcrumbs - Server rendered for SEO */}
        <div className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6">
          <Breadcrumbs
            items={[
              { title: "خانه", href: "/" },
              { title: "محصولات", href: "/products" },
              ...(product.category_ids && product.category_ids.length > 0 && categoryName
                ? [{ title: categoryName, href: `/categories/${product.category_ids[0]}` }]
                : []),
              { title: product.name, href: `/products/${productId}` },
            ]}
          />
        </div>

        {/* Product Actions - Client Component for interactivity */}
        <ProductActions
          product={product}
          productUrl={productUrl}
          reviews={reviews}
          categoryName={categoryName}
        />

        {/* Similar Products - Server rendered */}
        {similarProducts.length > 0 && (
          <div className="items-center py-6">
            <SectionTitle title="محصولات مشابه" size="lg" />
            <ProductGrid items={similarProducts} />
          </div>
        )}
      </div>
    </>
  );
}
