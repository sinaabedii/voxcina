/**
 * Layout for the Swagger UI route: server component carrying metadata only
 * (metadata cannot be exported from a "use client" page), plus a noindex
 * hint — the docs describe an admin-only API surface.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مستندات API",
  robots: { index: false, follow: false },
};

export default function SwaggerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
