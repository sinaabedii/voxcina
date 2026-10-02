import { toast } from "react-toastify";

/**
 * Triggers native browser print preview for an A5 order receipt
 * in a new top-level tab or window.
 */
export function printOrderReceipt(
  orderId: string,
  audience: "admin" | "customer" = "admin",
): Promise<void> {
  if (typeof window === "undefined" || !orderId) {
    return Promise.resolve();
  }

  // Keep this synchronous so browsers treat it as part of the user's click.
  // Open a blank same-origin tab first: `noopener` in window.open's features
  // returns null even on success, making blocked-popup detection unreliable.
  // Detach the opener BEFORE navigating to the authenticated receipt page.
  const receiptWindow = window.open("about:blank", "_blank");
  if (!receiptWindow) {
    toast.error("پنجره چاپ باز نشد. اجازه باز شدن پنجره‌های جدید را برای این سایت فعال کنید و دوباره تلاش کنید.", {
      toastId: "order-receipt-popup-blocked",
    });
    return Promise.resolve();
  }
  receiptWindow.opener = null;
  const base = audience === "admin" ? "/admin/orders" : "/dashboard/orders";
  receiptWindow.location.replace(`${base}/${encodeURIComponent(orderId)}/receipt?autoprint=true`);

  // Do not wait for the print dialog or tab lifecycle; either can be blocked
  // or cancelled, and the caller should not remain in a loading state.
  return Promise.resolve();
}

export function printCustomerOrderReceipt(orderId: string): Promise<void> {
  return printOrderReceipt(orderId, "customer");
}
