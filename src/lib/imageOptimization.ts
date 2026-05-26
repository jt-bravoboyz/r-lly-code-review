/**
 * Supabase Storage image optimization helper.
 *
 * Rewrites a public storage URL onto the on-the-fly image transformation
 * endpoint so we serve appropriately-sized JPEGs instead of multi-MB phone
 * originals. Non-Supabase / already-transformed / empty URLs pass through.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' | 'fill' } = {},
): string {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/public/')) return url;
  if (url.includes('/storage/v1/render/image/public/')) return url;

  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );
    const { width, height, quality = 75, resize = 'cover' } = opts;
    if (width) u.searchParams.set('width', String(Math.round(width)));
    if (height) u.searchParams.set('height', String(Math.round(height)));
    u.searchParams.set('quality', String(quality));
    u.searchParams.set('resize', resize);
    return u.toString();
  } catch {
    return url;
  }
}
