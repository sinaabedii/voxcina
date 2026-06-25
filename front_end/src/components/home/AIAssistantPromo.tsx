"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Camera, Zap, ArrowLeft, Tag, Wand2 } from "lucide-react";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function AIAssistantPromo() {
  return (
    <motion.section
      className="container px-4 md:px-8 mb-16 md:mb-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainer}
    >
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1020] via-[#0f172a] to-[#1e293b]" />
        
        {/* Animated gradient orbs - CSS only */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-cyan-500/30 to-voxcina-blue/20 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: "0s" }} />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-gradient-to-tr from-voxcina-blue/25 to-purple-500/15 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl animate-pulse-glow" style={{ animationDelay: "0.75s" }} />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 py-12 sm:py-16 md:py-20 px-6 sm:px-8 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            
            {/* Left: Text content */}
            <div className="space-y-6 md:space-y-8">
              <motion.div variants={fadeInUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-voxcina-blue/20 border border-cyan-400/30 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs sm:text-sm font-medium text-cyan-100">
                    اتاق پرو مجازی با هوش مصنوعی
                  </span>
                </span>
              </motion.div>

              <motion.h2
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-white"
                variants={fadeInUp}
              >
                دستیار هوشمند
                <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-voxcina-blue to-purple-400 bg-clip-text text-transparent">
                  پرو مجازی و مذاکره تخفیف
                </span>
              </motion.h2>

              <motion.p
                className="text-sm sm:text-base md:text-lg text-slate-300/90 leading-relaxed max-w-lg"
                variants={fadeInUp}
              >
                عکس خودتو آپلود کن و با هوش مصنوعی لباس‌ها رو روی خودت ببین!
                بعدش با سارا، فروشنده هوشمند وکسینا، برای تخفیف مذاکره کن.
              </motion.p>

              {/* Feature pills */}
              <motion.div
                className="flex flex-wrap gap-3"
                variants={fadeInUp}
              >
                {[
                  { icon: Camera, text: "پرو مجازی" },
                  { icon: Tag, text: "مذاکره تخفیف" },
                  { icon: Zap, text: "پیشنهاد هوشمند" },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                  >
                    <feature.icon className="w-3.5 h-3.5 text-cyan-300" />
                    <span className="text-xs text-slate-200">{feature.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA Button */}
              <motion.div variants={fadeInUp}>
                <Link
                  href="/tryon"
                  className="group inline-flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-voxcina-blue text-white font-bold text-sm sm:text-base shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-300"
                >
                  <Wand2 className="w-5 h-5" />
                  <span>همین الان امتحان کن</span>
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex flex-wrap gap-6 sm:gap-10 pt-4"
                variants={fadeInUp}
              >
                {[
                  { value: "۱۰۰۰+", label: "پرو روزانه" },
                  { value: "۹۸٪", label: "رضایت کاربران" },
                  { value: "۲۴/۷", label: "آماده مذاکره" },
                ].map((stat, index) => (
                  <div key={index} className="text-center sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-cyan-400">
                      {stat.value}
                    </div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Visual element */}
            <motion.div
              className="relative flex items-center justify-center"
              variants={scaleIn}
            >
              {/* Decorative rings */}
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full border border-cyan-500/20 animate-[spin_30s_linear_infinite]" />
              <div className="absolute w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full border border-voxcina-blue/30 animate-[spin_25s_linear_infinite_reverse]" />
              <div className="absolute w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full border border-purple-500/20 animate-[spin_35s_linear_infinite]" />

              {/* Main chat mockup */}
              <div className="relative z-10 w-full max-w-xs sm:max-w-sm animate-float">
                <div className="rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/50">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-voxcina-blue flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">اتاق پرو مجازی</div>
                      <div className="text-[10px] text-emerald-300">آنلاین</div>
                    </div>
                  </div>

                  {/* Try-on mockup content */}
                  <div className="p-4 space-y-3">
                    {/* Try-on result bubble */}
                    <div className="flex justify-center">
                      <div className="w-28 h-28 rounded-2xl bg-slate-800/60 border border-white/10 p-2 flex flex-col items-center gap-1.5">
                        <div className="flex-1 w-full rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center overflow-hidden">
                          <div className="w-full h-full flex items-center justify-center gap-0.5">
                            <div className="w-1/2 h-4/5 rounded-lg bg-cyan-500/20 border border-cyan-400/30" />
                            <ArrowLeft className="w-3 h-3 text-cyan-400" />
                            <div className="w-1/2 h-4/5 rounded-lg bg-gradient-to-br from-cyan-400/40 to-voxcina-blue/40 border border-cyan-400/50" />
                          </div>
                        </div>
                        <span className="text-[10px] text-cyan-300">نتیجه پرو مجازی</span>
                      </div>
                    </div>

                    {/* Sara's message */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-md bg-slate-800/80 border border-white/10 text-slate-100 text-xs sm:text-sm">
                        <div className="flex items-center gap-1 mb-1 text-cyan-300 text-[10px]">
                          <Sparkles className="w-3 h-3" />
                          <span>سارا - فروشنده هوشمند</span>
                        </div>
                        چه استایل قشنگی شده! 🎉 می‌تونم یه تخفیف ویژه برات در نظر بگیرم
                      </div>
                    </div>

                    {/* Coupon preview */}
                    <div className="rounded-xl bg-slate-800/60 border border-emerald-500/30 p-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">۱۵٪ تخفیف ویژه</span>
                        <span className="mr-auto text-[10px] text-slate-400">۱۰:۰۰</span>
                      </div>
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="px-4 py-3 border-t border-white/10 bg-slate-950/50">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-9 rounded-xl bg-slate-800/50 border border-white/10 flex items-center px-3">
                        <span className="text-[11px] text-slate-500">بیشتر تخفیف بده...</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-voxcina-blue flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating decorative elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400/80 to-orange-500/80 flex items-center justify-center shadow-lg animate-badge-float">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>

                <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/80 to-pink-500/80 flex items-center justify-center shadow-lg animate-badge-float" style={{ animationDelay: "0.5s" }}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>
    </motion.section>
  );
}
