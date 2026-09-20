export type AddressType = "home" | "work" | "dorm";

const WORK_TITLE_KEYWORDS = ["کار", "شرکت", "دفتر"];
const DORM_TITLE_KEYWORDS = ["خوابگاه", "دانشگاه", "پانسیون"];

/**
 * The backend address model has no type field, so the dashboard encodes it in
 * the title. This mirrors that legacy convention in one place.
 */
export function addressTypeFromTitle(title?: string): AddressType {
  const normalized = (title ?? "").toLowerCase();
  if (WORK_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "work";
  }
  if (DORM_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "dorm";
  }
  return "home";
}

export function addressTitleFallback(type: AddressType): string {
  if (type === "work") return "محل کار";
  if (type === "dorm") return "خوابگاه";
  return "خانه";
}
