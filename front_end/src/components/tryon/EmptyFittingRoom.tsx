"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, Shirt, ShoppingBag, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";

interface EmptyFittingRoomProps {
  /** Nothing in the cart at all, as opposed to nothing that can be tried on. */
  cartIsEmpty: boolean;
}

const TRYON_GUIDE_STEPS = [
  {
    icon: Shirt,
    title: "انتخاب لباس‌های دارای نشان پرو",
    description: "محصولاتی که تگ «پرو مجازی» دارند را به سبد خرید خود اضافه کنید.",
  },
  {
    icon: Camera,
    title: "آپلود عکس با نور مناسب",
    description: "یک عکس تمام‌قد یا نیم‌تنه با پس‌زمینه ساده برای پرو آپلود نمایید.",
  },
  {
    icon: Sparkles,
    title: "پرو هوش مصنوعی و مشاوره استایل",
    description: "لباس را روی تن خود ببینید و با هوش مصنوعی ووکسا گفتگو کنید.",
  },
];

export default function EmptyFittingRoom({ cartIsEmpty }: EmptyFittingRoomProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 md:py-16 text-center flex-1 max-w-2xl mx-auto w-full px-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-voxcina-blue/10 dark:bg-voxcina-cream/10 border border-voxcina-blue/15 dark:border-voxcina-cream/15 flex items-center justify-center mb-5 text-voxcina-blue dark:text-voxcina-cream shadow-soft">
        {cartIsEmpty ? (
          <ShoppingBag className="h-8 w-8 md:h-10 md:w-10" />
        ) : (
          <Shirt className="h-8 w-8 md:h-10 md:w-10" />
        )}
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2 tracking-tight">
        {cartIsEmpty
          ? "سبد خرید شما برای پرو مجازی خالی است"
          : "محصولات سبد خرید قابلیت پرو مجازی ندارند"}
      </h2>

      <p className="text-xs md:text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-8 max-w-md leading-relaxed">
        {cartIsEmpty
          ? "برای استفاده از اتاق پرو هوشمند، ابتدا لباس‌های مورد علاقه خود را به سبد خرید اضافه کنید."
          : "تنها محصولاتی که مدل پرو مجازی آنها در سیستم ثبت شده، در این بخش نمایش داده می‌شوند."}
      </p>

      {/* 3-Step Feature Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8 text-right">
        {TRYON_GUIDE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-background dark:bg-voxcina-blue/15 border border-secondary-300 dark:border-voxcina-blue/30 shadow-soft flex flex-col items-start gap-2"
            >
              <div className="w-8 h-8 rounded-xl bg-voxcina-blue/10 dark:bg-voxcina-cream/10 text-voxcina-blue dark:text-voxcina-cream flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
                {step.title}
              </h3>
              <p className="text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      <Link href="/products" className="inline-block">
        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowLeft className="h-4 w-4" />}
          className="rounded-xl shadow-soft hover:shadow-medium font-bold px-6"
        >
          مشاهده محصولات فروشگاه
        </Button>
      </Link>
    </motion.div>
  );
}
