import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHash } from "crypto";

/**
 * Drops Next.js ISR cache tags on demand.
 *
 * Callers are authenticated two ways: the deploy script presents the shared
 * `REVALIDATE_SECRET` (compared via SHA-256 digests so unequal lengths don't
 * leak timing), or an admin browser presents its regular admin JWT, which is
 * validated by replaying it against an admin-only Go endpoint. Everything
 * else gets 401 — before this gate existed the route relied on being
 * unreachable through the public domain, which was an accident, not a design.
 */
function secretsMatch(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return da.equals(db);
}

async function isAdminToken(backendUrl: string, authorization: string): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/api/admin/ai/settings`, {
      headers: { Authorization: authorization },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get("x-revalidate-secret");
  const authorization = request.headers.get("authorization");

  let authorized = false;
  if (secret && provided && secretsMatch(secret, provided)) {
    authorized = true;
  } else if (authorization) {
    const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:8080";
    authorized = await isAdminToken(backendUrl, authorization);
  }

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string")
    : [];

  if (tags.length === 0) {
    return NextResponse.json({ error: "tags is required" }, { status: 400 });
  }

  tags.forEach((tag: string) => revalidateTag(tag, 'max'));

  return NextResponse.json({ revalidated: true, tags });
}
