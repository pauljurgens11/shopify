import type { ReactNode } from 'react';
import { cx } from './section-shell.tsx';

/**
 * Every image a section renders, and the layout-stable placeholder it falls
 * back to. Model-authored themes leave images null constantly — a section that
 * collapses when `image` is null looks broken, so the placeholder carries the
 * exact same box the image would have.
 *
 * `next/image` is deliberately not used: theme image URLs point at arbitrary
 * remote hosts, which would need a per-shop `remotePatterns` allowlist.
 *
 * Owner: WS-F.
 */
export function ThemeImage({
  src,
  alt,
  className,
  fit = 'cover',
  eager = false,
  fallback,
}: {
  src: string | null;
  alt: string;
  /** Applies to both the image and the placeholder, so the box never changes. */
  className?: string;
  fit?: 'cover' | 'contain';
  eager?: boolean;
  /** Shown inside the placeholder — a logo's name, say, rather than a grey box. */
  fallback?: ReactNode;
}) {
  if (!src) {
    return (
      <div
        data-placeholder="image"
        aria-hidden={fallback ? undefined : 'true'}
        className={cx('flex items-center justify-center bg-text/5', className)}
      >
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      className={cx('bg-text/5', fit === 'contain' ? 'object-contain' : 'object-cover', className)}
    />
  );
}
