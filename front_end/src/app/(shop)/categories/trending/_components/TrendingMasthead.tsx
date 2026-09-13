import MastheadSurface from "./MastheadSurface";
import { faNumber } from "./trending-utils";

interface TrendingMastheadProps {
  designCount: number;
  totalViews: number;
  brandCount: number;
}

/**
 * The page's masthead.
 *
 * Centred over the brand's textured cream field, matching the collection
 * intros. The asymmetry comes from the surface behind it — navy weighted to the
 * top-right, brass to the bottom-left — rather than from shunting the headline
 * off-axis, which in RTL would push it straight under the navy corner.
 */
export default function TrendingMasthead({
  designCount,
  totalViews,
  brandCount,
}: TrendingMastheadProps) {
  const stats = [
    { value: faNumber(designCount), label: "طرح در فهرست" },
    { value: faNumber(totalViews), label: "بازدید ثبت‌شده" },
    { value: faNumber(brandCount), label: brandCount === 1 ? "برند" : "برند" },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-b-[2.5rem]">
      <MastheadSurface />

      <div className="container flex flex-col items-center px-6 pb-14 pt-12 text-center sm:pb-20 sm:pt-16">
        <span className="text-xs tracking-widest text-voxcina-blue/55 sm:text-sm">
          بر پایهٔ بازدید کاربران
        </span>

        <h1 className="mt-4 text-[11vw] font-bold leading-[1.02] text-voxcina-blue sm:text-[7vw] lg:text-[4.75rem]">
          پربازدیدترین‌ها
        </h1>

        <p className="mt-5 max-w-[46ch] text-sm leading-8 text-voxcina-blue/65 sm:text-base">
          هر رنگ و طرحی که اینجا می‌بینید، جای خود را با بازدید واقعی کاربران به
          دست آورده است. فهرست با هر بازدید تازه به‌روز می‌شود.
        </p>

        {/* Real figures, read off the same list the page renders — nothing here
            is decorative. Hairline dividers instead of boxes keep it a caption
            under the headline rather than a third card style. */}
        <dl className="mt-9 flex items-stretch divide-x divide-voxcina-blue/15 divide-x-reverse">
          {stats.map((stat) => (
            <div key={stat.label} className="px-5 sm:px-8">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-xl font-bold tabular-nums text-voxcina-blue sm:text-2xl">
                {stat.value}
              </dd>
              <p aria-hidden="true" className="mt-1 text-[11px] text-voxcina-blue/50 sm:text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
