import { Suspense } from "react";
import ProductsClient from "./_components/ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center">در حال بارگذاری…</div>}>
      <ProductsClient />
    </Suspense>
  );
}