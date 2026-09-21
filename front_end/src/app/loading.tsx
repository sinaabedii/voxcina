// Imported directly from the module, not from "@/components/ui": this file is a
// route-level boundary, so Next bundles it into *every* route's client
// references. The barrel re-exports Modal, StarRating, QuantitySelector,
// ColorSelector, SizeSelector, StockStatus and FeatureCard, which between them
// pull framer-motion (~134 KB) onto the critical path of pages that never
// animate. Keep boundary files (loading/error/not-found) importing narrowly.
import { PageLoading } from "@/components/ui/Loading";

export default function RootLoading() {
  return <PageLoading />;
}
