/** Browser URL for a file stored in MinIO. Nginx /uploads/ currently 502s when
 *  the MinIO upstream IP goes stale; /media/ is served by the Next.js app. */

export function storageKeyFromUrl(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  const uploadsOrMedia = url.match(/\/(?:uploads|media)\/(.+)$/);
  if (uploadsOrMedia?.[1]) return uploadsOrMedia[1];
  const bucket = url.match(/\/ridder\/(.+)$/);
  if (bucket?.[1]) return bucket[1];
  return fallback;
}

export function publicAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("/media/")) return url;

  const key = storageKeyFromUrl(url);
  if (!key) return url;

  const fromStorage =
    url.startsWith("/uploads/") ||
    url.includes("/uploads/") ||
    /(?:^|\/\/)minio(?::\d+)?\//.test(url) ||
    /:9000\/ridder\//.test(url);

  return fromStorage ? `/media/${key}` : url;
}
