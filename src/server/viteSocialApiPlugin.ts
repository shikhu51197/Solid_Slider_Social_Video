import type { Plugin } from 'vite';
import { createSocialEndpoint } from './socialEndpoint.js';

/** Development and production use the same validation, caching and error handling. */
export function socialApiPlugin(): Plugin {
  const handlers = Object.fromEntries((['instagram', 'youtube', 'facebook'] as const)
    .map(platform => [`/api/social/${platform}`, createSocialEndpoint(platform).handler]));
  return {
    name: 'social-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname;
        const handler = handlers[path];
        if (!handler) return next();
        await handler(req, res);
      });
    },
  };
}
