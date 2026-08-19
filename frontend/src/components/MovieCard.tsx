import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { getPosterUrl, getGradientForTitle, getInitials } from '../utils/media';
import type { SearchItem } from '../types';

/**
 * MovieCard accepts EITHER a SearchItem OR a Recommendation.
 * We normalise to a common interface so both paths render identically.
 */
interface NormalizedItem {
  title: string;
  type: 'movie' | 'show';
  year: number;
  rating: number;
  genres: string;
  poster_path?: string | null;
  tmdb_id?: number | null;
  reason?: string;
  score?: number;
  item_id?: string;
  overview?: string;
}

interface MovieCardProps {
  item: SearchItem | (Record<string, any> & {});
  onClick?: () => void;
  onRate?: (rating: number) => void;
  showMatchScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MovieCard: React.FC<MovieCardProps> = ({
  item,
  onClick,
  onRate,
  showMatchScore = false,
  size = 'md',
}) => {
  // Normalise the union type to a single shape
  const normalized: NormalizedItem = (() => {
    if ('title' in item) {
      // Recommendation
      return {
        title: (item as Record<string, any>).title || '',
        type: (item as Record<string, any>).type || 'movie',
        year: (item as Record<string, any>).year || 0,
        rating: (item as Record<string, any>).rating || 0,
        genres: (item as Record<string, any>).genres || '',
        poster_path: (item as Record<string, any>).poster_path || null,
        tmdb_id: (item as Record<string, any>).tmdb_id || (item as Record<string, any>).tmdbId || null,
        reason: (item as Record<string, any>).reason || '',
        score: (item as Record<string, any>).score || 0,
        item_id: (item as Record<string, any>).item_id || '',
      };
    }
    // SearchItem
    return {
      title: (item as any).name || '',
      type: (item as any).type || 'movie',
      year: (item as any).year || 0,
      rating: (item as any).rating || 0,
      genres: (item as any).genres || '',
      poster_path: (item as any).poster_path || null,
      tmdb_id: (item as any).tmdb_id || null,
      reason: '',
      score: 0,
      item_id: (item as any).id || '',
    };
  })();

  const { title, type, year, rating, genres, poster_path, tmdb_id } = normalized;

  const posterUrl = getPosterUrl(type as 'movie' | 'show', {
    tmdbId: tmdb_id ?? undefined,
    posterPath: poster_path ?? undefined,
  });

  const [imgFailed, setImgFailed] = useState(false);
  const showPoster = posterUrl && !imgFailed;

  const gradient = getGradientForTitle(title);
  const initials = getInitials(title);

  const aspect = size === 'sm' ? 'aspect-[2/3]' : 'aspect-[2/3]';
  const cardSize = size === 'sm' ? 'max-w-[140px]' : '';

  return (
    <div
      onClick={onClick}
      className={`group relative bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${cardSize}`}
    >
      <div className={`relative ${aspect} bg-gradient-to-br from-slate-700 to-slate-800`}>
        {showPoster ? (
          <img
            src={posterUrl!}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl md:text-5xl font-bold text-white/80"
            style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
          >
            {initials}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Type badge */}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
          {type === 'movie' ? '🎬' : '📺'}
          <span className="hidden sm:inline">{type === 'movie' ? 'Movie' : 'Series'}</span>
        </div>

        {/* Rating badge */}
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-xs font-medium text-yellow-400">
          ⭐ {rating.toFixed(1)}
        </div>

        {/* Match score */}
        {showMatchScore && normalized.score !== undefined && normalized.score > 0 && (
          <div className="absolute bottom-2 left-2 bg-purple-900/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-purple-300 flex items-center gap-1">
            <svg
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-purple-400"
            >
              <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z" />
            </svg>
            {normalized.score.toFixed(2)} match
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="text-white font-bold text-sm md:text-base line-clamp-1">{title}</h3>
        <p className="text-xs text-gray-400 line-clamp-1">{genres}</p>
        {year > 0 && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx={12} cy={12} r={10} />
              <path d="M12 7v5l3 3" />
            </svg>
            {year}
          </p>
        )}

        {onRate && (
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <StarRating
              value={Math.round(rating)}
              onChange={onRate}
              max={5}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};
