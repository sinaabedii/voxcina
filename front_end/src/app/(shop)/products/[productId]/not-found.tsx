import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

/**
 * 404 Not Found page for product detail pages.
 * Displayed when a product is not found.
 * 
 * Requirements: 1.5 - Return 404 status code with user-friendly error page
 */
export default function ProductNotFound() {
  return (
    <div className="container py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 border border-red-100 dark:border-red-800/30 shadow-sm">
        <X className="h-10 w-10 text-red-500 dark:text-red-400" />
      </div>
      
      <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4">
        محصول یافت نشد
      </h1>
      
      <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6 text-center max-w-md">
        متأسفانه نمی‌توانیم اطلاعات این محصول را پیدا کنیم. لطفاً بعداً دوباره
        تلاش کنید یا به صفحه محصولات بازگردید.
      </p>
      
      <Link
        href="/products"
        className="inline-flex items-center px-5 py-2.5 bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream text-white dark:text-voxcina-blue font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
      >
        <ArrowRight className="w-4 h-4 ml-2" />
        بازگشت به صفحه محصولات
      </Link>
    </div>
  );
}
