"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap-plugins";
import BackendImage from "@/components/BackendImage";
import TexturedBackground from "@/components/ui/TexturedBackground";
import { formatPrice } from "@/lib/utils";
import { activityTracker } from "@/lib/activity-tracker";
import type { ShopCollectionItemView, ShopCollectionView } from "@/types/shopCollection";

interface CollectionsShowcaseProps {
  /** Published collections in display order, each with renderable items. */
  collections: ShopCollectionView[];
}

/**
 * Beat lengths of one collection's act, in timeline seconds. They are only
 * ratios: VH_PER_BEAT turns the sum into the scroll distance the stage stays
 * pinned for, so editing one beat lengthens that step without changing how the
 * rest of the sequence feels.
 */
const BEAT = {
  heading: 0.7,
  /** Scroll spent per color variant — exactly one variant enters per beat. */
  item: 0.55,
  cover: 0.9,
  /** The finished bundle held on screen before it leaves. */
  hold: 0.7,
  exit: 1.1,
} as const;

/** Viewport heights of scroll per timeline second. */
const VH_PER_BEAT = 0.55;

/** How far past the left edge a leaving collection is pushed. */
const EXIT_MARGIN = 48;

/** Timeline seconds the next act starts before the previous one has fully left,
 *  so the handoff never parks an empty stage between two collections. */
const HANDOFF_OVERLAP = BEAT.exit * 0.28;

/** Vertical room an act gives up to the counter and the frame's padding —
 *  mirrors the scene's pt-8/pb-24 classes. */
const SCENE_RESERVE = 128;

/** Cards shrink as the bundle grows so a 20-item collection still fits. */
function cardWidthClass(count: number): string {
  if (count <= 3) return "w-36 sm:w-44 lg:w-52";
  if (count <= 6) return "w-28 sm:w-36 lg:w-40";
  if (count <= 12) return "w-24 sm:w-28 lg:w-32";
  return "w-20 sm:w-24 lg:w-28";
}

const faNumber = (value: number) => value.toLocaleString("fa-IR");

/**
 * The collection page's stage: every curated collection plays the same act,
 * one after another, inside a single pinned section driven by scroll.
 *
 * Per collection the color variants fade up ONE BY ONE and stay on screen, and
 * only once the last one has landed does the collection's own image join them.
 * After a short hold with the whole bundle visible, everything slides off the
 * side of the display and the next collection starts the act over.
 *
 * All acts live on one master timeline inside one pin, so a collection's exit
 * hands straight over to the next one's first variant — separate pins would
 * park an empty viewport between them while the finished scene scrolled away.
 * The last collection skips its exit: there is nothing to hand over to, so it
 * stays on screen and scrolls away with the stage into the footer.
 */
