import React, { useState, useEffect } from "react";
import { CreditCard, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { usePayment } from "@/hooks/usePayment";
import { toast } from "react-hot-toast";

interface ZibalPaymentProps {
  orderId: string;
  amount: number;
  description?: string;
  mobile?: string;
  onPaymentSuccess?: (trackId: number, refNumber?: string) => void;
  onPaymentError?: (error: string) => void;
}

const ZibalPayment: React.FC<ZibalPaymentProps> = ({
  orderId,
  amount,
  description,
  mobile,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const { requestPayment, verifyPayment, isLoading } = usePayment();
  const [trackId, setTrackId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "requesting" | "redirecting" | "verifying" | "success" | "failed"
  >("idle");
  const [refNumber, setRefNumber] = useState<string | null>(null);

  const handleInitiatePayment = async () => {
    setPaymentStatus("requesting");

    const response = await requestPayment(orderId, amount, description, mobile);

    if (response && response.trackId && response.payUrl) {
      setTrackId(response.trackId);
      setPaymentStatus("redirecting");

      setTimeout(() => {
        window.location.href = response.payUrl!;
      }, 1500);
    } else {
      setPaymentStatus("failed");
      onPaymentError?.("خطا در ایجاد درخواست پرداخت");
    }
  };

  const handleVerifyPayment = async () => {
    if (!trackId) {
      toast.error("شناسه پرداخت یافت نشد");
      return;
    }

    setPaymentStatus("verifying");

    const response = await verifyPayment(trackId);

    if (response && response.paymentStatus === "paid") {
      setRefNumber(response.refNumber || null);
      setPaymentStatus("success");
      onPaymentSuccess?.(trackId, response.refNumber);
    } else {
      setPaymentStatus("failed");
      onPaymentError?.(response?.statusText || "خطا در تایید پرداخت");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackTrackId = params.get("trackId");

    if (callbackTrackId && !trackId) {
      setTrackId(parseInt(callbackTrackId, 10));
      handleVerifyPayment();
    }
  }, []);

  return (
    <Card className="voxcina-card">
      <CardHeader>
        <CardTitle className="text-primary flex items-center">
          <CreditCard className="ml-2 h-5 w-5" />
          درگاه پرداخت زیبال
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-secondary/30 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">مبلغ پرداخت:</span>
              <span className="text-lg font-bold text-primary">
                {(amount / 1000).toLocaleString("fa-IR")} هزار تومان
              </span>
            </div>
            {trackId && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">شناسه پیگیری:</span>
                <span className="font-mono text-foreground">{trackId}</span>
              </div>
            )}
          </div>

          {paymentStatus === "idle" && (
            <Button
              onClick={handleInitiatePayment}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال پردازش...
                </>
              ) : (
                <>
                  <CreditCard className="ml-2 h-4 w-4" />
                  شروع پرداخت
                </>
              )}
            </Button>
          )}

          {paymentStatus === "requesting" && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />
              <span className="text-muted-foreground">
                در حال ایجاد درخواست پرداخت...
              </span>
            </div>
          )}

          {paymentStatus === "redirecting" && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />
              <span className="text-muted-foreground">
                در حال انتقال به درگاه پرداخت...
              </span>
            </div>
          )}

          {paymentStatus === "verifying" && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />
              <span className="text-muted-foreground">
                در حال تایید پرداخت...
              </span>
            </div>
          )}

          {paymentStatus === "success" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center py-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 ml-2" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  پرداخت با موفقیت انجام شد
                </span>
              </div>
              {refNumber && (
                <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      شماره مرجع تراکنش:
                    </span>
                    <span className="font-mono text-foreground">{refNumber}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center py-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 ml-2" />
                <span className="text-red-700 dark:text-red-300 font-medium">
                  خطا در پرداخت
                </span>
              </div>
              <Button
                onClick={handleInitiatePayment}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  "تلاش مجدد"
                )}
              </Button>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start">
            <AlertCircle className="w-4 h-4 ml-2 mt-0.5 flex-shrink-0" />
            <span>
              پرداخت شما توسط درگاه امن زیبال انجام می‌شود. اطلاعات کارت شما
              محفوظ است.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ZibalPayment;
