import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";

interface PaymentRequestResponse {
  result: number;
  message: string;
  trackId?: number;
  payUrl?: string;
}

interface VerifyPaymentResponse {
  result: number;
  message: string;
  status: number;
  amount: number;
  refNumber?: string;
  cardNumber?: string;
  paidAt?: string;
  description?: string;
  orderId?: string;
  paymentStatus: string;
  statusText: string;
}

interface InquiryPaymentResponse {
  result: number;
  message: string;
  status: number;
  amount: number;
  refNumber?: string;
  cardNumber?: string;
  createdAt?: string;
  paidAt?: string;
  verifiedAt?: string;
  description?: string;
  orderId?: string;
  paymentStatus: string;
  statusText: string;
}

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const usePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPayment = useCallback(
    async (
      orderId: string,
      amount: number,
      description?: string,
      mobile?: string
    ): Promise<PaymentRequestResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/payment/request", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ orderId, amount, description, mobile }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to request payment");
        }

        if (data.result !== 100) {
          throw new Error(data.message || "Payment request failed");
        }

        toast.success("درخواست پرداخت با موفقیت ایجاد شد");
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "خطا در درخواست پرداخت";
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyPayment = useCallback(
    async (trackId: number): Promise<VerifyPaymentResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ trackId }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to verify payment");
        }

        if (data.result !== 100) {
          throw new Error(data.message || "Payment verification failed");
        }

        if (data.paymentStatus === "paid") {
          toast.success("پرداخت با موفقیت تایید شد");
        } else {
          toast.error(`وضعیت پرداخت: ${data.statusText}`);
        }

        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "خطا در تایید پرداخت";
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const inquiryPayment = useCallback(
    async (trackId: number): Promise<InquiryPaymentResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/payment/inquiry", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ trackId }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to inquiry payment");
        }

        if (data.result !== 100) {
          throw new Error(data.message || "Payment inquiry failed");
        }

        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "خطا در استعلام پرداخت";
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    requestPayment,
    verifyPayment,
    inquiryPayment,
    isLoading,
    error,
  };
};
