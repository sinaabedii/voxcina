import { ProductDetailSkeleton } from "@/components/ui";

// A spinner used to live here. Because this fallback is streamed into the
// initial HTML and then replaced in place, its height is paid as CLS — see the
// note on ProductDetailSkeleton.
export default function ProductDetailLoading() {
  return <ProductDetailSkeleton />;
}
