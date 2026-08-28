/**
 * Demo webhook receiver (issue G1 §5). Owner: WS-G.
 *
 *   pnpm --filter @merchant/worker run echo -- --port 4100
 *
 * Prints every webhook it receives and verifies the signature, so the app
 * detail page's delivery log (G4) and the demo script (H3) have something real
 * to point at. The secret is read from the subscription row that names this
 * URL; pass `--secret` to skip the lookup.
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
const secrets = new Map<string, string | null>();

/** The subscription that points at this receiver knows the secret; ask it. */
async function secretFor(shopId: string, path: string): Promise<string | null> {
  if (explicitSecret) return explicitSecret;
  const key = `${shopId}:${path}`;
  const cached = secrets.get(key);
  if (cached !== undefined) return cached;

  const subscription = await dbForShop(shopId)
    .webhookSubscription.findFirst({
      where: { url: { endsWith: path } },
      select: { secret: true },
    })
    .catch(() => null);

  const secret = subscription?.secret ?? null;
  secrets.set(key, secret);
  return secret;
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

      const secret = shopId ? await secretFor(shopId, req.url ?? '/') : null;
      const verdict = !secret
        ? '? no secret found — pass --secret to verify'
        : verifyWebhookSignature(body, secret, signature)
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
