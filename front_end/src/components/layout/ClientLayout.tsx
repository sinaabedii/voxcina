"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <ChatBot />
    </>
  );
}
