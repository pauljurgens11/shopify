import type { ReactNode } from 'react';
import { cx } from './section-shell.tsx';

/**
 * The storefront's only button. Its colours come from `--theme-button-*`, which
 * `themeCssVariables` derives from the shop's `buttonStyle` token — so this
 * component never needs to know whether the theme is solid, outline or soft.
 * Owner: WS-F.
 */
export type ThemeButtonProps = {
  children: ReactNode;
  /** Renders an `<a>`. Omit for a `<button>` (forms owned by client islands). */
  href?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  className?: string;
};

const SIZES = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
} as const;

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-theme border font-medium tracking-wide ' +
  'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent';

const VARIANTS = {
  primary:
    'bg-[var(--theme-button-bg)] text-[var(--theme-button-fg)] ' +
    'border-[var(--theme-button-border)] hover:bg-[var(--theme-button-bg-hover)] ' +
    'hover:text-[var(--theme-button-fg-hover)]',
  secondary: 'border-current bg-transparent text-text hover:bg-text/5',
} as const;

export function ThemeButton({
  children,
  href,
  type = 'button',
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: ThemeButtonProps) {
  const classes = cx(BASE, SIZES[size], VARIANTS[variant], block && 'w-full', className);
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type={type === 'submit' ? 'submit' : 'button'} className={classes}>
      {children}
    </button>
  );
}
