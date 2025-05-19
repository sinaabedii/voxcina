'use client';

// import Link from 'next/link';
// import { APP_NAME } from '@/lib/constants';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* <header className="py-4 border-b">
        <div className="container flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            {APP_NAME}
          </Link>
        </div>
      </header> */}
      
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      
      {/* <footer className="py-6 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {APP_NAME}. تمامی حقوق محفوظ است.
        </div>
      </footer> */}
    </div>
  );
}