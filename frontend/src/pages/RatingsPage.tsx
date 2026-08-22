import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRatings, deleteRating, searchItems, rateItem } from '../api';
import { Button } from '../components/Button';
import { useUserId } from '../utils/useUserId';
import { getPosterUrl, getGradientForTitle, getInitials } from '../utils/media';
import { Bookmark, Trash2, Search, Star, Loader2 } from 'lucide-react';

interface RatingRow {
  item_id: string;
  type: 'movie' | 'show';
  title: string;
  year: number;
  genres: string;
  rating: number;
  avg_rating: number;
  tmdb_id?: number | null;
  poster_path?: string | null;
  timestamp?: number;
}

const RatingsPage: React.FC = () => {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useUserId();
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadRatings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserRatings(userId);
      setRatings(data || []);
    } catch (err: any) {
      setError('Failed to load ratings. ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRatings(); }, [userId]);

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      await deleteRating(userId, itemId);
      setRatings(ratings.filter((r) => r.item_id !== itemId));
    } catch (err) {
      setError('Failed to delete rating.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSearch = async () => {
    if (addQuery.trim().length < 2) return;
    try {
      const results = await searchItems(addQuery);
      setAddResults(results);
    } catch (err: any) {
      setError('Search failed. ' + (err?.message || ''));
    }
  };

  const handleAddRating = async (item: any) => {
    const itemId = item.id; // prefixed id e.g. m:123 or s:abc
    setAddingId(itemId);
    try {
      // Default 4.0 when adding from this panel
      await rateItem(userId, itemId, 4.0);
      await loadRatings();
      setShowAdd(false);
      setAddQuery('');
      setAddResults([]);
    } catch (err) {
      setError('Failed to add rating.');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-slate-800 rounded w-48 shimmer mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-900/60 rounded-xl shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#f0f0f0]">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
              <Bookmark className="text-white" size={32} />
              My Ratings
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {ratings.length} item(s) rated · User #{userId}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setUserId(userId === 1 ? 2 : 1)}>
              User #{userId === 1 ? 2 : 1}
            </Button>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Star className="mr-1" size={16} />
              Add Rating
            </Button>
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="mb-8 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSearch()}
                  placeholder="Search to add..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <Button onClick={handleAddSearch} variant="secondary">Search</Button>
            </div>

            {addResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto scrollbar-thin">
                {addResults.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900 rounded-xl p-3 border border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0">
                        {renderPoster(item)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.year}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddRating(item)} disabled={addingId === item.id}>
                      {addingId === item.id ? <Loader2 size={16} className="animate-spin" /> : '+ Rate'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ratings list */}
        {ratings.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-white mb-2">No ratings yet</h3>
            <p className="text-gray-400 mb-6">Rate movies and shows to build your taste profile.</p>
            <Button onClick={() => setShowAdd(true)}>Add Your First Rating</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ratings.map((r) => (
              <div
                key={r.item_id}
                onClick={() => navigate(`/${r.type}/${r.item_id}?u=${userId}`)}
                className="group flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-white/30 transition-all cursor-pointer"
              >
                <div className="relative w-14 h-20 rounded-xl overflow-hidden shrink-0">
                  {renderPoster(r)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white truncate">{r.title}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-gray-300">
                      {r.type === 'movie' ? '🎬 Movie' : '📺 Series'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{r.genres || '—'}</p>
                  <p className="text-xs text-gray-500">{r.year || '—'} · ★ {r.avg_rating.toFixed(1)} avg</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Your rating</p>
                    <div className="flex items-center gap-1 text-yellow-400 font-semibold">
                      <Star size={14} fill="currentColor" />
                      {r.rating.toFixed(1)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.item_id); }}
                    disabled={deletingId === r.item_id}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    aria-label="Delete rating"
                  >
                    {deletingId === r.item_id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function renderPoster(item: any) {
    const poster = getPosterUrl(item.type, {
      tmdbId: item.tmdb_id,
      posterPath: item.poster_path,
    });
    if (poster) {
      return <img src={poster} alt={item.title || item.name} className="w-full h-full object-cover" />;
    }
    const g = getGradientForTitle(item.title || item.name || '?');
    return (
      <div
        className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
      >
        {getInitials(item.title || item.name || '?')}
      </div>
    );
  }
};

export default RatingsPage;
