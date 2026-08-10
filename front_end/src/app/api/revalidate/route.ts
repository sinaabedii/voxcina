import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Drops Next.js ISR cache tags on demand.
 *
 * Admin CRUD writes go straight to the Go backend and never touch the
 * homepage's cached fetch — without this, hero/slider/etc. edits sit behind
 * their ISR `revalidate` window (minutes) before showing up publicly. The
 * admin store calls this right after a successful write so changes appear
 * on the next page load instead.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string")
    : [];

  if (tags.length === 0) {
    return NextResponse.json({ error: "tags is required" }, { status: 400 });
  }

  tags.forEach((tag: string) => revalidateTag(tag));

  return NextResponse.json({ revalidated: true, tags });
}
