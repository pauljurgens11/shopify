/**
 * Example of the autoload pattern: this file's path becomes its URL.
 * Copy this shape for new routes — never edit a central router.
 */
import type { FastifyInstance } from 'fastify';

export default async function routes(app: FastifyInstance) {
  app.get('/', () => ({ status: 'ok', uptime: process.uptime() }));
}
