import Link from "next/link";
import { FolderOpen } from "lucide-react";

/**
 * Category Not Found Page
 * 
 * Displayed when a category is not found (404).
 */
export default function CategoryNotFound() {
  return (
    <div className="container py-12 min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">دسته‌بندی یافت نشد</h1>
        <p className="text-muted-foreground mb-6">
          متأسفانه دسته‌بندی مورد نظر یافت نشد یا وجود ندارد.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-6 py-3 bg-voxcina-blue text-white rounded-lg hover:bg-voxcina-blue/90 transition-colors"
          >
            مشاهده همه محصولات
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-voxcina-blue text-voxcina-blue rounded-lg hover:bg-voxcina-blue/10 transition-colors"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
