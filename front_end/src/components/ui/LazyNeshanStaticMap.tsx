"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import LazyMount from "./LazyMount";
import type NeshanStaticMap from "./NeshanStaticMap";

/**
 * Neshan map, kept off the critical path.
 *
 * The chunk behind it is mapbox-gl: ~431 KB gzipped and 3.8s of script bootup on
 * a throttled phone. Loading it eagerly saturated the main thread while the page
 * was still trying to paint its LCP element — /contact measured LCP 11.6s and
 * TBT 3.0s. The map sits far below the fold, so it waits for the viewport.
 */
const NeshanStaticMapDynamic = dynamic(() => import("./NeshanStaticMap"), {
  ssr: false,
});

type Props = ComponentProps<typeof NeshanStaticMap>;

export default function LazyNeshanStaticMap(props: Props) {
  return (
    <LazyMount
      className="h-full w-full"
      fallback={
        <div
          className="flex h-full w-full items-center justify-center bg-voxcina-cream/30 dark:bg-voxcina-blue/20"
          style={{ minHeight: "384px" }}
        >
          <Loader2
            className="h-5 w-5 animate-spin text-voxcina-blue/50 dark:text-voxcina-cream/50"
            aria-hidden="true"
          />
        </div>
      }
    >
      <NeshanStaticMapDynamic {...props} />
    </LazyMount>
  );
}
