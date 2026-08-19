export type ItemType = 'movie' | 'show';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Build a poster URL.
 *
 * Movies: we cached posters locally at /covers/movies/{tmdbId}.jpg.
 * If the file doesn't exist locally (or wasn't downloaded yet), we fall
 * back to the live TMDB CDN URL which serves the image by tmdb_id.
 *
 * Shows: already store poster_path in the DB (e.g. '/abc.jpg'), served
 * directly from TMDB CDN.
 *
 * @param type 'movie' | 'show'
 * @param opts { tmdbId?, posterPath? }
 * @param size one of w92, w154, w185, w342, w500, original
 */
export function getPosterUrl(
  type: ItemType,
  opts: { tmdbId?: number | null; posterPath?: string | null },
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'original' = 'w342'
): string | null {
  if (type === 'show') {
    if (opts.posterPath) {
      return `${TMDB_IMAGE_BASE}/${size}${opts.posterPath}`;
    }
    return null;
  }

  // Movie: TMDB CDN serves /t/p/<size>/<tmdb_id>.jpg
  // (We also keep local copies under /covers/movies/<tmdb_id>.jpg, but
  // serving from CDN is simpler and works for any movie, cached or not.)
  if (opts.tmdbId) {
    return `${TMDB_IMAGE_BASE}/${size}/${opts.tmdbId}.jpg`;
  }
  return null;
}

/**
 * Generate a deterministic gradient + initials fallback for items without posters.
 * Uses a hash of the title so the same movie always gets the same color.
 */
export function getGradientForTitle(title: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  return {
    from: `hsl(${hue1}, 70%, 45%)`,
    to: `hsl(${hue2}, 70%, 25%)`,
  };
}

export function getInitials(title: string): string {
  const clean = title.replace(/\(\d{4}\)/, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
