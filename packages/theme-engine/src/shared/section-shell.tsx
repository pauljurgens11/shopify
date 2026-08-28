import type { SectionType } from '@merchant/contracts/theme';
import type { ReactNode } from 'react';

/**
 * The vertical rhythm and max-width every section shares. One shell means the
 * page reads as one storefront no matter which sections the model picked.
 * Owner: WS-F.
 */
export type SectionShellProps = {
  type: SectionType;
  width?: 'narrow' | 'default' | 'wide' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

const WIDTHS = {
  narrow: 'mx-auto w-full max-w-3xl px-4 sm:px-6',
  default: 'mx-auto w-full max-w-6xl px-4 sm:px-6',
  wide: 'mx-auto w-full max-w-7xl px-4 sm:px-6',
  full: 'w-full',
} as const;

const PADDING = {
  none: '',
  sm: 'py-6 sm:py-8',
  md: 'py-10 sm:py-14',
  lg: 'py-14 sm:py-20',
} as const;

export function SectionShell({
  type,
  width = 'default',
  padding = 'md',
  className,
  innerClassName,
  children,
}: SectionShellProps) {
  return (
    <section data-section={type} className={cx('w-full', PADDING[padding], className)}>
      <div className={cx(WIDTHS[width], innerClassName)}>{children}</div>
    </section>
  );
}

/** Tiny class joiner — a `clsx` dependency for this would be silly. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
