"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center ">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
