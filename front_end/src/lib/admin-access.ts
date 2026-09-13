/**
 * Which back-office sections each role may open.
 *
 * This is the UI half of a rule the Go API enforces for real: /api/admin is
 * served by two subrouters, and only the catalog/content one admits the
 * restricted "staff" role (routes/routes.go, middlewares.StaffAuthMiddleware).
 * Everything here is convenience — hiding links a staff member cannot use and
 * explaining the 403 before it happens. It is never the security boundary.
 *
 * Keep STAFF_SECTIONS in step with the staff subrouter: a section listed here
 * whose endpoints are not on that subrouter renders a page that 403s on every
 * request.
 */

/** Roles that may open the dashboard at all. Mirrors handlers.IsBackOfficeRole. */
export const BACK_OFFICE_ROLES = ["admin", "staff"] as const;

export type BackOfficeRole = (typeof BACK_OFFICE_ROLES)[number];

/**
 * Section roots the "staff" role may open. Admins are not listed because they
 * reach everything; see canAccessAdminSection.
 */
export const STAFF_SECTIONS = [
  "/admin/products",
  "/admin/categories",
  "/admin/brands",
  "/admin/blogs",
  "/admin/tickets",
] as const;

/**
 * Where a staff member lands instead of the dashboard home. The overview page
 * runs on /api/admin/dashboard-stats, which is admin-only, so sending staff
 * there would just render an error.
 */
export const STAFF_HOME = "/admin/products";

export function isBackOfficeRole(role: string | undefined | null): role is BackOfficeRole {
  return role === "admin" || role === "staff";
}

/**
 * Whether `role` may open the dashboard route `pathname`.
 *
 * Matching is by section root, so every nested route (/admin/products/add,
 * /admin/blogs/[id], ...) inherits its section's answer. Unknown roles and
 * unknown sections are denied — a section added later is closed to staff until
 * it is listed, which is the same default the API uses.
 */
export function canAccessAdminSection(
  role: string | undefined | null,
  pathname: string,
): boolean {
  if (role === "admin") return true;
  if (role !== "staff") return false;

  return STAFF_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  );
}

/** Persian label for a role, as shown in the users table and role picker. */
export const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر",
  staff: "کارمند",
  customer: "مشتری",
  user: "مشتری",
  seller: "فروشنده",
};

export function roleLabel(role: string | undefined | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

/**
 * Badge tone for a role, ordered by how much the role can do: admin is the
 * loudest, staff sits between it and an ordinary shopper.
 */
export function roleTone(role: string | undefined | null): "danger" | "warning" | "info" {
  if (role === "admin") return "danger";
  if (role === "staff") return "warning";
  return "info";
}
