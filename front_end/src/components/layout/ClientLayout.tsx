"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/components/auth/AuthProvider";

const ChatBot = dynamic(() => import("@/components/module/ChatBot"), {
  ssr: false,
  loading: () => null,
});

const AssistantWidget = dynamic(() => import("@/components/module/AssistantWidget"), {
  ssr: false,
  loading: () => null,
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // Only shows on home page
  const isHomePage = pathname === "/";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      {children}
      {isHomePage && <ChatBot />}
      {/* {isHomePage && <AssistantWidget />} */}
    </AuthProvider>
  );
}
