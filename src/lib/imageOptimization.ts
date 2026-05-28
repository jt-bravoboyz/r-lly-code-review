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
    const { width, height, quality = 75, resize } = opts;
    // Supabase's transformer leaves the unset axis at the source's pixel size
    // (producing a stretched image) unless BOTH width and height are passed.
    // When the caller only specifies one dimension, pad the other with a
    // generous bounding box and force `resize=contain` so the image scales
    // proportionally instead of being squashed.
    let effWidth = width;
    let effHeight = height;
    let effResize = resize ?? 'cover';
    if (width && !height) {
      effHeight = width * 4;
      effResize = 'contain';
    } else if (height && !width) {
      effWidth = height * 4;
      effResize = 'contain';
    }
    if (effWidth) u.searchParams.set('width', String(Math.round(effWidth)));
    if (effHeight) u.searchParams.set('height', String(Math.round(effHeight)));
    u.searchParams.set('quality', String(quality));
    if (effWidth || effHeight) u.searchParams.set('resize', effResize);
    return u.toString();
  } catch {
    return url;
  }
}
