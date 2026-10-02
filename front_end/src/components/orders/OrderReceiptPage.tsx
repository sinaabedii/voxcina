"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Printer, RefreshCw } from "lucide-react";
import OrderReceipt from "./OrderReceipt";
import styles from "./order-receipt.module.css";
import type { OrderReceipt as Receipt } from "@/types/order-receipt";

type ReceiptAudience = "customer" | "admin";

function receiptEndpoint(audience: ReceiptAudience, orderId: string) {
  return audience === "admin" ? `/api/admin/orders/${orderId}/receipt` : `/api/orders/${orderId}/receipt`;
}

function readAuthToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("authToken");
}

export default function OrderReceiptPage({ audience, orderId }: { audience: ReceiptAudience; orderId: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printedReceiptId = useRef<string | null>(null);
  const autoprint = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("autoprint") === "true";

  const loadReceipt = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = readAuthToken();
      const response = await fetch(receiptEndpoint(audience, orderId), {
        signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error("برای مشاهده این فاکتور باید وارد حساب خود شوید.");
        if (response.status === 404) throw new Error("فاکتور سفارش پیدا نشد.");
        throw new Error("دریافت فاکتور با مشکل روبه‌رو شد.");
      }
      setReceipt((await response.json()) as Receipt);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "دریافت فاکتور با مشکل روبه‌رو شد.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [audience, orderId]);

  useEffect(() => {
    if (!orderId) return;
    const controller = new AbortController();
    void loadReceipt(controller.signal);
    return () => controller.abort();
  }, [loadReceipt, orderId]);

  const print = useCallback(async () => {
    if (!receipt || isPrinting) return;
    if (autoprint) printedReceiptId.current = receipt.id;
    setIsPrinting(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const images = Array.from(document.querySelectorAll<HTMLImageElement>(".receipt-print-root img"));
      await Promise.all(images.map((image) => image.complete ? image.decode().catch(() => undefined) : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      window.focus();
      window.print();
    } finally {
      // The browser owns the print dialog; the button should not look busy
      // while a user is deciding whether to print.
      setIsPrinting(false);
    }
  }, [autoprint, isPrinting, receipt]);

  useEffect(() => {
    if (!receipt || !autoprint || printedReceiptId.current === receipt.id) return;
    let cancelled = false;
    const run = async () => {
      // This effect runs after the receipt DOM has committed. Readiness checks
      // below replace the old arbitrary print-before-render delay.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      // Mark only at the last possible moment. Strict Mode replays effects;
      // marking during setup would cancel both the first and replayed effect.
      if (!cancelled && printedReceiptId.current !== receipt.id) {
        printedReceiptId.current = receipt.id;
        await print();
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [autoprint, print, receipt]);

  if (isLoading) {
    return <div className={styles.workspace}><div className={styles.stateCard}><span className={styles.spinner} /><p>در حال آماده‌سازی فاکتور...</p></div></div>;
  }

  if (!receipt || error) {
    return (
      <div className={styles.workspace}>
        <div className={styles.stateCard} role="alert">
          <AlertCircle className={styles.errorIcon} />
          <h1>{error || "فاکتور پیدا نشد"}</h1>
          <p>اطلاعات سفارش در دسترس نیست. می‌توانید دوباره تلاش کنید.</p>
          <div className={styles.stateActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => void loadReceipt()}><RefreshCw size={15} /> تلاش دوباره</button>
            <Link className={styles.secondaryButton} href={audience === "admin" ? `/admin/orders/${orderId}` : `/dashboard/orders/${orderId}`}><ArrowRight size={15} /> بازگشت</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.workspace} receipt-print-root`}>
      <div className={`${styles.toolbar} print:hidden`}>
        <Link className={styles.secondaryButton} href={audience === "admin" ? `/admin/orders/${orderId}` : `/dashboard/orders/${orderId}`}><ArrowRight size={15} /> بازگشت به سفارش</Link>
        <div className={styles.toolbarActions}>
          <span className={styles.hint}>فاکتور آماده چاپ روی کاغذ A5 است.</span>
          <button type="button" className={styles.primaryButton} onClick={() => void print()} disabled={isPrinting}><Printer size={16} /> {isPrinting ? "آماده‌سازی..." : "چاپ فاکتور"}</button>
        </div>
      </div>
      <OrderReceipt receipt={receipt} />
      <p className={`${styles.screenNote} print:hidden`}>پس از چاپ، این صفحه باز می‌ماند تا بتوانید دوباره چاپ کنید.</p>
    </div>
  );
}
