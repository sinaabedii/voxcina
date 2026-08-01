"use client";

import { motion } from "framer-motion";

/**
 * SEO Content Section - Adds keyword-rich content for better SEO
 * Uses H1 keywords: فروشگاه اینترنتی لباس و پوشاک (Online Clothing Store), وکسینا (Voxcina)
 * 
 * Requirements: SEO optimization - H1 keywords in content, multiple paragraphs
 */
export default function SEOContentSection() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.section
      className="container px-4 md:px-8 mb-12 md:mb-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
    >
      <div className="max-w-4xl mx-auto bg-white/80 dark:bg-voxcina-blue/10 backdrop-blur-sm rounded-2xl p-6 md:p-10 shadow-soft border border-voxcina-cream/30 dark:border-voxcina-blue/20">
        <h2 className="text-lg md:text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-6 text-center">
          وکسینا، فروشگاه اینترنتی لباس و پوشاک با کیفیت
        </h2>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed text-sm md:text-base text-right">
          <p>
            <strong>فروشگاه اینترنتی لباس و پوشاک وکسینا</strong> با ارائه جدیدترین و متنوع‌ترین کالکشن‌های مد،
            به شما کمک می‌کند تا با اعتماد به نفس بیشتری ظاهر شوید. ما در وکسینا معتقدیم که هر فردی
            سبک منحصر به فرد خود را دارد و وظیفه ما ارائه گزینه‌های متنوع برای تحقق این سبک است.
          </p>

          <p>
            در فروشگاه اینترنتی وکسینا، شما می‌توانید از میان صدها طرح و مدل <strong>لباس و پوشاک</strong>،
            بهترین گزینه‌ها را انتخاب کنید. از پیراهن‌های شیک و مانتوهای مجلسی گرفته تا شلوار و تی‌شرت‌های روزمره،
            همه و همه با کیفیت عالی و قیمت مناسب در دسترس شماست.
          </p>

          <p>
            تیم طراحی وکسینا با دنبال کردن آخرین ترندهای مد جهانی، محصولاتی را انتخاب می‌کند که
            هم با سلیقه ایرانی همخوانی داشته باشد و هم استانداردهای بین‌المللی پوشاک را رعایت کند.
            ما به کیفیت پارچه، دوخت و طراحی محصولات اهمیت ویژه‌ای می‌دهیم.
          </p>

          <p>
            با خرید از فروشگاه اینترنتی لباس وکسینا، علاوه بر دسترسی به بهترین محصولات پوشاک،
            از خدمات ارسال سریع، ضمانت اصالت کالا و امکان بازگشت آسان بهره‌مند می‌شوید.
            تجربه خرید آنلاین لذت‌بخش را با وکسینا تجربه کنید.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
