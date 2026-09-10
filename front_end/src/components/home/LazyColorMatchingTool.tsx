"use client";

import dynamic from "next/dynamic";
import LazyMount from "@/components/ui/LazyMount";

const ColorMatchingTool = dynamic(() => import("./ColorMatchingTool"), {
  ssr: false,
});

const PLACEHOLDER_CLASS = "min-h-[30rem] sm:min-h-[34rem]";

export default function LazyColorMatchingTool() {
  return (
    <LazyMount fallback={<div className={PLACEHOLDER_CLASS} />}>
      <ColorMatchingTool />
    </LazyMount>
  );
}
