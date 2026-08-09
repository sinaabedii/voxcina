"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MessageSquare } from "lucide-react";

const ChatBot = dynamic(() => import("@/components/module/ChatBot"), {
  ssr: false,
  loading: () => null,
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isChatBotLoaded, setIsChatBotLoaded] = useState(false);
  const pathname = usePathname();

  // Only shows on home page
  const isHomePage = pathname === "/";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isHomePage) {
      setIsChatBotLoaded(false);
    }
  }, [isHomePage]);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      {children}
      {isHomePage && (
        isChatBotLoaded ? (
          <ChatBot initialOpen />
        ) : (
          <button
            type="button"
            onClick={() => setIsChatBotLoaded(true)}
            aria-label="باز کردن دستیار گفتگو"
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A3C69] text-white shadow-xl transition-colors hover:bg-[#15325a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3C69] focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
          </button>
        )
      )}
    </AuthProvider>
  );
}
