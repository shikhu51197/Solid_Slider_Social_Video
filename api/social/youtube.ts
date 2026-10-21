import { createSocialEndpoint } from '../../src/server/socialEndpoint.js';

const endpoint = createSocialEndpoint('youtube');
export default endpoint.handler;
export const GET = endpoint.GET;
