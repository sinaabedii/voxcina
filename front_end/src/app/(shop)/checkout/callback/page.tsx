"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { activityTracker } from "@/lib/activity-tracker";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "abandoned" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [gateway, setGateway] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayment = async () => {
    if (!orderId) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/sign-in");
      return;
    }
    setIsRetrying(true);
    try {
      const body: { orderId: string; gateway?: string } = { orderId };
      if (gateway) body.gateway = gateway;
      const res = await fetch("/api/payment/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        setMessage(data.error || "خطا در ایجاد درخواست پرداخت");
        setIsRetrying(false);
      }
    } catch (e) {
      setMessage("خطا در اتصال به سرور");
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get("success");
      const trackIdParam = searchParams.get("trackId");
      const transactionIdParam = searchParams.get("transactionId");
      const orderIdParam = searchParams.get("orderId");
      const paymentStatus = searchParams.get("status");
      const gatewayParam = searchParams.get("gateway");

      setPaymentReference(transactionIdParam || trackIdParam);
      setOrderId(orderIdParam);
      if (gatewayParam) setGateway(gatewayParam);

      if (success === "1") {
        await clearCart();
        setStatus("success");
        setMessage("پرداخت با موفقیت انجام شد");
        activityTracker.trackPaymentSuccess(orderIdParam ?? "", {
          trackId: transactionIdParam || trackIdParam,
          gateway: searchParams.get("gateway") ?? undefined,
          source: "payment_callback",
        });
        setTimeout(() => {
          const reference = transactionIdParam || trackIdParam || "";
          router.push(`/checkout/success?orderId=${orderIdParam}&transactionId=${encodeURIComponent(reference)}`);
        }, 1500);
      } else if (paymentStatus === "abandoned") {
        // User pressed back on payment page
        setStatus("abandoned");
        setMessage("پرداخت تکمیل نشد. میتوانید دوباره تلاش کنید.");
        activityTracker.trackPaymentFailed(orderIdParam, "abandoned", {
          trackId: transactionIdParam || trackIdParam,
          source: "payment_callback",
        });
      } else {
        const error = searchParams.get("error");
        if (error === "inventory_unavailable") {
          await clearCart();
          setOrderId(null);
          setStatus("failed");
          setMessage("به دلیل اتمام موجودی، پرداخت شما برگشت داده شد. لطفاً محصول دیگری انتخاب کنید.");
          return;
        }
        if (error === "finalize_pending" && orderIdParam) {
          // SnappPay settle succeeded but status confirmation timed out.
          // The reconciler will finalize the order within minutes.
          await clearCart();
          setTimeout(() => {
            const reference = transactionIdParam || trackIdParam || "";
            router.push(`/checkout/success?orderId=${orderIdParam}&transactionId=${encodeURIComponent(reference)}`);
          }, 1500);
          setStatus("success");
          setMessage("پرداخت با موفقیت انجام شد");
          return;
        }
        setStatus("failed");
        setMessage(paymentStatus === "cancelled" ? "پرداخت توسط شما لغو شد" : "پرداخت ناموفق بود");
        activityTracker.trackPaymentFailed(
          orderIdParam,
          paymentStatus === "cancelled" ? "cancelled" : "gateway_failed",
          {
            trackId: transactionIdParam || trackIdParam,
            source: "payment_callback",
          }
        );
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
            {paymentReference && (
              <p className="text-sm text-muted-foreground">
                شناسه تراکنش: <span className="font-mono">{paymentReference}</span>
              </p>
            )}
          </>
        )}

        {status === "abandoned" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <XCircle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-amber-600 dark:text-amber-400 mb-2">
              پرداخت ناتمام
            </h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {orderId && (
                <Button 
                  variant="primary"
                  onClick={handleRetryPayment}
                  disabled={isRetrying}
                >
                  {isRetrying ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />در حال انتقال...</> : "تلاش مجدد پرداخت"}
                </Button>
              )}
              <Link href="/cart">
                <Button variant="outline">بازگشت به سبد خرید</Button>
              </Link>
            </div>
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
                <Button 
                  variant="primary"
                  onClick={handleRetryPayment}
                  disabled={isRetrying}
                >
                  {isRetrying ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />در حال انتقال...</> : "تلاش مجدد"}
                </Button>
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
