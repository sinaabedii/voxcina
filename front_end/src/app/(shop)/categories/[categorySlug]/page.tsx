import Link from "next/link";

interface CategoryPageProps {
  params: { categorySlug: string };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = params;

  const readableName = decodeURIComponent(categorySlug)
    .replace(/-/g, " ")
    .trim();

  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">
        {readableName || "دسته‌بندی"}
      </h1>
      <p className="text-gray-600 mb-8">
        این صفحه برای دسته‌بندی <span className="font-semibold">{readableName}</span> است.
        به زودی محصولات مرتبط در این صفحه نمایش داده خواهند شد.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        بازگشت به صفحه اصلی
      </Link>
    </main>
  );
}
