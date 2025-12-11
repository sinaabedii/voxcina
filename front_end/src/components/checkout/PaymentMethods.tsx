import React, { useState } from "react";
import { CreditCard, Wallet, Truck, Shield, ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PAYMENT_METHODS } from "@/lib/constants";
import { motion } from "framer-motion";

// Available payment gateways
const PAYMENT_GATEWAYS = [
  {
    id: "zibal",
    name: "زیبال",
    logo: "/images/payment/zibal.png",
    description: "درگاه پرداخت امن زیبال",
  },
];

interface PaymentMethodsProps {
  onSelectMethod: (methodId: string) => void;
  selectedMethod?: string;
  onSelectGateway?: (gatewayId: string) => void;
  selectedGateway?: string;
}

const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  onSelectMethod,
  selectedMethod = "online",
  onSelectGateway,
  selectedGateway = "zibal",
}) => {
  const [internalSelectedGateway, setInternalSelectedGateway] = useState(selectedGateway);

  const handleGatewaySelect = (gatewayId: string) => {
    setInternalSelectedGateway(gatewayId);
    onSelectGateway?.(gatewayId);
  };

  const getPaymentIcon = (id: string) => {
    switch (id) {
      case "online":
        return <CreditCard className="w-5 h-5 ml-3 text-primary" />;
      case "wallet":
        return <Wallet className="w-5 h-5 ml-3 text-primary" />;
      case "cod":
        return <Truck className="w-5 h-5 ml-3 text-primary" />;
      default:
        return <CreditCard className="w-5 h-5 ml-3 text-primary" />;
    }
  };

  return (
    <Card className="voxcina-card animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-primary flex items-center">
          <CreditCard className="ml-2 h-5 w-5" />
          روش پرداخت
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {PAYMENT_METHODS.map((method) => (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                selectedMethod === method.id
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border/10 hover:border-primary/30 hover:shadow-soft"
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
                  className="ml-2 text-primary focus:ring-primary/30"
                />
                <label
                  htmlFor={`payment-${method.id}`}
                  className="flex items-center font-medium cursor-pointer hover:text-primary transition-colors duration-200"
                >
                  {getPaymentIcon(method.id)}
                  {method.title}
                </label>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mr-6">
                {method.description}
              </p>

              {method.id === "online" && selectedMethod === "online" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 border-t border-border/10 pt-4 mr-6"
                >
                  <p className="text-sm font-medium mb-3 text-foreground">
                    انتخاب درگاه پرداخت:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_GATEWAYS.map((gateway) => (
                      <motion.div
                        key={gateway.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative border rounded-lg p-3 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                          internalSelectedGateway === gateway.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/20 hover:border-primary/40"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGatewaySelect(gateway.id);
                        }}
                      >
                        {internalSelectedGateway === gateway.id && (
                          <CheckCircle2 className="absolute top-2 left-2 w-4 h-4 text-primary" />
                        )}
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-border/10">
                          <img
                            src={gateway.logo}
                            alt={gateway.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold text-primary">${gateway.name.charAt(0)}</span>`;
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{gateway.name}</p>
                          <p className="text-xs text-muted-foreground">{gateway.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start">
                    <ExternalLink className="w-4 h-4 ml-2 mt-0.5 flex-shrink-0" />
                    <span>پس از ثبت سفارش، به درگاه پرداخت منتقل خواهید شد تا پرداخت را به صورت امن انجام دهید.</span>
                  </div>
                  
                  <div className="mt-3 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground flex items-start">
                    <Shield className="w-4 h-4 ml-2 mt-0.5 text-primary flex-shrink-0" />
                    <span>تمامی تراکنش‌ها از طریق درگاه‌های معتبر بانکی و با رعایت استانداردهای امنیتی انجام می‌شود.</span>
                  </div>
                </motion.div>
              )}
              
              {method.id === "wallet" && selectedMethod === "wallet" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 border-t border-border/10 pt-4 mr-6"
                >
                  <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg">
                    <div>
                      <p className="text-sm text-foreground">موجودی کیف پول</p>
                      <p className="text-lg font-bold text-primary">۱,۲۵۰,۰۰۰ تومان</p>
                    </div>
                    <button className="voxcina-button-secondary text-xs">افزایش موجودی</button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/10">
          <div className="flex items-center">
            <Shield className="w-5 h-5 ml-2 text-primary" />
            <span className="text-sm text-muted-foreground">پرداخت امن</span>
          </div>
          <div className="flex">
            <img src="/images/payment/shaparak.png" alt="شاپرک" className="h-8 ml-2 opacity-70 hover:opacity-100 transition-opacity duration-200" />
            <img src="/images/payment/shetab.png" alt="شتاب" className="h-8 opacity-70 hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethods;