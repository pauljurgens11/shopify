import type { Metadata } from 'next';
import { AuthCard } from '../components/shell/auth-card.tsx';
import { NotFoundActions } from '../components/shell/not-found-actions.tsx';

/**
 * The admin's 404. Owner: WS-H (H3).
 *
 * Without this file a mistyped admin URL renders Next's built-in black-on-white
 * "404 | This page could not be found" — no TopBar, no nav, no Polaris — which
 * is the single fastest way to give away that this is not Shopify. It reuses
 * `AuthCard` because a 404 can be reached before a shop is resolved, so it
 * cannot live inside the Frame (which needs a session and a slug).
 */
export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <AuthCard
      title="Page not found"
      subtitle="The page you're looking for doesn't exist or may have been moved."
    >
      <NotFoundActions />
    </AuthCard>
  );
}
