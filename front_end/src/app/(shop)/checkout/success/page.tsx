"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Package, Home, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orderId = searchParams.get("orderId");
  const callbackTransactionId = searchParams.get("transactionId");
  const paymentMethod = searchParams.get("method");

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          router.push("/sign-in");
          return;
        }

        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, router]);

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-14 h-14 text-green-600 dark:text-green-400" />
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4">
          سفارش شما با موفقیت ثبت شد!
        </h1>

        <p className="text-muted-foreground mb-8">
          {paymentMethod === "cod"
            ? "سفارش شما ثبت شد و پس از آماده‌سازی ارسال خواهد شد. مبلغ سفارش هنگام تحویل دریافت می‌شود."
            : "پرداخت شما با موفقیت انجام شد و سفارش در حال پردازش است."}
        </p>

        {orderDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-voxcina-blue/10 border border-border/20 rounded-2xl p-6 mb-8 text-right"
          >
            <h2 className="font-semibold text-lg mb-4 flex items-center">
              <Package className="w-5 h-5 ml-2" />
              جزئیات سفارش
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">شماره سفارش:</span>
                <span className="font-medium">{orderDetails.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وضعیت:</span>
                <span className="font-medium text-green-600">{orderDetails.status_text}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مبلغ کل:</span>
                <span className="font-medium">
                  {orderDetails.total_amount?.toLocaleString("fa-IR")} تومان
                </span>
              </div>
              {(orderDetails.merchant_transaction_id || callbackTransactionId) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">شناسه تراکنش پرداخت:</span>
                  <span className="font-medium font-mono" dir="ltr">
                    {orderDetails.merchant_transaction_id || callbackTransactionId}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/orders">
            <Button variant="primary" className="w-full sm:w-auto">
              <FileText className="w-4 h-4 ml-2" />
              پیگیری سفارش
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 ml-2" />
              بازگشت به صفحه اصلی
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">در حال بارگذاری...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
