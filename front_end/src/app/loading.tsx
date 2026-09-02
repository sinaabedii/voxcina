// Self-contained CSS-only spinner. Previously this imported PageLoading from
// @/components/ui, whose Loading.tsx shared Turbopack's merged UI chunk with
// framer-motion — so the root loading boundary forced framer-motion to be
// eagerly downloaded on every route. Inlining a CSS spinner (the same pattern
// used by (shop)/tryon/loading.tsx) keeps the branded loading look without the
// framer dependency. The other route loading.tsx files still use PageLoading.
export default function RootLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-2 border-voxcina-blue/20 dark:border-voxcina-cream/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-1 rounded-full border-2 border-b-voxcina-blue/40 dark:border-b-voxcina-cream/40 border-t-transparent border-r-transparent border-l-transparent animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-voxcina-blue dark:bg-voxcina-cream animate-pulse-soft"
                  style={{ animationDuration: "0.8s", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium animate-pulse-soft">
          در حال بارگذاری...
        </p>
      </div>
    </div>
  );
}
