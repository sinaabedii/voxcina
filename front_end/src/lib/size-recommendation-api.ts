import {
  SizeRecommendationRequest,
  SizeRecommendationResponse,
} from "@/types/size-recommendation";

export async function requestSizeRecommendation(
  productId: string,
  payload: SizeRecommendationRequest
): Promise<SizeRecommendationResponse> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/size-recommendation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    let message = "نتوانستیم پیشنهاد سایز را دریافت کنیم.";
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error || body.message || message;
    } catch {
      // Keep the Persian fallback when the server does not return JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as SizeRecommendationResponse;
}