export default function CollectionsShowcase({ collections }: CollectionsShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  const total = collections.length;
  const prevIdx = total > 0 ? (active - 1 + total) % total : 0;
  const nextIdx = total > 0 ? (active + 1) % total : 0;

  // The preference itself is read in the layout effect below, before anything
  // is pinned — this only follows later changes to it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || total === 0 || reduced) return;

      // Checked here rather than in an effect: this runs before the browser
      // paints and before anything is pinned, so a reduced-motion visitor never
      // gets a pin-spacer wrapped around a section React is about to replace.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setReduced(true);
        return;
      }

      const scenes = gsap.utils.toArray<HTMLElement>(".collection-scene", section);
      if (scenes.length === 0) return;

      // A bundle of 20 variants is taller than the stage, and the layout must
      // hold its full height from the start (cards occupy their slot before
      // they fade in, so nothing shifts as they land). Scaling the scene down
      // to fit keeps every act on screen without touching the group's own
      // transform, which the exit tween owns.
      const fitScenes = () => {
        for (const scene of scenes) {
          const group = scene.querySelector<HTMLElement>(".collection-group");
          if (!group) continue;
          const available = window.innerHeight - SCENE_RESERVE;
          const natural = group.offsetHeight;
          gsap.set(scene, {
            scale: natural > available ? available / natural : 1,
            transformOrigin: "50% 50%",
          });
        }
      };

      // Momentum scrolling runs off the main thread, so a flick can overshoot a
      // pinned stage before its scrub catches up. Force scroll handling onto the
      // JS thread so the pin and the playhead stay in sync.
      const normalizer = ScrollTrigger.normalizeScroll(true);

      // ScrollTrigger is attached after the acts are in place: the pin's scroll
      // length is derived from the finished timeline, not guessed up front.
      const master = gsap.timeline({ paused: true });
      /** Where each act begins — what the counter reads to name the collection. */
      const starts: number[] = [];

      scenes.forEach((scene, index) => {
        const group = scene.querySelector<HTMLElement>(".collection-group");
        const heading = scene.querySelector<HTMLElement>(".collection-heading");
        const cover = scene.querySelector<HTMLElement>(".collection-cover");
        const cards = gsap.utils.toArray<HTMLElement>(".collection-variant-card", scene);
        if (!group || !heading) return;

        const act = gsap.timeline();

        act.fromTo(
          heading,
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: BEAT.heading, ease: "power2.out" }
        );

        // One variant per beat, each staying put once it has landed: the stagger
        // is longer than the tween, so no two cards are ever mid-entrance.
        if (cards.length > 0) {
          act.fromTo(
            cards,
            { autoAlpha: 0, y: 70, scale: 0.85 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: BEAT.item * 0.75,
              ease: "back.out(1.4)",
              stagger: BEAT.item,
            },
            ">"
          );
        }

        // Only after the last variant has settled does the collection's own
        // image join them.
        if (cover) {
          act.fromTo(
            cover,
            { autoAlpha: 0, scale: 0.9, y: 32 },
            { autoAlpha: 1, scale: 1, y: 0, duration: BEAT.cover, ease: "power3.out" },
            ">"
          );
        }

        act.to({}, { duration: BEAT.hold });

        if (index < scenes.length - 1) {
          // The whole act leaves on one transform, however many cards it holds.
          // Measured per refresh so the group always clears the viewport edge —
          // in the group's own units, which a fitted scene shrinks.
          act
            .to(
              group,
              {
                x: () => {
                  const fit = Number(gsap.getProperty(scene, "scaleX")) || 1;
                  const half = (group.offsetWidth * fit) / 2;
                  return -((window.innerWidth / 2 + half + EXIT_MARGIN) / fit);
                },
                rotation: -2.5,
                scale: 0.92,
                duration: BEAT.exit,
                ease: "power2.in",
              },
              ">"
            )
            .to(
              group,
              { autoAlpha: 0, duration: BEAT.exit * 0.5, ease: "power1.in" },
              `>-${BEAT.exit * 0.65}`
            );
        }

        master.add(act, index === 0 ? 0 : `>-${HANDOFF_OVERLAP}`);
        starts.push(act.startTime());
      });

      const beats = master.duration();
      const trigger = ScrollTrigger.create({
        animation: master,
        trigger: section,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * beats * VH_PER_BEAT)}`,
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: fitScenes,
        onUpdate: (self) => {
          const time = self.progress * beats;
          let index = 0;
          for (let i = 0; i < starts.length; i++) if (time >= starts[i]) index = i;
          setActive(index);
        },
      });

      fitScenes();

      return () => {
        trigger.kill();
        master.kill();
        normalizer?.kill();
      };
    },
    { scope: sectionRef, dependencies: [total, reduced] }
  );

  if (total === 0) return null;

  // With reduced motion the very same markup is laid out as a plain stack: no
  // pin, no timeline, everything already visible. Keeping one element tree
  // (and one root <section>) matters — ScrollTrigger wraps a pinned section in
  // a spacer, so swapping trees around it would leave React removing a node
  // that is no longer its child.
  const staged = !reduced;

  return (
    <section
      ref={sectionRef}
      className={
        staged ? "relative isolate h-[100svh] w-full overflow-hidden" : "relative isolate"
      }
    >
      <TexturedBackground />

      {collections.map((collection, index) => (
        <div
          key={collection.id ?? index}
          className={`collection-scene flex items-center justify-center px-4 sm:px-6 ${
            staged ? "absolute inset-0 pb-24 pt-8" : "relative py-16"
          }`}
        >
          <div
            className="collection-group flex w-full max-w-6xl flex-col items-center gap-6 lg:gap-10"
            style={staged ? { willChange: "transform, opacity" } : undefined}
          >
            <CollectionHeading
              collection={collection}
              index={index}
              total={total}
              animated={staged}
            />

            <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:justify-center lg:gap-10">
              <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4 lg:max-w-[46rem]">
                {collection.item_views.map((item, i) => (
                  <VariantCard
                    key={`${item.product_id}-${item.variant_id}`}
                    item={item}
                    widthClass={cardWidthClass(collection.item_views.length)}
                    listPosition={i}
                    animated={staged}
                    priority={index === 0 && i === 0}
                  />
                ))}
              </div>

              <CollectionCover collection={collection} animated={staged} />
            </div>
          </div>
        </div>
      ))}

      {/* Odometer — which collection of the set is on stage right now. It sits
          below the acts so it never covers a heading. */}
      {staged && total > 1 && (
        <div
          className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2"
          dir="ltr"
          aria-live="polite"
          aria-label={`کالکشن ${active + 1} از ${total}`}
        >
          <div className="flex h-14 w-36 items-center justify-center rounded-[1.6rem] bg-voxcina-blue px-3 shadow-[0_14px_32px_rgba(10,27,60,0.25)] ring-1 ring-white/10 sm:h-16 sm:w-44 sm:rounded-[1.9rem]">
            <div className="grid w-full grid-cols-[1fr_1.35fr_1fr] items-center text-center tabular-nums">
              <span className="text-sm font-semibold tracking-tight text-voxcina-cream/40 sm:text-base">
                {faNumber(prevIdx + 1)}
              </span>
              <span className="text-3xl font-bold leading-none tracking-tight text-voxcina-cream sm:text-4xl">
                {faNumber(active + 1)}
              </span>
              <span className="text-sm font-semibold tracking-tight text-voxcina-cream/40 sm:text-base">
                {faNumber(nextIdx + 1)}
              </span>
            </div>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-voxcina-blue/15">
            <div
              className="h-full rounded-full bg-voxcina-blue/70 transition-[width] duration-300"
              style={{ width: `${total > 1 ? (active / (total - 1)) * 100 : 100}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

