import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItemDetails, rateItem } from '../api';
import { StarRating } from '../components/StarRating';
import { Button } from '../components/Button';
import { getPosterUrl, getGradientForTitle, getInitials } from '../utils/media';
import { Calendar, Clock, Star, ArrowLeft, Film, Tv, Bookmark } from 'lucide-react';

interface ItemDetails extends Record<string, any> {
  movie_id?: number;
  show_id?: string;
  title?: string;
  name?: string;
  year?: number;
  genres?: string;
  avg_rating?: number;
  rating_count?: number;
  overview?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  poster_path?: string;
  tmdb_id?: number;
  status?: string;
}

const DetailPage: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();

  const isMovie = type === 'movie';
  const itemId = `${isMovie ? 'm' : 's'}:${id}`;

  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getItemDetails(itemId);
        if (!cancelled) setItem(data);
      } catch (err: any) {
        if (!cancelled) setError('Failed to load. ' + (err?.message || ''));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [itemId]);

  const title = item?.title || item?.name || '';
  const year = item?.year || (item?.first_air_date ? parseInt(item.first_air_date) : 0);
  const rating = item?.avg_rating || item?.vote_average || 0;
  const ratingCount = item?.rating_count || item?.vote_count || 0;
  const genres = item?.genres || '';
  const overview = item?.overview || '';
  const posterUrl = getPosterUrl(isMovie ? 'movie' : 'show', {
    tmdbId: item?.tmdb_id,
    posterPath: item?.poster_path,
  });
  const gradient = getGradientForTitle(title);
  const initials = getInitials(title);

  const handleRate = async (newRating: number) => {
    setUserRating(newRating);
    setSaving(true);
    setRatingSaved(false);
    try {
      await rateItem(1, itemId, newRating);
      setRatingSaved(true);
    } catch (err) {
      setError('Failed to save rating.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 w-24 bg-slate-700 rounded shimmer mb-6" />
          <div className="grid md:grid-cols-[300px_1fr] gap-8">
            <div className="aspect-[2/3] bg-slate-800 rounded-xl shimmer" />
            <div className="space-y-4">
              <div className="h-10 bg-slate-700 rounded w-2/3 shimmer" />
              <div className="h-4 bg-slate-700 rounded w-1/3 shimmer" />
              <div className="h-4 bg-slate-700 rounded w-full shimmer" />
              <div className="h-4 bg-slate-700 rounded w-full shimmer" />
              <div className="h-4 bg-slate-700 rounded w-3/4 shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Not found'}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Poster */}
          <div>
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-slate-700 bg-slate-800">
              {posterUrl ? (
                <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-6xl font-bold text-white/80"
                  style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Rate box */}
            <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400 mb-2">Rate this {isMovie ? 'movie' : 'show'}</p>
              <div className="flex justify-center">
                <StarRating value={userRating} onChange={handleRate} max={5} size="lg" />
              </div>
              {saving && <p className="text-xs text-purple-300 mt-2">Saving...</p>}
              {ratingSaved && !saving && (
                <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1">
                  <Star size={12} fill="currentColor" /> Saved! Your rating: {userRating.toFixed(1)}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2.5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Star size={14} className="text-yellow-400" /> Community Rating
                </span>
                <span className="font-semibold">{rating ? rating.toFixed(1) : '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2.5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Clock size={14} /> Year
                </span>
                <span className="font-semibold">{year || '—'}</span>
              </div>
              {!isMovie && item?.number_of_seasons !== undefined && (
                <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2.5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Tv size={14} /> Seasons
                  </span>
                  <span className="font-semibold">{item.number_of_seasons}</span>
                </div>
              )}
              {!isMovie && item?.number_of_episodes !== undefined && (
                <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2.5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Film size={14} /> Episodes
                  </span>
                  <span className="font-semibold">{item.number_of_episodes}</span>
                </div>
              )}
              <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2.5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Bookmark size={14} /> Ratings
                </span>
                <span className="font-semibold">{ratingCount ? ratingCount.toLocaleString() : '—'}</span>
              </div>
              {!isMovie && item?.status && (
                <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2.5">
                  <span className="text-gray-400">Status</span>
                  <span className="font-semibold">{item.status}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600">
                {isMovie ? '🎬 Movie' : '📺 Series'}
              </span>
              {item?.genres && (
                <div className="flex flex-wrap gap-1">
                  {genres.split(/[|,]/).filter(Boolean).map((g) => (
                    <span key={g} className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-gray-300 border border-slate-700">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-3 leading-tight">{title}</h1>

            <p className="text-gray-400 mb-6 flex items-center gap-2 flex-wrap">
              <Calendar size={16} className="text-purple-400" />
              {year || 'Unknown year'}
              {rating > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  ★ {rating.toFixed(1)}
                </span>
              )}
              {ratingCount > 0 && (
                <span className="text-gray-500">({ratingCount.toLocaleString()} ratings)</span>
              )}
            </p>

            {overview && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-purple-300">Overview</h2>
                <p className="text-gray-300 leading-relaxed">{overview}</p>
              </div>
            )}

            {!overview && (
              <div className="mb-8 p-6 bg-slate-800/30 border border-slate-700 rounded-xl text-gray-400">
                No overview available for this title.
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate('/home')}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <SparklesIcon className="mr-2" size={18} />
                Get Recommendations
              </Button>
              <Button variant="outline" onClick={() => navigate('/ratings')}>
                View My Ratings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small inline icon to avoid extra import
const SparklesIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2zM19 14l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
  </svg>
);

export default DetailPage;