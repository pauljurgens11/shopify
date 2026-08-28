'use client';

/**
 * Order timeline (PARITY.md → Order detail). Owner: WS-C.
 *
 * Newest first, avatar dots down a rule, relative dates, and a composer that
 * posts to C2's events endpoint. Hand-built: Polaris has no timeline component,
 * and this is the §7 escape hatch — every colour is a `--p-*` token.
 */
import type { OrderEvent } from '@merchant/contracts/orders';
import { Avatar, BlockStack, Box, Button, InlineStack, Text, TextField } from '@shopify/polaris';
import { useState } from 'react';

/** "3 minutes ago" / "May 3" — Shopify shows relative dates in the timeline. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Timeline({
  events,
  onComment,
  posting,
}: {
  events: OrderEvent[];
  onComment: (message: string) => Promise<unknown>;
  posting: boolean;
}) {
  const [comment, setComment] = useState('');
  const newestFirst = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function submit() {
    const trimmed = comment.trim();
    if (!trimmed || posting) return;
    try {
      await onComment(trimmed);
      setComment('');
    } catch {
      // The page toasts the reason; keeping the text saves retyping it.
    }
  }

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">
        Timeline
      </Text>

      <BlockStack gap="200">
        <TextField
          label="Leave a comment"
          labelHidden
          multiline={2}
          autoComplete="off"
          placeholder="Leave a comment..."
          value={comment}
          onChange={setComment}
          disabled={posting}
        />
        <InlineStack align="end">
          <Button
            variant="primary"
            loading={posting}
            disabled={!comment.trim()}
            onClick={() => void submit()}
          >
            Post
          </Button>
        </InlineStack>
      </BlockStack>

      <BlockStack gap="0">
        {newestFirst.map((event, index) => (
          <InlineStack key={event.id} gap="300" wrap={false} blockAlign="start">
            {/* The dot column doubles as the connecting rule. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                alignSelf: 'stretch',
              }}
            >
              <Avatar
                size="xs"
                initials={event.actor ? event.actor.slice(0, 1).toUpperCase() : undefined}
              />
              {index < newestFirst.length - 1 ? (
                <div
                  style={{
                    flex: 1,
                    width: 'var(--p-border-width-025)',
                    background: 'var(--p-color-border)',
                    marginBlock: 'var(--p-space-100)',
                  }}
                />
              ) : null}
            </div>
            <Box paddingBlockEnd="400">
              <BlockStack gap="050">
                <Text as="p" variant="bodySm">
                  {event.message}
                </Text>
                <Text as="span" variant="bodyXs" tone="subdued">
                  {relativeTime(event.createdAt)}
                  {event.actor ? ` · ${event.actor}` : ''}
                </Text>
              </BlockStack>
            </Box>
          </InlineStack>
        ))}
      </BlockStack>
    </BlockStack>
  );
}
