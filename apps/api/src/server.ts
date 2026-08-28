/** Entrypoint. Owner: WS-A. */
import { env } from '@merchant/config/env';
import { buildApp } from './app.ts';
import { closeRedis } from './lib/redis.ts';

const config = env();
const app = await buildApp();

// Drain in-flight requests before exit so a deploy never cuts a checkout short.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.log.info(`${signal} received, closing`);
    void app
      .close()
      .then(closeRedis)
      .then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error, 'failed to start');
  process.exit(1);
}
