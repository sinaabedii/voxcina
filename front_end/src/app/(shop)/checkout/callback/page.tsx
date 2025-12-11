"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get("success");
      const trackIdParam = searchParams.get("trackId");
      const orderIdParam = searchParams.get("orderId");

      setTrackId(trackIdParam);
      setOrderId(orderIdParam);

      if (success === "1") {
        // Payment was successful - clear cart and redirect
        clearCart();
        setStatus("success");
        setMessage("پرداخت با موفقیت انجام شد");
        // Redirect to success page after a short delay
        setTimeout(() => {
          router.push(`/checkout/success?orderId=${orderIdParam}&trackId=${trackIdParam}`);
        }, 1500);
      } else {
        // Payment failed or was cancelled - keep cart items for retry
        setStatus("failed");
        setMessage("پرداخت انجام نشد یا لغو شد");
      }
    };

    handleCallback();
  }, [searchParams, router, clearCart]);

  return (
    <div className="container py-16 flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h1 className="text-xl font-bold mb-2">در حال بررسی پرداخت...</h1>
            <p className="text-muted-foreground">لطفاً صبر کنید</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
              {message}
            </h1>
            <p className="text-muted-foreground mb-4">در حال انتقال به صفحه سفارش...</p>
            {trackId && (
              <p className="text-sm text-muted-foreground">
                کد پیگیری: <span className="font-mono">{trackId}</span>
              </p>
            )}
          </>
        )}

        {status === "failed" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
              پرداخت ناموفق
            </h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {orderId && (
                <Link href={`/checkout?retry=${orderId}`}>
                  <Button variant="primary">تلاش مجدد</Button>
                </Link>
              )}
              <Link href="/cart">
                <Button variant="outline">بازگشت به سبد خرید</Button>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h1 className="text-xl font-bold mb-2">در حال بررسی پرداخت...</h1>
            <p className="text-muted-foreground">لطفاً صبر کنید</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
