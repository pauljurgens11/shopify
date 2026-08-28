/**
 * Demo webhook receiver (issue G1 §5). Owner: WS-G.
 *
 *   pnpm --filter @merchant/worker run echo -- --port 4100
 *
 * Prints every webhook it receives and verifies the signature, so the app
 * detail page's delivery log (G4) and the demo script (H3) have something real
 * to point at. Secrets are read from the subscription rows that name this URL;
 * pass `--secret` to skip the lookup.
 *
 * Several subscriptions legitimately share one endpoint — an app may want two
 * topics on the same URL, and G4's UI makes that a couple of clicks — so the
 * body is checked against EVERY candidate secret and counts as verified if any
 * of them matches. Checking only the first is how a correctly signed delivery
 * gets reported as a forgery.
 *
 * Development tool — not wired into the running stack.
 */
import { createServer } from 'node:http';
import {
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_HMAC_HEADER,
  WEBHOOK_SHOP_HEADER,
  WEBHOOK_TOPIC_HEADER,
} from '@merchant/config/constants';
import { dbForShop } from '@merchant/db/tenant';
import { verifyWebhookSignature } from '../src/lib/hmac.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const port = Number(arg('port') ?? 4100);
const explicitSecret = arg('secret');

/** Every subscription pointing at this path — any of them may have signed. */
async function secretsFor(shopId: string, path: string): Promise<string[]> {
  if (explicitSecret) return [explicitSecret];

  // Deliberately not cached: the usual demo order is to start this receiver and
  // then add subscriptions, so a cached answer goes stale within a minute.
  const rows = await dbForShop(shopId)
    .webhookSubscription.findMany({
      where: { url: { endsWith: path } },
      select: { secret: true },
    })
    .catch(() => []);

  return rows.map((row) => row.secret);
}

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    void (async () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const topic = req.headers[WEBHOOK_TOPIC_HEADER] ?? '(none)';
      const shopId = String(req.headers[WEBHOOK_SHOP_HEADER] ?? '');
      const eventId = req.headers[WEBHOOK_EVENT_HEADER] ?? '(none)';
      const signature = String(req.headers[WEBHOOK_HMAC_HEADER] ?? '');

      const secrets = shopId ? await secretsFor(shopId, req.url ?? '/') : [];
      const verdict =
        secrets.length === 0
          ? '? no secret found — pass --secret to verify'
          : secrets.some((secret) => verifyWebhookSignature(body, secret, signature))
            ? '✓ signature verified'
            : '✗ SIGNATURE MISMATCH';

      console.log(`\n${topic}  ${eventId}  ${verdict}`);
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        console.log(body);
      }

      res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
    })();
  });
});

server.listen(port, () => {
  console.log(`webhook echo listening on http://localhost:${port}`);
  console.log('point a subscription at it, then trigger an event.\n');
});
