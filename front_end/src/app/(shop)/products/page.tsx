import { Suspense } from "react";
import ProductsClient from "./_components/ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense 
      fallback={
        <div className="container py-16 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute top-0 right-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft"></div>
              <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-lg text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">در حال بارگذاری محصولات...</p>
          </div>
        </div>
      }
    >
      <ProductsClient />
    </Suspense>
  );
}