import { fetchFacebookPosts } from '../../../../src/server/socialApiHandler';

/**
 * Next.js App Router Route Handler: GET /api/social/facebook
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageId = url.searchParams.get('pageId') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 10;
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const result = await fetchFacebookPosts({ pageId, limit, forceRefresh });
    return Response.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Facebook posts';
    return Response.json(
      { posts: [], source: 'facebook', error: message },
      { status: 500 }
    );
  }
}
