/**
 * A horizontal scroll-snap track: swipeable on touch, scrollable on desktop,
 * and a working carousel with no JavaScript at all.
 *
 * The native scrollbar is hidden because the dots (or the images themselves)
 * are the affordance — a scrollbar under a full-bleed image reads as a bug.
 * Note there is deliberately no `scroll-smooth` here: CSS smooth scrolling also
 * hijacks direct `scrollLeft` assignment, so the smoothness is decided per call
 * by the client island, which can honour `prefers-reduced-motion`.
 *
 * Owner: WS-F.
 */
export const SNAP_TRACK =
  'flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
