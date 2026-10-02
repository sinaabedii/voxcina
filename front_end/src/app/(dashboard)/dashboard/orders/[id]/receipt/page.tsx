"use client";

import { useParams } from "next/navigation";
import OrderReceiptPage from "@/components/orders/OrderReceiptPage";

export default function CustomerOrderReceiptRoute() {
  const params = useParams<{ id: string }>();
  return <OrderReceiptPage audience="customer" orderId={params.id} />;
}
