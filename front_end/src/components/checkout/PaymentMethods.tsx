import React from "react";
import { CreditCard, Wallet, Truck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PAYMENT_METHODS } from "@/lib/constants";

interface PaymentMethodsProps {
  onSelectMethod: (methodId: string) => void;
  selectedMethod?: string;
}

const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  onSelectMethod,
  selectedMethod = "online",
}) => {
  const getPaymentIcon = (id: string) => {
    switch (id) {
      case "online":
        return <CreditCard className="w-5 h-5 ml-3" />;
      case "wallet":
        return <Wallet className="w-5 h-5 ml-3" />;
      case "cod":
        return <Truck className="w-5 h-5 ml-3" />;
      default:
        return <CreditCard className="w-5 h-5 ml-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>روش پرداخت</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.id}
              className={`border rounded-md p-4 cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/30"
              }`}
              onClick={() => onSelectMethod(method.id)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  id={`payment-${method.id}`}
                  name="payment-method"
                  checked={selectedMethod === method.id}
                  onChange={() => onSelectMethod(method.id)}
                  className="ml-2"
                />
                <label
                  htmlFor={`payment-${method.id}`}
                  className="flex items-center font-medium cursor-pointer"
                >
                  {getPaymentIcon(method.id)}
                  {method.title}
                </label>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mr-6">
                {method.description}
              </p>

              {method.id === "online" && selectedMethod === "online" && (
                <div className="mt-4 border-t pt-4 mr-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        شماره کارت
                      </label>
                      <input
                        type="text"
                        placeholder="xxxx-xxxx-xxxx-xxxx"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium block mb-1">
                          تاریخ انقضا
                        </label>
                        <input
                          type="text"
                          placeholder="00/00"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">
                          CVV2
                        </label>
                        <input
                          type="text"
                          placeholder="000"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethods;
