"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, AlertTriangle, Clock, Percent, Tag } from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { UserVoucher } from "@/types/discount";
import { cn } from "@/lib/utils";

interface VoucherCardProps {
  voucher: UserVoucher;
  index: number;
}

export function VoucherCard({ voucher, index }: VoucherCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = voucher.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isNegotiated = voucher.type === "negotiated";
  const isPercentage = voucher.discount_type === "percentage";

  const discountLabel = isPercentage
    ? `${voucher.value}٪`
    : `${voucher.value.toLocaleString("fa-IR")} تومان`;

  const validUntil = new Date(voucher.valid_until);
  const now = new Date();
  const diffMs = validUntil.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isExpiringSoon = diffMs < 1000 * 60 * 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "overflow-hidden border-2 transition-all duration-300 hover:shadow-lg",
          isNegotiated
            ? "border-purple-200 dark:border-purple-800/40"
            : "border-voxcina-cream dark:border-voxcina-blue/30"
        )}
      >
        <div
          className={cn(
            "px-5 py-4 flex items-center justify-between",
            isNegotiated
              ? "bg-gradient-to-l from-purple-600 to-voxcina-blue"
              : "bg-gradient-to-l from-voxcina-blue to-voxcina-darkBlue"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {discountLabel}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isPercentage ? (
                  <Percent className="w-3.5 h-3.5 text-white/80" />
                ) : (
                  <Tag className="w-3.5 h-3.5 text-white/80" />
                )}
                <span className="text-white/90 text-xs">
                  {isPercentage ? "تخفیف درصدی" : "تخفیف ثابت"}
                </span>
              </div>
              <p className="text-white text-sm font-medium">
                {voucher.description}
              </p>
            </div>
          </div>

          {isNegotiated && (
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              اتاق پرو
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between bg-secondary-50 dark:bg-voxcina-blue/10 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                کد تخفیف:
              </span>
              <code className="font-mono font-semibold text-voxcina-blue dark:text-voxcina-cream text-sm tracking-wider">
                {voucher.code}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-3 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 ml-1 text-green-500" />
                  <span className="text-green-500">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 ml-1" />
                  کپی
                </>
              )}
            </Button>
          </div>

          {isNegotiated && (
            <div
              className={cn(
                "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
                isExpiringSoon
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {diffHours > 0
                  ? `${diffHours} ساعت و ${diffMinutes} دقیقه اعتبار باقی‌مانده`
                  : `${diffMinutes} دقیقه اعتبار باقی‌مانده`}
              </span>
            </div>
          )}

          {voucher.valid_from && !isNegotiated && (
            <div className="flex items-center gap-2 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 px-3 py-2 bg-secondary-50 dark:bg-voxcina-blue/10 rounded-lg">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                اعتبار تا{" "}
                {validUntil.toLocaleDateString("fa-IR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {voucher.required_products.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream">
                  محصولات مورد نیاز:
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {voucher.required_products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group flex items-center gap-2.5 bg-white dark:bg-voxcina-blue/10 border border-voxcina-cream/50 dark:border-voxcina-blue/20 rounded-xl p-2.5 hover:shadow-md transition-all duration-200 hover:border-voxcina-blue/30 dark:hover:border-voxcina-cream/30"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary-50 dark:bg-voxcina-blue/20 shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-voxcina-blue/30 dark:text-voxcina-cream/30">
                          <Tag className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-voxcina-blue dark:text-voxcina-cream truncate max-w-[120px] group-hover:text-voxcina-blue/80 dark:group-hover:text-voxcina-cream/80">
                        {product.name}
                      </p>
                      {product.color_name && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {product.color && product.color.startsWith("#") && (
                            <span
                              className="w-3 h-3 rounded-full border border-gray-200 dark:border-gray-600 inline-block"
                              style={{ backgroundColor: product.color }}
                            />
                          )}
                          <span className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
                            {product.color_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-voxcina-blue/30 dark:text-voxcina-cream/30 group-hover:text-voxcina-blue/60 dark:group-hover:text-voxcina-cream/60 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
              <p className="text-[11px] text-voxcina-blue/50 dark:text-voxcina-cream/50 leading-relaxed">
                این کد تخفیف فقط زمانی قابل استفاده است که محصولات بالا در سبد
                خرید شما باشند.
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
