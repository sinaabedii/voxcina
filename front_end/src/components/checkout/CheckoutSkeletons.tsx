/** One muted block. Pulses as a group so the skeleton reads as a single surface. */
function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-voxcina-blue/[0.07] dark:bg-voxcina-cream/[0.08] ${className}`}
    />
  );
}

/**
 * Skeleton for the checkout delivery-address section, shaped like the loaded
 * state: a grid of address cards (radio + title header, name/address/postal/
 * phone lines) followed by the centered "add address" button.
 */
export function AddressSectionSkeleton() {
  return (
    <div className="animate-pulse-soft" aria-hidden="true">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-voxcina-cream/30 dark:border-voxcina-blue/30 p-4"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Block className="w-4 h-4 rounded-full" />
                <Block className="h-4 w-20" />
              </div>
              <Block className="h-3 w-10" />
            </div>
            <div className="space-y-2">
              <Block className="h-3.5 w-1/2" />
              <Block className="h-3 w-full" />
              <Block className="h-3 w-2/3" />
              <Block className="h-3.5 w-2/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-4">
        <Block className="h-10 w-36" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the shipping-method list, shaped like the loaded rows: radio
 * circle + courier logo + name/service lines on one side, price on the other,
 * and a delivery-time line below.
 */
export function ShippingMethodsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse-soft" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Block className="w-5 h-5 rounded-full" />
              <Block className="w-8 h-8 rounded-lg" />
              <div className="space-y-2">
                <Block className="h-3.5 w-28" />
                <Block className="h-2.5 w-20" />
              </div>
            </div>
            <Block className="h-4 w-20" />
          </div>
          <Block className="mt-3 mr-10 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
