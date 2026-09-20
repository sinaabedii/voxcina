import { ProductListSkeleton } from "@/components/ui";

// A collapsing spinner used to live here; see ProductListSkeleton for why the
// fallback has to approximate the real grid's height.
export default function ListLoading() {
  return <ProductListSkeleton />;
}
