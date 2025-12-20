import { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

/**
 * Generate dynamic metadata for collection pages
 */
export async function generateMetadata({ params }: { params: { collectionValue: string } }): Promise<Metadata> {
  const collectionValue = decodeURIComponent(params.collectionValue);
  const canonicalPath = `/collection/${params.collectionValue}`;
  
  return {
    title: `کالکشن ${collectionValue} | ${APP_NAME}`,
    description: `مشاهده و خرید محصولات کالکشن ${collectionValue} از فروشگاه آنلاین ${APP_NAME}. جدیدترین محصولات با بهترین قیمت.`,
    keywords: [
      collectionValue,
      'کالکشن',
      'خرید آنلاین',
      'فروشگاه اینترنتی',
      'وکسینا',
    ],
    openGraph: {
      title: `کالکشن ${collectionValue} | ${APP_NAME}`,
      description: `مشاهده و خرید محصولات کالکشن ${collectionValue} از فروشگاه آنلاین ${APP_NAME}`,
      locale: 'fa_IR',
      type: 'website',
    },
    alternates: {
      canonical: canonicalPath,
      languages: {
        'fa': canonicalPath,
        'fa-IR': canonicalPath,
        'x-default': canonicalPath,
      },
    },
  };
}
