import { fetchInstagramPosts } from '../../src/server/socialApiHandler.ts';

async function handleWeb(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 10;
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const result = await fetchInstagramPosts({ limit, forceRefresh });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Instagram posts';
    return new Response(
      JSON.stringify({ posts: [], source: 'instagram', error: message }),
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
    const limit = query.limit ? parseInt(String(query.limit), 10) : 10;
    const forceRefresh = query.refresh === 'true';

    const result = await fetchInstagramPosts({ limit, forceRefresh });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    if (typeof res.status === 'function') {
      return res.status(200).json(result);
    }
    res.statusCode = 200;
    return res.end(JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Instagram posts';
    const payload = { posts: [], source: 'instagram', error: message };
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
