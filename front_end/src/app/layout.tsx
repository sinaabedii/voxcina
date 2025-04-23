import type { Metadata } from 'next';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ['مد', 'پوشاک', 'لباس', 'فروشگاه آنلاین', 'خرید آنلاین'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}