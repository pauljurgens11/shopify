'use client';

/**
 * Analytics beacon (SPEC §13). Owner: WS-E.
 *
 * `sendBeacon` rather than fetch: it survives the page being closed, which is
 * the whole point of a page-view ping. Fires once per mount, and never on a
 * preview — the builder's own iframe views are not shopper traffic.
 *
 * `purchase` is deliberately absent: WS-G drops browser-sent purchase events as
 * forgeable revenue, and `createOrder` records the real one server-side.
 */
import { useEffect } from 'react';
import { randomId } from '../lib/random-id.ts';

const SESSION_KEY = 'merchant_session_id';

function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = `ses_${randomId(12)}`;
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Private mode, or storage disabled. One session per page view is a worse
    // number than a stable one, but it is better than losing the event.
    return `ses_${randomId(12)}`;
  }
}

export interface BeaconEvent {
  type: 'page_view' | 'product_view' | 'add_to_cart' | 'begin_checkout';
  path: string;
  productId?: string;
}

export function AnalyticsBeacon({ events, endpoint }: { events: BeaconEvent[]; endpoint: string }) {
  useEffect(() => {
    if (events.length === 0) return;
    const payload = JSON.stringify({
      events: events.map((event) => ({ ...event, sessionId: sessionId() })),
    });
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      if (!navigator.sendBeacon(endpoint, blob)) {
        void fetch(endpoint, {
          method: 'POST',
          body: payload,
          headers: { 'content-type': 'application/json' },
          keepalive: true,
        });
      }
    } catch {
      // Analytics must never break a storefront page.
    }
    // The event list is derived from the route, so this is once per page.
  }, [events, endpoint]);

  return null;
}
