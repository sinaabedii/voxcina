import React from "react";
import { CreditCard, Wallet, Truck, Shield, ExternalLink, Check, Calendar, Coins, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PAYMENT_METHODS, PAYMENT_GATEWAYS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface PaymentMethodsProps {
  onSelectMethod: (methodId: string) => void;
  onSelectGateway?: (gatewayId: string) => void;
  selectedMethod?: string;
  selectedGateway?: string;
  snappPayEligibility?: {
    eligible: boolean;
    title_message: string;
    description: string;
  } | null;
  snappPayEligibilityLoading?: boolean;
}

const GATEWAY_FEATURE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  credit: { label: "اعتبار خرید", icon: <Coins className="w-3 h-3" /> },
  wallet: { label: "کیف پول", icon: <Wallet className="w-3 h-3" /> },
  installments: { label: "پرداخت اقساطی", icon: <Calendar className="w-3 h-3" /> },
};

const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  onSelectMethod,
  onSelectGateway,
  selectedMethod = "online",
  selectedGateway = "zibal",
  snappPayEligibility = null,
  snappPayEligibilityLoading = false,
}) => {
  const getPaymentIcon = (id: string) => {
    switch (id) {
      case "online":
        return <CreditCard className="w-5 h-5 ml-2" />;
      case "wallet":
        return <Wallet className="w-5 h-5 ml-2" />;
      case "cod":
        return <Truck className="w-5 h-5 ml-2" />;
      default:
        return <CreditCard className="w-5 h-5 ml-2" />;
    }
  };

  const enabledGateways = PAYMENT_GATEWAYS.filter((g) => g.enabled);

  return (
    <Card className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/10 shadow-sm rounded-2xl backdrop-blur-sm animate-fadeIn">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
          <CreditCard className="w-5 h-5 ml-2" />
          روش پرداخت
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {PAYMENT_METHODS.map((method) => (
            <motion.div
              key={method.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                selectedMethod === method.id
                  ? "border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5 shadow-soft"
                  : "border-voxcina-cream/30 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/30"
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
                  className="ml-2 text-voxcina-blue"
                />
                <label
                  htmlFor={`payment-${method.id}`}
                  className="flex items-center font-medium cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                >
                  {getPaymentIcon(method.id)}
                  {method.title}
                </label>
              </div>
              <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-2 mr-7">
                {method.description}
              </p>

              <AnimatePresence>
                {method.id === "online" && selectedMethod === "online" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 border-t border-voxcina-cream/20 dark:border-voxcina-blue/20 pt-4 mr-1"
                  >
                    <p className="text-sm font-medium mb-3 text-voxcina-blue dark:text-voxcina-cream">درگاه پرداخت:</p>
                    <div className="space-y-3">
                      {enabledGateways.map((gateway) => {
                        const isSelected = selectedGateway === gateway.id;
                        const isSnappPay = gateway.id === "snappay";
                        const isSnappPayAvailable = !snappPayEligibilityLoading && snappPayEligibility?.eligible === true;
                        const isDisabled = isSnappPay && !isSnappPayAvailable;
                        return (
                          <div key={gateway.id}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDisabled) return;
                                onSelectGateway?.(gateway.id);
                              }}
                              aria-disabled={isDisabled}
                              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${
                                isDisabled
                                  ? "cursor-not-allowed border-slate-200 bg-slate-50/80 opacity-60 dark:border-slate-700 dark:bg-slate-900/30"
                                  : isSelected
                                    ? "cursor-pointer border-voxcina-blue bg-voxcina-blue/5 shadow-soft dark:border-voxcina-cream dark:bg-voxcina-cream/5"
                                    : "cursor-pointer border-voxcina-cream/30 hover:border-voxcina-blue/50 dark:border-voxcina-blue/30 dark:hover:border-voxcina-cream/30"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                                  isSelected ? "border-voxcina-blue" : "border-slate-400 dark:border-slate-500"
                                }`}
                              >
                                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-voxcina-blue" />}
                              </span>
                              <div className="relative flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white p-1 dark:bg-voxcina-darkBlue/40">
                                <Image
                                  src={gateway.mobileLogo || gateway.logo}
                                  alt={gateway.name}
                                  width={80}
                                  height={40}
                                  className="max-h-8 object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                                    {gateway.name}
                                  </span>
                                  {gateway.features.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      چند روش پرداخت
                                    </span>
                                  )}
                                </div>
                                {isDisabled && (
                                  <p className="mt-1 text-xs leading-5 text-rose-600 dark:text-rose-400">
                                    {snappPayEligibilityLoading ? "در حال بررسی وضعیت اسنپ‌پی..." : "این درگاه فعلا فعال نیست چند دقیقه بعد امتحان کنید یا تیکت بگذارید"}
                                  </p>
                                )}
                              </div>
                              {isSelected && !isDisabled && (
                                <Check className="w-4 h-4 text-voxcina-blue dark:text-voxcina-cream flex-shrink-0" />
                              )}
                            </div>

                            {!isDisabled && isSelected && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-2 mr-2"
                              >
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {gateway.features.map((feat) => {
                                    const info = GATEWAY_FEATURE_LABELS[feat];
                                    if (!info) return null;
                                    return (
                                      <span
                                        key={feat}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-voxcina-blue/8 text-voxcina-blue dark:bg-voxcina-cream/8 dark:text-voxcina-cream"
                                      >
                                        {info.icon}
                                        {info.label}
                                      </span>
                                    );
                                  })}
                                </div>

                                {isSnappPay ? (
                                  <div className="p-3 rounded-lg bg-gradient-to-l from-sky-50 to-blue-50 dark:from-sky-900/10 dark:to-blue-900/10 border border-sky-200/50 dark:border-sky-700/30">
                                    <div className="flex items-start gap-2">
                                      <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
                                      <div className="text-xs text-sky-800 dark:text-sky-300 leading-5">
                                        <span className="font-bold">{snappPayEligibility?.title_message || "پرداخت اقساطی با اسنپ‌پی"}</span>
                                        <span className="block mt-1">{snappPayEligibility?.description || gateway.description}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : gateway.features.includes("credit") ? (
                                  <div className="p-3 rounded-lg bg-gradient-to-l from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200/50 dark:border-emerald-700/30">
                                    <div className="flex items-start gap-2">
                                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                      <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-5">
                                        <span className="font-bold">خرید اقساطی با دیجی‌پی</span>
                                        <span className="block mt-1">
                                          مبلغ خرید را در <strong>۴ قسط</strong> پرداخت کنید. بدون نیاز به ضامن، فقط با اعتبارسنجی دیجی‌پی.
                                        </span>
                                        <span className="block mt-1 text-emerald-600 dark:text-emerald-400">
                                          اعتبار خرید یا پرداخت تک‌مرحله‌ای نیز در دسترس است.
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2 rounded-lg border border-voxcina-blue/10 bg-voxcina-blue/5 p-3 dark:border-voxcina-cream/10 dark:bg-voxcina-cream/5">
                                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-voxcina-blue dark:text-voxcina-cream" />
                                    <p className="text-xs leading-5 text-voxcina-blue/70 dark:text-voxcina-cream/70">{gateway.description}</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 p-3 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-lg text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 flex items-start">
                      <ExternalLink className="w-4 h-4 ml-2 mt-0.5 text-voxcina-blue dark:text-voxcina-cream flex-shrink-0" />
                      <span>پس از تأیید سفارش، به درگاه پرداخت منتقل خواهید شد.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {method.id === "wallet" && selectedMethod === "wallet" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 border-t border-voxcina-cream/20 dark:border-voxcina-blue/20 pt-4 mr-1"
                >
                  <div className="flex items-center justify-between bg-voxcina-blue/5 dark:bg-voxcina-blue/10 p-3 rounded-lg">
                    <div>
                      <p className="text-sm text-voxcina-blue dark:text-voxcina-cream">موجودی کیف پول</p>
                      <p className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">۱,۲۵۰,۰۰۰ تومان</p>
                    </div>
                    <button className="text-xs border border-voxcina-blue/30 dark:border-voxcina-cream/30 text-voxcina-blue dark:text-voxcina-cream px-3 py-1.5 rounded-lg hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-cream/5 transition-colors">
                      افزایش موجودی
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex items-center mt-6 pt-4 border-t border-voxcina-cream/20 dark:border-voxcina-blue/20">
          <Shield className="w-5 h-5 ml-2 text-voxcina-blue dark:text-voxcina-cream" />
          <span className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">پرداخت امن با رمز دوم پویا</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethods;
