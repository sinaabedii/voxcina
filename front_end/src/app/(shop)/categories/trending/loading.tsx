import TexturedBackground from "@/components/ui/TexturedBackground";

/** One muted block. Pulses as a group so the skeleton reads as a single surface. */
function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-voxcina-blue/[0.07] ${className}`} />;
}

/**
 * Skeleton for the ranking, shaped like the page it precedes: a masthead band,
 * a podium of three, then index rows. A spinner would say only that something
 * is happening; this says what is about to arrive, and holds its space so
 * nothing jumps when the data lands.
 */
export default function TrendingLoading() {
  return (
    <div className="animate-pulse-soft">
      <section className="relative isolate overflow-hidden rounded-b-[2.5rem]">
        <TexturedBackground />
        <div className="container flex flex-col items-center px-6 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <Block className="h-3 w-40" />
          <Block className="mt-5 h-12 w-[min(20rem,80vw)] sm:h-16 sm:w-[28rem]" />
          <Block className="mt-6 h-3 w-[min(24rem,88vw)]" />
          <Block className="mt-2.5 h-3 w-[min(18rem,70vw)]" />
          <div className="mt-9 flex gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Block className="h-6 w-14" />
                <Block className="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container pb-20 pt-12 sm:pt-16">
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-12 lg:gap-x-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={
                i === 0
                  ? "col-span-2 lg:col-span-6"
                  : `col-span-1 lg:col-span-3 ${i === 1 ? "lg:pt-16" : "lg:pt-28"}`
              }
            >
              <div className="mb-3 flex items-baseline gap-3 sm:mb-4">
                <Block className={i === 0 ? "h-12 w-12 sm:h-20 sm:w-20" : "h-9 w-9 sm:h-12 sm:w-12"} />
                <span className="h-px flex-1 bg-voxcina-blue/10" />
                <Block className="h-2.5 w-16" />
              </div>
              <Block className={`w-full ${i === 0 ? "aspect-[4/5] rounded-[1.75rem]" : "aspect-[4/5] rounded-[1.25rem]"}`} />
              <Block className={`mt-5 h-4 ${i === 0 ? "w-3/4" : "w-full"}`} />
              <Block className="mt-2 h-3 w-1/2" />
              <Block className={`mt-3 h-5 ${i === 0 ? "w-40" : "w-24"}`} />
            </div>
          ))}
        </div>

        <div className="mt-20 sm:mt-28">
          <div className="mb-2 flex items-baseline justify-between border-b border-voxcina-blue/15 pb-4">
            <Block className="h-5 w-32" />
            <Block className="h-3 w-24" />
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 border-t border-voxcina-blue/10 py-4 first:border-t-0 sm:gap-5 sm:py-5">
              <Block className="h-6 w-7 shrink-0 sm:w-14" />
              <Block className="aspect-[4/5] w-16 shrink-0 sm:w-20 lg:w-24" />
              <div className="min-w-0 flex-1">
                <Block className="h-3.5 w-2/3" />
                <Block className="mt-2 h-3 w-1/3" />
                <Block className="mt-3 hidden h-px w-full max-w-[13rem] sm:block" />
              </div>
              <Block className="hidden h-5 w-28 shrink-0 sm:block" />
              <Block className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
