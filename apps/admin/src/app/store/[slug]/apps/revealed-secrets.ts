/**
 * One-shot handoff for the plaintext credentials (SPEC §8). Owner: WS-G.
 *
 * The API returns an API token exactly once, in the create/rotate response —
 * but the page that receives it is not the page that shows it: "Create app"
 * lives on the index and the reveal card on the app's detail page. The URL is
 * out (never put a credential in a query string) and so is storage, which would
 * outlive the single reveal. A module-level map dies with the tab, and the
 * detail page clears its entry the moment it has the value in React state, so
 * coming back to the page shows the masked suffix and nothing else.
 */
const secrets = new Map<string, string>();

export function stashSecret(key: string, value: string): void {
  secrets.set(key, value);
}

/** Non-destructive on purpose: React may run a state initialiser more than once. */
export function peekSecret(key: string): string | null {
  return secrets.get(key) ?? null;
}

export function forgetSecret(key: string): void {
  secrets.delete(key);
}
