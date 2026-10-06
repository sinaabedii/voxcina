/**
 * Geometry shared by the product gallery and its streamed Suspense skeleton.
 *
 * `products/[productId]/loading.tsx` paints `ProductDetailSkeleton` into the
 * initial HTML and the real gallery replaces it in place, so every pixel of
 * height difference between the two is paid as Cumulative Layout Shift — a
 * generic spinner in this slot once measured CLS 0.30. Both sides import these
 * strings instead of repeating the classes, so the two cannot drift apart.
 *
 * This module must stay dependency-free: `ui/Loading.tsx` imports it, and
 * `ui/Button` imports `ButtonLoading` from there, so anything pulled in here
 * would reach almost every page.
 */

/** Height of the main image frame at each breakpoint. */
export const GALLERY_FRAME_HEIGHT = "aspect-[6/7] sm:aspect-[4/3] lg:aspect-auto lg:h-[660px] xl:h-[700px]";

/** Gallery shell: rail under the frame on mobile, beside it from `lg` up. */
export const GALLERY_LAYOUT = "flex flex-col-reverse lg:flex-row lg:gap-3";

/** Thumbnail rail: horizontal scroller on mobile, vertical column from `lg`. */
export const GALLERY_RAIL =
  "hidden gap-3 scrollbar-thin lg:flex lg:w-16 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:max-h-[660px] xl:max-h-[700px]";

/** One thumbnail. */
export const GALLERY_THUMB = "h-20 w-16 shrink-0 overflow-hidden rounded-xl";

/** Thumbnails the skeleton draws before the real count is known. */
export const GALLERY_SKELETON_THUMBS = 4;
