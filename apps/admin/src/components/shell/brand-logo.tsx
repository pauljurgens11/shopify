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

export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--p-space-200)' }}>
      {/* Plain img, not next/image: the optimizer refuses SVG without
          `dangerouslyAllowSVG`, and a vector mark has nothing to optimize. */}
      {/** biome-ignore lint/performance/noImgElement: see above */}
      <img src="/shopify-bag.svg" alt="" width={Math.round(size * 0.88)} height={size} />
      <span
        style={{
          fontFamily: 'var(--p-font-family-sans)',
          fontSize: `${Math.round(size * 0.78)}px`,
          fontWeight: 'var(--p-font-weight-bold)',
          letterSpacing: '-0.02em',
          color: 'var(--p-color-text)',
          lineHeight: 1,
        }}
      >
        {BRAND_NAME.toLowerCase()}
      </span>
    </span>
  );
}
