'use client';

/**
 * The three canned themes (SPEC §12). Owner: WS-F.
 *
 * Always visible, not just when `ANTHROPIC_API_KEY` is missing: it is the
 * fastest way to restyle a store, and it is the path the demo takes when there
 * is no key at all (CLAUDE.md §9 — the builder never dead-ends).
 *
 * The swatches are the real token values from `@merchant/theme-engine/presets`,
 * so a preset that changes its palette changes its thumbnail too.
 */
import { THEME_PRESETS } from '@merchant/contracts/theme';
import { presetThemeDoc } from '@merchant/theme-engine/presets';
import { BlockStack, Box, Button, InlineStack, Text } from '@shopify/polaris';

const BLURBS: Record<string, string> = {
  aurora: 'Warm and editorial, with serif headings.',
  monochrome: 'Stark black and white, square corners.',
  bloom: 'Soft pastels, rounded, gentle type.',
};

function Swatches({ preset }: { preset: string }) {
  const { tokens } = presetThemeDoc(preset as (typeof THEME_PRESETS)[number]);
  const colors = [
    tokens.colorBackground,
    tokens.colorPrimary,
    tokens.colorAccent,
    tokens.colorText,
  ];
  return (
    <InlineStack gap="100">
      {colors.map((color, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: a palette repeats colours — monochrome's primary and text are both #111111 — so the value is not a key
          key={index}
          style={{
            width: 18,
            height: 18,
            background: color,
            borderRadius: 'var(--p-border-radius-100)',
            border: 'var(--p-border-width-025) solid var(--p-color-border)',
          }}
        />
      ))}
    </InlineStack>
  );
}

export function PresetPicker({
  onApply,
  applying,
}: {
  onApply: (preset: string) => void;
  applying: string | null;
}) {
  return (
    <Box
      background="bg-surface"
      padding="300"
      borderWidth="025"
      borderColor="border"
      borderRadius="300"
    >
      <BlockStack gap="300">
        <BlockStack gap="100">
          <Text as="h3" variant="headingSm">
            Start from a preset
          </Text>
          <Text as="p" variant="bodyXs" tone="subdued">
            Applies as a draft you can preview before publishing.
          </Text>
        </BlockStack>

        {THEME_PRESETS.map((preset) => (
          <InlineStack key={preset} align="space-between" blockAlign="center" gap="300">
            <BlockStack gap="150">
              <Text as="span" variant="bodySm" fontWeight="medium">
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </Text>
              <Swatches preset={preset} />
              <Text as="span" variant="bodyXs" tone="subdued">
                {BLURBS[preset]}
              </Text>
            </BlockStack>
            <Button
              size="slim"
              loading={applying === preset}
              disabled={applying !== null && applying !== preset}
              onClick={() => onApply(preset)}
            >
              Apply
            </Button>
          </InlineStack>
        ))}
      </BlockStack>
    </Box>
  );
}
