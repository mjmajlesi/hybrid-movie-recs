export type ItemType = 'movie' | 'show';

/**
 * Build a TMDB poster URL. Movies use their tmdb_id to construct the
 * image path on the fly (the dataset didn't store poster_path for movies),
 * while shows already have poster_path in the DB.
 *
 * @param type 'movie' | 'show'
 * @param tmdbId numeric TMDB id (movies)
 * @param posterPath string path like '/abc.jpg' (shows)
 * @param size one of w92, w154, w185, w342, w500, original
 */
export function getPosterUrl(
  type: ItemType,
  opts: { tmdbId?: number | null; posterPath?: string | null },
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'original' = 'w342'
): string | null {
  const base = 'https://image.tmdb.org/t/p';

  if (type === 'show') {
    if (opts.posterPath) {
      return `${base}/${size}${opts.posterPath}`;
    }
    return null;
  }

  // Movie: TMDB serves /t/p/<size>/<tmdb_id>.jpg for most movies
  if (opts.tmdbId) {
    return `${base}/${size}/${opts.tmdbId}.jpg`;
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
