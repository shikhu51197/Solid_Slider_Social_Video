import { fetchFacebookPosts, diagnoseFacebookConnection } from '../../src/server/socialApiHandler.js';

async function handleWeb(request: Request) {
  try {
    const url = new URL(request.url);
    const pageId = url.searchParams.get('pageId') || undefined;
    const isDiagnostic = url.searchParams.get('diagnostic') === 'true';

    if (isDiagnostic) {
      const diag = await diagnoseFacebookConnection({ pageId });
      return new Response(JSON.stringify(diag), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 10;
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const result = await fetchFacebookPosts({ pageId, limit, forceRefresh });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Facebook posts';
    return new Response(
      JSON.stringify({
        posts: [],
        source: 'facebook',
        status: 'error',
        errorCategory: 'unknown',
        error: message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export default async function handler(req: any, res?: any) {
  // Support Web standard Request / Response
  if (!res || typeof req?.headers?.get === 'function') {
    return handleWeb(req as Request);
  }

  // Node.js Serverless runtime (req: IncomingMessage, res: ServerResponse)
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const query = req.query || {};
    const isDiagnostic = query.diagnostic === 'true';
    const pageId = typeof query.pageId === 'string' ? query.pageId : undefined;

    if (isDiagnostic) {
      const diag = await diagnoseFacebookConnection({ pageId });
      if (typeof res.status === 'function') {
        return res.status(200).json(diag);
      }
      res.statusCode = 200;
      return res.end(JSON.stringify(diag));
    }

    const limit = query.limit ? parseInt(String(query.limit), 10) : 10;
    const forceRefresh = query.refresh === 'true';

    const result = await fetchFacebookPosts({ pageId, limit, forceRefresh });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    if (typeof res.status === 'function') {
      return res.status(200).json(result);
    }
    res.statusCode = 200;
    return res.end(JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Facebook posts';
    const payload = {
      posts: [],
      source: 'facebook',
      status: 'error',
      errorCategory: 'unknown',
      error: message,
    };
    if (typeof res.status === 'function') {
      return res.status(500).json(payload);
    }
    res.statusCode = 500;
    return res.end(JSON.stringify(payload));
  }
}

export async function GET(request: Request) {
  return handleWeb(request);
}
