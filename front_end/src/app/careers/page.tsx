import { metadata as careersMetadata } from "./metadata";
import CareersClient from "./CareersClient";

/**
 * Careers page — server component.
 *
 * The page used to be a client component, which meant the sibling metadata.ts
 * was never applied: only a server page or layout can export `metadata`. All
 * interactivity now lives in CareersClient, so the SEO tags are real again.
 */
export const metadata = careersMetadata;

export default function CareersPage() {
  return <CareersClient />;
}