interface CollectionHeadingProps {
  collection: ShopCollectionView;
  index: number;
  total: number;
  /** Start hidden so the scrubbed timeline owns the reveal. */
  animated?: boolean;
}

function CollectionHeading({ collection, index, total, animated = false }: CollectionHeadingProps) {
  const eyebrow = `کالکشن ${faNumber(index + 1)} از ${faNumber(total)}`;

  return (
    <header
      className={`collection-heading max-w-2xl rounded-[2rem] bg-voxcina-cream/85 px-5 py-4 text-center text-voxcina-blue sm:px-8 ${
        animated ? "invisible opacity-0" : ""
      }`}
    >
      <span className="text-xs tracking-widest text-voxcina-blue/60 sm:text-sm">{eyebrow}</span>

      <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
        {collection.title}
      </h2>

      {collection.description && (
        <p className="mt-3 line-clamp-2 text-sm text-voxcina-blue/70 sm:text-base">
          {collection.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-voxcina-blue px-4 py-1.5 text-sm font-bold text-voxcina-cream shadow-soft sm:text-base">
          {formatPrice(collection.effective_price)}
        </span>
        <span className="rounded-full bg-voxcina-blue/10 px-3 py-1.5 text-xs text-voxcina-blue/70">
          {faNumber(collection.item_views.length)} قطعه
        </span>
        {!collection.in_stock && (
          <span className="rounded-full bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white">
            ناموجود
          </span>
        )}
      </div>

      {collection.id && (
        <Link
          href={`/collection/${collection.id}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-voxcina-blue px-5 py-2.5 text-sm font-medium text-voxcina-cream shadow-medium transition-colors hover:bg-voxcina-darkBlue"
        >
          <span>انتخاب سایز و خرید ست</span>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </header>
  );
}

interface CollectionCoverProps {
  collection: ShopCollectionView;
  animated?: boolean;
}

/** The collection's own image — the last thing to arrive in each act. */
function CollectionCover({ collection, animated = false }: CollectionCoverProps) {
  const image = collection.images?.[0];
  if (!image) return null;

  return (
    <figure
      className={`collection-cover w-full max-w-[13rem] shrink-0 sm:max-w-[15rem] lg:w-[16rem] lg:max-w-none ${
        animated ? "invisible opacity-0" : ""
      }`}
      style={animated ? { willChange: "transform, opacity" } : undefined}
    >
      <CoverFrame href={collection.id ? `/collection/${collection.id}` : undefined}>
        <BackendImage
          src={image}
          alt={collection.title}
          width={680}
          height={906}
          className="h-full w-full object-cover"
          sizes="(max-width: 1024px) 55vw, 16rem"
        />
      </CoverFrame>
      <figcaption className="mt-2 text-center text-xs text-voxcina-blue/60">
        {collection.title}
      </figcaption>
    </figure>
  );
}

/** The cover's frame — a link into the set's page when it has one. */
function CoverFrame({ href, children }: { href?: string; children: React.ReactNode }) {
  const className =
    "relative block aspect-[3/4] w-full overflow-hidden rounded-3xl shadow-strong ring-1 ring-voxcina-blue/10";
  return href ? (
    <Link href={href} className={className} aria-hidden="true" tabIndex={-1}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

interface VariantCardProps {
  item: ShopCollectionItemView;
  widthClass: string;
  listPosition: number;
  animated?: boolean;
  priority?: boolean;
}

/** One color variant of the bundle, linking to that exact variant's product. */
function VariantCard({
  item,
  widthClass,
  listPosition,
  animated = false,
  priority = false,
}: VariantCardProps) {
  const image = item.image || "/images/products/placeholder.jpg";

  return (
    <Link
      href={item.link}
      rel="nofollow"
      data-activity-tracked="true"
      onClick={() =>
        activityTracker.trackProductClick(item.product_id, item.name, {
          source: "collection_showcase",
          colorName: item.color_name,
          colorHex: item.color,
          inStock: item.in_stock,
          price: item.price,
          listPosition,
        })
      }
      className={`collection-variant-card flex flex-col ${widthClass} ${
        animated ? "invisible opacity-0" : ""
      }`}
      style={animated ? { willChange: "transform, opacity" } : undefined}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-medium ring-1 ring-voxcina-blue/5">
        <BackendImage
          src={image}
          alt={item.color_name ? `${item.name} — ${item.color_name}` : item.name}
          width={420}
          height={560}
          className="h-full w-full object-cover"
          sizes="(max-width: 640px) 30vw, 13rem"
          priority={priority}
        />
        {!item.in_stock && (
          <span className="absolute top-2 left-2 rounded-md bg-neutral-700 px-2 py-0.5 text-[0.65rem] font-medium text-white shadow-soft">
            ناموجود
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-voxcina-blue">
        {item.color && (
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full ring-1 ring-voxcina-blue/20"
            style={{ backgroundColor: item.color }}
          />
        )}
        <span className="line-clamp-1 text-xs font-medium sm:text-sm">{item.name}</span>
      </div>
      <span className="mt-0.5 text-center text-xs font-bold text-voxcina-blue sm:text-sm">
        {formatPrice(item.price)}
      </span>
    </Link>
  );
}
