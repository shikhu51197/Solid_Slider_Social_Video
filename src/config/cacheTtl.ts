/** Shared validation for the public refresh/cache setting (milliseconds). */
export function parseSocialCacheTtl(value: string | undefined): number {
  const ttl = Number(value);
  return Number.isSafeInteger(ttl) && ttl >= 1000 ? ttl : 300_000;
}
