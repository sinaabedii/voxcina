"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ColorMatchingTool = dynamic(() => import("./ColorMatchingTool"), {
  ssr: false,
});

const PLACEHOLDER_CLASS = "min-h-[30rem] sm:min-h-[34rem]";

export default function LazyColorMatchingTool() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !("IntersectionObserver" in window)) {
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={!isLoaded ? PLACEHOLDER_CLASS : undefined}>
      {isLoaded && <ColorMatchingTool />}
    </div>
  );
}
