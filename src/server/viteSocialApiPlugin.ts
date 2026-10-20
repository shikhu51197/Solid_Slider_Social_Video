import type { Plugin } from 'vite';
import {
  fetchInstagramPosts,
  fetchYouTubePosts,
  fetchFacebookPosts,
  diagnoseFacebookConnection,
} from './socialApiHandler';

/**
 * Vite Dev Server Middleware Plugin providing secure server-side social API endpoints:
 * - GET /api/social/instagram
 * - GET /api/social/youtube
 * - GET /api/social/facebook
 *
 * Keeps private access tokens and secrets server-side without exposing them to browser bundles.
 */
export function socialApiPlugin(): Plugin {
  return {
    name: 'social-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlStr = req.url || '';
        const parsedUrl = new URL(urlStr, 'http://localhost');

        if (parsedUrl.pathname === '/api/social/instagram') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const limit = parsedUrl.searchParams.get('limit')
              ? parseInt(parsedUrl.searchParams.get('limit')!, 10)
              : 10;
            const forceRefresh = parsedUrl.searchParams.get('refresh') === 'true';
            const result = await fetchInstagramPosts({ limit, forceRefresh });
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                posts: [],
                source: 'instagram',
                error: err instanceof Error ? err.message : 'Failed to fetch Instagram posts',
              })
            );
          }
          return;
        }

        if (parsedUrl.pathname === '/api/social/youtube') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const handle = parsedUrl.searchParams.get('handle') || undefined;
            const limit = parsedUrl.searchParams.get('limit')
              ? parseInt(parsedUrl.searchParams.get('limit')!, 10)
              : 10;
            const forceRefresh = parsedUrl.searchParams.get('refresh') === 'true';
            const result = await fetchYouTubePosts({ handle, limit, forceRefresh });
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                posts: [],
                source: 'youtube',
                error: err instanceof Error ? err.message : 'Failed to fetch YouTube videos',
              })
            );
          }
          return;
        }

        if (parsedUrl.pathname === '/api/social/facebook') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const isDiagnostic = parsedUrl.searchParams.get('diagnostic') === 'true';
            const pageId = parsedUrl.searchParams.get('pageId') || undefined;

            if (isDiagnostic) {
              const diag = await diagnoseFacebookConnection({ pageId });
              res.statusCode = 200;
              res.end(JSON.stringify(diag));
              return;
            }

            const limit = parsedUrl.searchParams.get('limit')
              ? parseInt(parsedUrl.searchParams.get('limit')!, 10)
              : 10;
            const forceRefresh = parsedUrl.searchParams.get('refresh') === 'true';
            const result = await fetchFacebookPosts({ pageId, limit, forceRefresh });
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                posts: [],
                source: 'facebook',
                status: 'error',
                errorCategory: 'unknown',
                error: err instanceof Error ? err.message : 'Failed to fetch Facebook posts',
              })
            );
          }
          return;
        }

        next();
      });
    },
  };
}
