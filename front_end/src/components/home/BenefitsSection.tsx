
/**
 * Benefits Section - Client component for animations
 * Displays store benefits with icons and descriptions
 * 
 * Requirements: 3.4, 5.1
 */
export default function BenefitsSection() {
  const benefits = [
    {
      title: "ارسال سریع و رایگان",
      description: "برای سفارش‌های بالای ۵۰۰ هزار تومان",
      iconPath: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
    },
    {
      title: "ضمانت اصالت کالا",
      description: "تضمین اصل بودن تمامی محصولات",
      iconPath: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
    {
      title: "تنوع محصولات",
      description: "هزاران محصول از صدها برند معتبر",
      iconPath: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    },
    {
      title: "پرداخت امن",
      description: "درگاه‌های پرداخت معتبر و امن",
      iconPath: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    },
  ];

  return (
    <section className="container px-4 md:px-8 mb-16 md:mb-24 animate-slideUp">
      <div className="relative py-10 px-5 sm:py-12 sm:px-6 md:p-16 bg-gradient-to-r from-voxcina-darkBlue to-voxcina-blue rounded-3xl overflow-hidden shadow-medium">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center relative">
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="bg-gradient-to-br from-white/20 to-white/5 text-white p-3 md:p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-soft">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={benefit.iconPath}
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 md:mb-2 text-white">
                {benefit.title}
              </h3>
              <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
