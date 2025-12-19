import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Shop Layout - Server Component
 * 
 * This layout no longer fetches products or categories on mount since
 * all shop pages now use SSR with server-side data fetching.
 * 
 * Requirements: 1.3, 2.1, 3.1 - Data is now fetched server-side in each page
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}