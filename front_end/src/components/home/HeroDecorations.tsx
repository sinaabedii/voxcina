import React from "react";

/**
 * The two blurred colour blobs in the hero corners.
 *
 * Extracted so the admin preview renders the exact same decoration the
 * storefront does when the "decorative blobs" switch is on.
 */
export default function HeroDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-10 -right-10 sm:-top-16 md:-top-20 sm:-right-16 md:-right-20 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-60 lg:h-60 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-xl" />
      <div className="absolute -bottom-10 -left-10 sm:-bottom-16 md:-bottom-20 sm:-left-16 md:-left-20 w-32 h-32 sm:w-48 sm:h-48 md:w-60 md:h-60 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 blur-xl" />
    </div>
  );
}
