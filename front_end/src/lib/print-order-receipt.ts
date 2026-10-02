/**
 * Triggers native browser print preview for an A5 order receipt
 * directly on the current tab without opening a new tab.
 */
export function printOrderReceipt(orderId: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !orderId) {
      resolve();
      return;
    }

    const frameId = "order-receipt-print-frame";
    const oldFrame = document.getElementById(frameId);
    if (oldFrame) {
      oldFrame.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = frameId;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.setAttribute("aria-hidden", "true");

    const cleanup = () => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch {
        // ignore
      }
      resolve();
    };

    // Safety timeout in case print dialog never fires or is cancelled
    setTimeout(cleanup, 120000);

    iframe.src = `/admin/orders/${orderId}/receipt?autoprint=true`;
    document.body.appendChild(iframe);
  });
}
