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

// Note: /admin/sellers is deliberately absent. Commission is an admin matter.

/**
 * Where a staff member lands instead of the dashboard home. The overview page
 * runs on /api/admin/dashboard-stats, which is admin-only, so sending staff
 * there would just render an error.
 */
export const STAFF_HOME = "/admin/products";

/** The seller (affiliate partner) panel. Not part of the admin dashboard. */
export const SELLER_HOME = "/seller";

/**
 * Where the header's panel icon sends someone, by role.
 *
 * One affordance, three destinations: an admin gets the overview, a staff
 * member their first permitted section, a seller their own panel. Returning
 * null means the icon is not shown at all.
 *
 * /admin and /seller each redirect a caller who does not belong there, so a
 * typed URL or a stale bookmark lands in the right place too.
 */
export function panelHomeFor(role: string | undefined | null): string | null {
  if (role === "admin") return "/admin";
  if (role === "staff") return STAFF_HOME;
  if (role === "seller") return SELLER_HOME;
  return null;
}

/** Whether `role` has a panel behind the header icon at all. */
export function hasPanel(role: string | undefined | null): boolean {
  return panelHomeFor(role) !== null;
}

/** Whether `role` is an affiliate partner rather than shop personnel. */
export function isSellerRole(role: string | undefined | null): boolean {
  return role === "seller";
}

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
  seller: "فروشنده",
  customer: "مشتری",
  user: "مشتری",
};

export function roleLabel(role: string | undefined | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

/**
 * Badge tone for a role, ordered by how much the role can do: admin is the
 * loudest, staff sits between it and an ordinary shopper.
 */
export function roleTone(
  role: string | undefined | null,
): "danger" | "warning" | "violet" | "info" {
  if (role === "admin") return "danger";
  if (role === "staff") return "warning";
  if (role === "seller") return "violet";
  return "info";
}
