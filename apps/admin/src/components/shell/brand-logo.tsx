/**
 * The brand lockup: the bag mark plus the wordmark (SPEC §1). Owner: WS-A.
 *
 * The mark lives in `public/shopify-bag.svg` so exactly one file draws it —
 * this lockup, the favicon and the `Frame` logo in the top bar all point at it.
 * The wordmark is the §7 escape hatch (plain JSX, `--p-*` tokens only): Polaris
 * has no wordmark component, and `Text` would inherit a heading size that
 * changes with the type scale rather than staying locked to the mark's height.
 */
import { BRAND_NAME } from '@merchant/config/constants';

/**
 * Wordmark only. The top bar needs it beside the mark `Frame` already renders
 * (docs/parity/admin-shell.md: "wordmark + glyph"), where the bar is near-black
 * and the text has to be inverse rather than the default body colour.
 */
export function BrandWordmark({
  size = 28,
  tone = 'default',
}: {
  /** Cap height in px; the mark it sits beside is drawn at roughly 1.3× this. */
  size?: number;
  tone?: 'default' | 'inverse';
}) {
  return (
    <span
      style={{
        fontFamily: 'var(--p-font-family-sans)',
        fontSize: `${size}px`,
        fontWeight: 'var(--p-font-weight-bold)',
        letterSpacing: '-0.02em',
        color: tone === 'inverse' ? 'var(--p-color-text-inverse)' : 'var(--p-color-text)',
        lineHeight: 1,
      }}
    >
      {BRAND_NAME.toLowerCase()}
    </span>
  );
}

export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--p-space-200)' }}>
      {/* Plain img, not next/image: the optimizer refuses SVG without
          `dangerouslyAllowSVG`, and a vector mark has nothing to optimize. */}
      {/** biome-ignore lint/performance/noImgElement: see above */}
      <img src="/shopify-bag.svg" alt="" width={Math.round(size * 0.88)} height={size} />
      <BrandWordmark size={Math.round(size * 0.78)} />
    </span>
  );
}
