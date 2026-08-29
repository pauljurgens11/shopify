'use client';

/**
 * The builder's chat column (SPEC §12). Owner: WS-F.
 *
 * Hand-built bubbles rather than a Polaris list: this is Deviation #2's own
 * surface, and Polaris ships nothing shaped like a chat log. Everything is
 * still drawn with `--p-*` tokens so it sits inside the admin rather than on
 * top of it (CLAUDE.md §7).
 */
import { Badge, Banner, BlockStack, Box, Button, Spinner, Text, TextField } from '@shopify/polaris';
import { useEffect, useRef, useState } from 'react';
import type { ApiError } from '../../../../lib/api.ts';
import { PresetPicker } from './preset-picker.tsx';
import type { BuilderMessage } from './use-builder.ts';

function Bubble({
  message,
  onViewVersion,
}: {
  message: BuilderMessage;
  onViewVersion: (versionId: string) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        paddingBlock: 'var(--p-space-100)',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          background: isUser ? 'var(--p-color-bg-fill-brand)' : 'var(--p-color-bg-surface)',
          color: isUser ? 'var(--p-color-text-brand-on-bg-fill)' : 'var(--p-color-text)',
          border: isUser ? 'none' : 'var(--p-border-width-025) solid var(--p-color-border)',
          borderRadius: 'var(--p-border-radius-300)',
          padding: 'var(--p-space-300)',
        }}
      >
        {message.status === 'pending' ? (
          <ThinkingDots />
        ) : (
          <Text as="p" variant="bodySm">
            {message.content}
          </Text>
        )}

        {message.status === 'failed' ? (
          <Box paddingBlockStart="200">
            <Badge tone="critical">Failed</Badge>
          </Box>
        ) : null}

        {message.themeVersionId ? (
          <Box paddingBlockStart="200">
            <Button
              size="micro"
              onClick={() => onViewVersion(message.themeVersionId as string)}
              accessibilityLabel="Preview the version this message created"
            >
              View this version
            </Button>
          </Box>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Polaris Spinner, not hand-rolled dots: PARITY.md §Motion bans off-token
 * durations/easings, and Spinner already honors `prefers-reduced-motion`.
 */
function ThinkingDots() {
  return (
    <div style={{ display: 'flex', paddingBlock: '2px' }}>
      <Spinner size="small" accessibilityLabel="Generating a response" />
    </div>
  );
}

export function ChatPanel({
  messages,
  isLoading,
  error,
  sending,
  onSend,
  onApplyPreset,
  applyingPreset,
  onViewVersion,
}: {
  messages: BuilderMessage[];
  isLoading: boolean;
  error: ApiError | null;
  sending: boolean;
  onSend: (message: string) => Promise<unknown>;
  onApplyPreset: (preset: string) => void;
  applyingPreset: string | null;
  onViewVersion: (versionId: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows, including while a job resolves.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the message list is the trigger, not an input — the effect only touches the ref
  useEffect(() => {
    // Browsers do not apply prefers-reduced-motion to programmatic smooth
    // scrolling, so honor it ourselves (PARITY.md §Motion).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [messages]);

  const busy = sending || messages.some((message) => message.status === 'pending');

  async function submit() {
    const trimmed = draft.trim();
    if (!trimmed || busy) return;
    try {
      await onSend(trimmed);
      setDraft('');
    } catch {
      // The page has toasted the reason; keeping the text means the merchant
      // does not have to retype what they just lost.
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '1fr auto',
        height: '100%',
        minHeight: 0,
        borderInlineEnd: 'var(--p-border-width-025) solid var(--p-color-border)',
        background: 'var(--p-color-bg-surface-secondary)',
      }}
    >
      <div
        ref={scroller}
        style={{ overflowY: 'auto', padding: 'var(--p-space-400)', minHeight: 0 }}
      >
        <BlockStack gap="300">
          {error ? <Banner tone="critical">{error.message}</Banner> : null}

          {!isLoading && messages.length === 0 ? (
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                Design your storefront
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Describe the look you want — “make it feel like a Kyoto coffee shop”, “warmer
                palette, bigger hero”. Or start from a preset below.
              </Text>
            </BlockStack>
          ) : null}

          {messages.map((message) => (
            <Bubble key={message.id} message={message} onViewVersion={onViewVersion} />
          ))}

          <PresetPicker onApply={onApplyPreset} applying={applyingPreset} />
        </BlockStack>
      </div>

      <Box padding="300" borderBlockStartWidth="025" borderColor="border" background="bg-surface">
        <BlockStack gap="200">
          <TextField
            label="Message"
            labelHidden
            multiline={2}
            autoComplete="off"
            value={draft}
            onChange={setDraft}
            placeholder="Describe the storefront you want…"
            disabled={busy}
          />
          <Button
            variant="primary"
            fullWidth
            loading={busy}
            onClick={submit}
            disabled={!draft.trim()}
          >
            {busy ? 'Designing…' : 'Send'}
          </Button>
        </BlockStack>
      </Box>
    </div>
  );
}
