import React from "react";
import { CreditCard, Wallet, Truck, Shield, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PAYMENT_METHODS } from "@/lib/constants";
import { motion } from "framer-motion";

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1 text-foreground">
                        شماره کارت
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="xxxx-xxxx-xxxx-xxxx"
                          className="voxcina-input w-full pl-9"
                        />
                        <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium block mb-1 text-foreground">
                          تاریخ انقضا
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="00/00"
                            className="voxcina-input w-full pl-8"
                          />
                          <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1 text-foreground">
                          CVV2
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="000"
                            className="voxcina-input w-full pl-8"
                          />
                          <Shield className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground flex items-start">
                    <Shield className="w-4 h-4 ml-2 mt-0.5 text-primary" />
                    <span>تمامی اطلاعات کارت شما به صورت ایمن و با استفاده از پروتکل‌های امنیتی پیشرفته منتقل می‌شود. اطلاعات کارت شما در سیستم ذخیره نخواهد شد.</span>
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