import Link from "next/link";

/**
 * Seasonal Collection Banner - Client component for animations
 * Displays the seasonal collection promotional banner
 * 
 * Requirements: 3.4, 5.1
 */
export default function SeasonalCollectionBanner() {
  return (
    <section className="container px-4 md:px-8 mb-16 md:mb-24 overflow-hidden animate-slideUp">
      <div className="relative rounded-3xl bg-gradient-to-br from-secondary-200 via-secondary-100 to-white shadow-soft overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
            <span className="inline-block py-1 px-3 rounded-full bg-voxcina-blue/10 text-voxcina-blue text-xs sm:text-sm mb-3 md:mb-4">
              کالکشن فصلی
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-voxcina-blue">
              طراحی‌های منحصربفرد <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-voxcina-blue to-primary-400">
                برای سبک زندگی مدرن
              </span>
            </h2>

            <p className="text-base md:text-lg text-voxcina-blue/80 mb-6 md:mb-8">
              محصولات طراحی شده با بهترین متریال‌ها که برای راحتی و استایل
              شما طراحی شده‌اند. اکتشاف کنید، انتخاب کنید، و استایل خود را
              ارتقا دهید.
            </p>

            <div>
              <Link
                href="/collection"
                className="inline-flex gap-2 items-center font-medium text-voxcina-blue hover:text-voxcina-darkBlue transition-colors group"
              >
                <span>مشاهده کالکشن</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative h-64 sm:h-72 md:h-auto">
            <div className="absolute inset-0 overflow-hidden rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none">
              <div className="absolute inset-0 bg-gradient-to-br from-voxcina-blue/20 to-voxcina-blue/30 mix-blend-multiply z-10"></div>
              <div className="absolute inset-0 bg-[url('/images/banners/FinalB2.webp')] bg-cover bg-center" />
            </div>
          </div>
        </div>

        <div className="hidden md:block absolute -bottom-6 right-12 w-12 h-12 bg-voxcina-blue rounded-full opacity-20"></div>
        <div className="hidden md:block absolute top-12 left-6 w-24 h-24 bg-secondary-600 rounded-full opacity-10"></div>
      </div>
    </section>
  );
}
