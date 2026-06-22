import Link from 'next/link';
import { Fragment } from 'react';
import { Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  title: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@id': `https://voxcina.com${item.href}`,
        name: item.title,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <nav
        aria-label="مسیر دسترسی"
        className={cn(
          'flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400',
          className
        )}
      >
        <Link
          href="/"
          className="flex items-center hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="sr-only">صفحه اصلی</span>
        </Link>

        {items.map((item, i) => {
          const isLast = i === items.length - 1;

          return (
            <Fragment key={i}>
              <ChevronLeft className="mx-2 w-4 h-4 text-gray-400" />
              {isLast ? (
                <span className="font-medium text-voxcina-blue dark:text-voxcina-cream" aria-current="page">
                  {item.title}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
                >
                  {item.title}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>
    </>
  );
} 