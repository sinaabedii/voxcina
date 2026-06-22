import Link from 'next/link';

export default function BlogNotFound() {
  return (
    <div className="container py-20">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-soft">
        <h1 className="mb-4 text-3xl font-bold text-voxcina-blue">مقاله مورد نظر یافت نشد!</h1>
        <p className="mb-8 text-lg text-gray-600">
          متأسفانه مقاله‌ای که به دنبال آن هستید وجود ندارد یا ممکن است حذف شده باشد.
        </p>
        <Link
          href="/blog"
          className="inline-block rounded-xl bg-voxcina-blue px-6 py-3 font-medium text-white transition-colors hover:bg-voxcina-darkBlue"
        >
          بازگشت به صفحه بلاگ
        </Link>
      </div>
    </div>
  );
} 