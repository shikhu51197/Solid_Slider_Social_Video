/** Server-side entry point shared by local middleware and production endpoints. */
export { fetchInstagramPosts } from './instagramApi.js';
export { fetchYouTubePosts } from './youtubeApi.js';
export { fetchFacebookPosts, diagnoseFacebookConnection, categorizeFacebookError,
  sanitizeFacebookSecrets, facebookCredentialVersion } from './facebookApi.js';
export type { FacebookDiagnosticResult, FacebookErrorCategory, FacebookFeedResult } from './facebookApi.js';
export { formatMetricNumber } from './socialApiShared.js';
