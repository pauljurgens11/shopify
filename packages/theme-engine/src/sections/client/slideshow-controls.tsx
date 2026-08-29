'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { SNAP_TRACK } from '../../shared/scroll.ts';

/**
 * The slideshow's scroll track, plus its dots and autoplay timer.
 *
 * The slides are passed in as `children` and stay Server Components — this
 * wrapper exists only to hold a ref to the track. Deliberately a ref and not a
 * DOM id: a theme may contain two slideshows on one page, and a shared id would
 * make the second one's dots drive the first one's track.
 *
 * With JavaScript off the track is still a working swipeable scroll-snap
 * carousel; this only adds the dots and the timer.
 *
 * One of only two client leaves in the theme engine (the other is `InertForm`).
 *
 * Owner: WS-F.
 */
/** Which slide the track is currently resting on. */
const slideIndex = (track: HTMLElement) =>
  Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));

export function SlideshowControls({
  count,
  autoplay,
  intervalSeconds,
  children,
}: {
  count: number;
  autoplay: boolean;
  intervalSeconds: number;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  // Decided per interaction rather than baked into CSS, so a visitor who asked
  // for less motion gets an instant jump instead of a slide.
  const scrollToSlide = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: index * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  // Follow the track's own scroll position, so swiping updates the dots.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setActive(Math.min(Math.max(slideIndex(track), 0), count - 1));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [count]);

  useEffect(() => {
    if (!autoplay || count < 2) return;
    // Respect the visitor's motion preference — autoplay is what it means.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      // Read the position rather than a counter: the track is the single source
      // of truth, so a visitor who swipes mid-cycle is not fought by autoplay.
      scrollToSlide((slideIndex(track) + 1) % count);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [count, autoplay, intervalSeconds, scrollToSlide]);

  return (
    <>
      {/* A labelled <section> is role=region, so aria-roledescription applies. */}
      <section
        ref={trackRef}
        className={SNAP_TRACK}
        aria-roledescription="carousel"
        aria-label="Slideshow"
      >
        {children}
      </section>
      {count < 2 ? null : (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: count }, (_, index) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional; there is no other identity
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active}
              onClick={() => scrollToSlide(index)}
              className={
                index === active
                  ? 'h-2 w-6 rounded-theme bg-primary'
                  : 'h-2 w-2 rounded-theme bg-text/25'
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
