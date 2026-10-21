import { withUpstreamBudget } from './upstreamFetch.js';
import { diagnoseFacebookConnection, fetchFacebookPosts, fetchInstagramPosts, fetchYouTubePosts } from './socialApiHandler.js';

type Platform = 'instagram' | 'facebook' | 'youtube';
export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Bound public query cardinality; refresh never bypasses the shared cache. */
export function validateQuery(platform: Platform, url: URL) {
  const allowed = new Set(['limit', 'refresh', ...(platform === 'facebook' ? ['pageId', 'diagnostic'] : []), ...(platform === 'youtube' ? ['handle'] : [])]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) throw new RequestError('Unsupported query parameter');
  }
  const rawLimit = url.searchParams.get('limit');
  if (rawLimit !== null && !/^(?:[1-9]|10)$/.test(rawLimit)) throw new RequestError('limit must be an integer from 1 to 10');
  const limit = rawLimit === null ? 10 : Number(rawLimit);
  const refresh = url.searchParams.get('refresh');
  if (refresh !== null && !['true', 'false'].includes(refresh)) throw new RequestError('Invalid refresh value');
  const pageId = url.searchParams.get('pageId');
  if (pageId !== null && pageId !== process.env.FACEBOOK_PAGE_ID) throw new RequestError('Only the configured Facebook Page is supported');
  const diagnostic = url.searchParams.get('diagnostic');
  if (diagnostic !== null && !['true', 'false'].includes(diagnostic)) throw new RequestError('Invalid diagnostic value');
  const configuredHandle = process.env.YOUTUBE_CHANNEL_HANDLE || process.env.VITE_YOUTUBE_CHANNEL_HANDLE || '@bajaj_finance_limited';
  const handle = url.searchParams.get('handle') || configuredHandle;
  const normalize = (value: string) => value.replace(/^@/, '').toLowerCase();
  const handles = [configuredHandle, '@bajaj_finance_limited', 'BajajFinanceMoneyAdda', 'BajajFinanceElectronics', 'BajajFinanceWheels', 'BajajFinanceHowtoGuide'];
  const canonicalHandle = handles.find(value => normalize(value) === normalize(handle));
  if (platform === 'youtube' && !canonicalHandle) throw new RequestError('Unsupported YouTube channel');
  const canonical = new URLSearchParams();
  if (limit !== 10) canonical.set('limit', String(limit));
  if (platform === 'youtube' && normalize(handle) !== normalize(configuredHandle)) canonical.set('handle', canonicalHandle!);
  if (diagnostic === 'true') canonical.set('diagnostic', 'true');
  return { limit, handle: canonicalHandle || configuredHandle, diagnostic: diagnostic === 'true', canonical: canonical.toString() };
}

export function createRateLimiter(maxRequests = 120, intervalMs = 60_000, maxEntries = 2048) {
  const entries = new Map<string, { count: number; until: number }>();
  return (key: string, now = Date.now()) => {
    let entry = entries.get(key);
    if (!entry || now >= entry.until) {
      if (entries.size >= maxEntries) {
        for (const [ip, value] of entries) if (now >= value.until) entries.delete(ip);
        if (entries.size >= maxEntries) return false;
      }
      entry = { count: 0, until: now + intervalMs };
      entries.set(key, entry);
    }
    return ++entry.count <= maxRequests;
  };
}

const allowRequest = createRateLimiter();
const results = new Map<string, { data: unknown; until: number }>();
const pending = new Map<string, Promise<unknown>>();

export async function cachedResult(key: string, load: () => Promise<unknown>, ttlMs: number) {
  const cached = results.get(key);
  if (cached && Date.now() < cached.until) return cached.data;
  if (pending.has(key)) return pending.get(key)!;
  const request = withUpstreamBudget(load).then(data => {
    const failed = (data as { status?: string }).status === 'error';
    if (results.size >= 256) results.delete(results.keys().next().value!);
    results.set(key, { data, until: Date.now() + (failed ? 5000 : ttlMs) });
    return data;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function createSocialEndpoint(platform: Platform) {
  const handleWeb = async (request: Request): Promise<Response> => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
      if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...headers, Allow: 'GET, OPTIONS' } });
      const url = new URL(request.url);
      const query = validateQuery(platform, url);
      const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
      if (!allowRequest(ip)) return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...headers, 'Retry-After': '60' } });
      // Canonical URLs prevent refresh flags, aliases and query ordering from
      // splitting Vercel's shared CDN cache into unbounded variants.
      if (url.search.slice(1) !== query.canonical) {
        return new Response(null, { status: 307, headers: { ...headers, Location: `${url.pathname}${query.canonical ? '?' + query.canonical : ''}` } });
      }
      const ttl = platform === 'facebook' ? 60 : 300;
      const key = `${platform}:${query.canonical}`;
      const data = await cachedResult(key, async () => {
        if (platform === 'facebook') return query.diagnostic ? diagnoseFacebookConnection() : fetchFacebookPosts({ limit: query.limit });
        if (platform === 'instagram') return fetchInstagramPosts({ limit: query.limit });
        return fetchYouTubePosts({ limit: query.limit, handle: query.handle });
      }, ttl * 1000);
      const failed = (data as { status?: string }).status === 'error';
      return new Response(JSON.stringify(data), { status: 200, headers: {
        ...headers, 'Access-Control-Allow-Origin': '*',
        'Cache-Control': failed ? 'no-store' : `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=30`,
        'Vercel-CDN-Cache-Control': failed ? 'no-store' : `public, s-maxage=${ttl}, stale-while-revalidate=30`,
      } });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 502;
      // Provider responses and credential-bearing request URLs stay server-side.
      return new Response(JSON.stringify({ posts: [], source: platform, status: 'error', errorCategory: status === 400 ? 'invalid_request' : 'network_error', error: error instanceof RequestError ? error.message : 'Unable to load social content. Please try again.' }), { status, headers });
    }
  };
  const handler = async (req: any, res?: any) => {
    if (!res || typeof req?.headers?.get === 'function') return handleWeb(req as Request);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) if (typeof value === 'string') headers.set(key, value);
    const response = await handleWeb(new Request(new URL(req.url || `/api/social/${platform}`, 'http://localhost'), { method: req.method || 'GET', headers }));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };
  return { handler, GET: handleWeb };
}
