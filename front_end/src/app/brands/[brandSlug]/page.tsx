"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Filter, SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { ColorVariantListItem } from "@/types/product";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

export default function BrandPage() {
  const params = useParams();
  const brandSlug = params.brandSlug as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<ColorVariantListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrandAndProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all brands and find the one matching the slug/name
        const brandsRes = await fetch(`/api/brands`);
        if (!brandsRes.ok) {
          throw new Error("خطا در دریافت برندها");
        }
        const brandsData = await brandsRes.json();
        const brandsArray = brandsData.brands || brandsData || [];
        
        // Find brand by slug or name (case-insensitive)
        const foundBrand = brandsArray.find((b: any) => 
          b.slug?.toLowerCase() === brandSlug.toLowerCase() ||
          b.name?.toLowerCase() === brandSlug.toLowerCase() ||
          b.name === brandSlug
        );
        
        if (!foundBrand) {
          throw new Error("برند یافت نشد");
        }
        
        setBrand(foundBrand);

        // Fetch products for this brand using brand name
        const productsRes = await fetch(`/api/products?brand=${encodeURIComponent(foundBrand.name)}`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || productsData || []);
        }
      } catch (err: any) {
        setError(err.message || "خطا در بارگذاری اطلاعات");
      } finally {
        setIsLoading(false);
      }
    };

    if (brandSlug) {
      fetchBrandAndProducts();
    }
  }, [brandSlug]);

  if (isLoading) {
    return (
      <div className="container py-12 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="container py-12 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">برند یافت نشد</h1>
          <p className="text-muted-foreground">{error || "برند مورد نظر وجود ندارد"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        {brand.logo && (
          <img
            src={brand.logo}
            alt={brand.name}
            className="h-20 w-auto mx-auto mb-4 object-contain"
          />
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          {brand.name}
        </h1>
        {brand.description && (
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {brand.description}
          </p>
        )}
      </motion.div>

      {/* Products Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {products.length} محصول
        </p>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
        >
          {products.map((product, index) => (
            <motion.div
              key={product.productId || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProductCard item={product} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">محصولی یافت نشد</h2>
          <p className="text-muted-foreground">
            در حال حاضر محصولی برای این برند موجود نیست
          </p>
        </div>
      )}
    </div>
  );
}
