'use client';

/**
 * The toggle switch Shopify puts in a card's heading row — "Physical product"
 * on Shipping, "Track quantity" on Inventory (docs/parity/product-form.md).
 * Owner: WS-B (B5).
 *
 * Hand-built on purpose: Polaris v13 ships no switch, only `Checkbox`, and a
 * checkbox in a card heading is the single most obvious "this isn't Shopify"
 * tell on the product form. CLAUDE.md §7's escape hatch — plain JSX, `--p-*`
 * tokens only, so it inherits Polaris's own colours and dark mode.
 */
import { Text } from '@shopify/polaris';
import { useId } from 'react';

export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-200)' }}>
      <label htmlFor={id} style={{ cursor: disabled ? 'default' : 'pointer' }}>
        <Text as="span" variant="bodySm" tone={disabled ? 'subdued' : undefined}>
          {label}
        </Text>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 32,
          height: 20,
          flex: '0 0 auto',
          padding: 0,
          border: 'none',
          borderRadius: 'var(--p-border-radius-full)',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background-color var(--p-motion-duration-100) var(--p-motion-ease)',
          background: disabled
            ? 'var(--p-color-bg-fill-disabled)'
            : checked
              ? 'var(--p-color-bg-fill-brand)'
              : 'var(--p-color-bg-fill-tertiary)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 14 : 2,
            width: 16,
            height: 16,
            borderRadius: 'var(--p-border-radius-full)',
            background: 'var(--p-color-bg-surface)',
            boxShadow: 'var(--p-shadow-100)',
            transition: 'left var(--p-motion-duration-100) var(--p-motion-ease)',
          }}
        />
      </button>
    </div>
  );
}
