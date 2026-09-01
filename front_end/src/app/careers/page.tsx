import { JobPosition } from "@/types/career";
import { metadata as careersMetadata } from "./metadata";
import CareersClient from "./CareersClient";

/**
 * Careers page — server component.
 *
 * The page used to be a client component, which meant the sibling metadata.ts
 * was never applied: only a server page or layout can export `metadata`. All
 * interactivity now lives in CareersClient, so the SEO tags are real again.
 *
 * The open positions are fetched here rather than in the client so the job
 * listings ship inside the HTML — the one part of this page a search engine
 * genuinely needs to read.
 */
export const metadata = careersMetadata;

/**
 * Rendered per request.
 *
 * Without this the page is prerendered at build time, where the backend is not
 * reachable — the empty listing would then be served until the first ISR
 * revalidation, i.e. exactly when a fresh deploy needs it to be right. The
 * query is one indexed read of a handful of documents, so the openings are
 * simply read live and an admin's change is visible on the next page load.
 */
export const dynamic = "force-dynamic";

async function getOpenPositions(): Promise<JobPosition[]> {
  const baseUrl =
    process.env.GO_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://server:8080";

  try {
    const response = await fetch(`${baseUrl}/api/careers/positions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Failed to fetch open positions", response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.positions) ? data.positions : [];
  } catch (error) {
    // A listing that cannot be loaded must not take the whole page down: the
    // partnership form and the rest of the content still work without it.
    console.error("Error fetching open positions", error);
    return [];
  }
}

export default async function CareersPage() {
  const positions = await getOpenPositions();

  return <CareersClient initialPositions={positions} />;
}
