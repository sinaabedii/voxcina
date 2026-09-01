import { CareerApplicationPayload, JobPosition } from "@/types/career";

export interface CareerSubmitResult {
  ok: boolean;
  referenceCode?: string;
  error?: string;
}

/**
 * Posts a /careers form to the Go backend.
 *
 * multipart/form-data because a job application carries a PDF CV; the same
 * endpoint serves the partnership form, where the CV is optional. The
 * `website` honeypot is always sent (empty for a real visitor) so a bot that
 * fills every field it finds is discarded server-side.
 */
export async function submitCareerApplication(
  payload: CareerApplicationPayload
): Promise<CareerSubmitResult> {
  const body = new FormData();
  body.append("type", payload.type);
  body.append("full_name", payload.full_name);
  body.append("email", payload.email);
  body.append("phone", payload.phone);
  body.append("message", payload.message);
  body.append("website", payload.website ?? "");

  if (payload.company_name) body.append("company_name", payload.company_name);
  if (payload.business_type) body.append("business_type", payload.business_type);
  // Only the id travels: the backend reads the title back from the posting, so
  // an application can never name a role that was not advertised.
  if (payload.position_id) body.append("position_id", payload.position_id);
  if (payload.experience_years) {
    body.append("experience_years", payload.experience_years);
  }
  if (payload.portfolio_url) body.append("portfolio_url", payload.portfolio_url);
  if (payload.resume) body.append("resume", payload.resume);

  try {
    const response = await fetch("/api/careers/submissions", {
      method: "POST",
      body,
    });

    // A rejected upload can come back as HTML from the proxy layer, so never
    // assume the body parses.
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          (response.status === 429
            ? "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید."
            : "ثبت درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید."),
      };
    }

    return { ok: true, referenceCode: data?.reference_code || "" };
  } catch {
    return {
      ok: false,
      error: "ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.",
    };
  }
}

/**
 * Reads the open positions from the browser.
 *
 * The /careers page itself renders them server-side (see its page.tsx) so the
 * listing is in the HTML for search engines; this is the client-side fallback
 * used to refresh the list without a reload.
 */
export async function fetchOpenPositions(): Promise<JobPosition[]> {
  try {
    const response = await fetch("/api/careers/positions", {
      cache: "no-store",
    });
    if (!response.ok) return [];

    const data = await response.json().catch(() => null);
    return Array.isArray(data?.positions) ? data.positions : [];
  } catch {
    return [];
  }
}
