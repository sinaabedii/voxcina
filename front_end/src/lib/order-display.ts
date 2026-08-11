import { Order } from "@/types/order";

const paymentGatewayLabels: Record<string, string> = {
  zibal: "زیبال",
  digipay: "دیجی‌پی",
  snappay: "اسنپ‌پی",
};

export const getPaymentGatewayText = (gateway?: string) =>
  (gateway && paymentGatewayLabels[gateway]) || gateway || "درگاه آنلاین";

export const getPaymentMethodText = (
  order: Pick<Order, "payment_method" | "gateway_name" | "zibal_track_id" | "zibal_ref_number">
) => {
  const gateway = order.gateway_name ||
    (order.zibal_track_id || order.zibal_ref_number ? "zibal" : undefined);

  switch (order.payment_method) {
    case "wallet":
      return "کیف پول";
    case "cod":
      return "پرداخت در محل";
    case "online":
      return `پرداخت آنلاین - ${getPaymentGatewayText(gateway)}`;
    default:
      return gateway ? `پرداخت آنلاین - ${getPaymentGatewayText(gateway)}` : "ثبت نشده";
  }
};
