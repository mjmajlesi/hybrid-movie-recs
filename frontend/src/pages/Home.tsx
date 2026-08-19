import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecommendations,
  rateItem,
  getPopularMovies,
  getPopularShows,
  searchItems,
} from '../api';
import { MovieCard } from '../components/MovieCard';
import { StarRating } from '../components/StarRating';
import { Button } from '../components/Button';
import type { Recommendation, SearchItem } from '../types';
import { Sparkles, Grid, List, TrendingUp, SlidersHorizontal } from 'lucide-react';

const GENRE_OPTIONS = [
  'All Genres',
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama',
  'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
  'Documentary', 'Family', 'History',
];

const SORT_OPTIONS = ['Match Score', 'Rating (High)', 'Rating (Low)', 'Release Year'];

const Home: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState(1);
  const [activeTab, setActiveTab] = useState<'movies' | 'shows'>('movies');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [sortOption, setSortOption] = useState('Match Score');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  
  const navigate = useNavigate();

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecommendations(userId, 12);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError('Failed to load recommendations. Check backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const movies = await getPopularMovies(10);
      const shows = await getPopularShows(10);
      return { movies, shows };
    } catch (err) {
      setError('Failed to load trending.');
      return { movies: [], shows: [] };
    }
  };

  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingShows, setTrendingShows] = useState<any[]>([]);

  useEffect(() => {
    loadRecommendations();
    loadTrending().then((t) => {
      setTrendingMovies(t.movies);
      setTrendingShows(t.shows);
    });
  }, [userId]);

  // Handle search - simple debounced inline
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const items = await searchItems(searchQuery);
        setSearchResults(items);
      } catch (err) {
        setError('Search failed.');
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRate = async (itemId: string, newRating: number) => {
    try {
      await rateItem(userId, itemId, newRating);
      setRecommendations(recommendations.filter((r) => r.item_id !== itemId));
    } catch (err) {
      setError('Failed to rate item.');
    }
  };

  // Apply genre/sor
  const filteredRecs: Recommendation[] = useMemo(() => {
    if (searchResults.length > 0) {
      return searchAsRecs;
    }

    let items = [...recommendations];

    // Genre filter
    if (selectedGenre !== 'All Genres') {
      items = items.filter((r) => r.genres && r.genres.includes(selectedGenre));
    }

    // Sort
    switch (sortOption) {
      case 'Match Score':
        items.sort((a, b) => b.score - a.score);
        break;
      case 'Rating (High)':
        items.sort((a, b) => b.rating - a.rating);
        break;
      case 'Rating (Low)':
        items.sort((a, b) => a.rating - b.rating);
        break;
      case 'Release Year':
        items.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
    }

    return items;
  }, [recommendations, searchResults, selectedGenre, sortOption]);

  // Normalise search results into Recommendation shape so the grid/list
  // views can use item_id/title/reason/score uniformly.
  const searchAsRecs: Recommendation[] = searchResults.map((s) => ({
    item_id: (s as any).id || `${s.type}:${s.id}`,
    title: s.name,
    type: s.type,
    score: 0,
    genres: s.genres || '',
    year: s.year || 0,
    rating: s.rating || 0,
    reason: 'Search result',
    poster_path: (s as any).poster_path || '',
    tmdb_id: (s as any).tmdb_id || null,
  }));

  const movieRecs = filteredRecs.filter((r) => r.type === 'movie');
  const showRecs = filteredRecs.filter((r) => r.type === 'show');
  const displayRecs: Recommendation[] = searchAsRecs.length > 0
    ? searchAsRecs
    : (activeTab === 'movies' ? movieRecs : showRecs);

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
          <div className="aspect-[2/3] bg-slate-700 shimmer rounded-t-xl" />
          <div className="p-3 space-y-2">
            <div className="h-5 bg-slate-700 rounded w-3/4 shimmer" />
            <div className="h-3 bg-slate-700 rounded w-1/2 shimmer" />
            <div className="h-3 bg-slate-700 rounded w-5/6 shimmer" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header + Search */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <Sparkles className="text-purple-400" size={32} />
                <span>Recommendations</span>
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {displayRecs.length} items for User #{userId}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setUserId(userId === 1 ? 2 : 1)}>
                Switch to User #{userId === 1 ? 2 : 1}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/ratings')}>
                My Ratings
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies & shows... (press Esc to clear)"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} />
            </svg>
          </div>

          {searchQuery.length > 0 && !searchQuery.trim() === false && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="mt-2 text-gray-400 hover:text-white"
            >
              Clear search
            </Button>
          )}
        </header>

        {/* Trending Section */}
        {!isSearching && searchResults.length === 0 && (
          <>
            {/* Trending Movies */}
            {trendingMovies.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-purple-400" />
                  <h2 className="text-xl font-bold">Trending Movies</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {trendingMovies.map((m) => (
                    <MovieCard
                      key={m.movie_id}
                      item={{
                        item_id: `m:${m.movie_id}`,
                        title: m.title,
                        type: 'movie',
                        score: 0,
                        genres: m.genres || '',
                        year: m.year || 0,
                        rating: m.avg_rating || 0,
                        reason: '',
                        poster_path: m.poster_path || '',
                        tmdb_id: m.tmdb_id,
                      } as Recommendation}
                      onClick={() => navigate(`/movie/m:${m.movie_id}`)}
                      size="sm"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Trending Shows */}
            {trendingShows.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-blue-400" />
                  <h2 className="text-xl font-bold">Trending Series</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {trendingShows.map((s) => (
                    <MovieCard
                      key={s.show_id}
                      item={{
                        item_id: `s:${s.show_id}`,
                        title: s.name,
                        type: 'show',
                        score: 0,
                        genres: s.genres || '',
                        year: s.first_air_date ? parseInt(s.first_air_date) : 0,
                        rating: s.vote_average || 0,
                        reason: '',
                        poster_path: s.poster_path || '',
                      } as Recommendation}
                      onClick={() => navigate(`/show/s:${s.show_id}`)}
                      size="sm"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Recommendations Section */}
        {!isSearching && searchResults.length === 0 && (
          <section className="mb-10">
            {/* Tabs */}
            <div className="flex items-center justify-between mb-6">
              <nav className="flex gap-2 p-1 bg-slate-800/50 border border-slate-700 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setActiveTab('movies')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'movies'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Movies ({movieRecs.length})
                </button>
                <button
                  onClick={() => activeTab === 'shows' ? setViewMode('list') : setActiveTab('shows')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'shows'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Shows ({showRecs.length})
                </button>
              </nav>

              <div className="flex gap-2">
                <Button
                  variant={showFilters ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal size={16} className="mr-1" />
                  Filters
                </Button>
                <div className="flex border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-gray-400'}`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-gray-400'}`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Genre Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {GENRE_OPTIONS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setSelectedGenre(g)}
                          className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                            selectedGenre === g
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                              : 'bg-slate-800 text-gray-300 hover:text-white'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {SORT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {loading ? renderSkeleton() : (
              error ? (
                <div className="text-center py-16">
                  <p className="text-red-400 mb-4">{error}</p>
                  <Button onClick={loadRecommendations}>Retry</Button>
                </div>
              ) : displayRecs.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/20 border border-slate-700 rounded-xl">
                  <div className="text-5xl mb-4">{activeTab === 'movies' ? '🎬' : '📺'}</div>
                  <h3 className="text-xl font-bold text-gray-300 mb-2">No recommendations yet</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    Rate movies and shows on the Discovery page, then refresh here.
                  </p>
                  <Button onClick={() => navigate('/onboarding')} className="bg-gradient-to-r from-purple-600 to-blue-600">
                    Go Rate Items
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {displayRecs.map((rec) => (
                    <div key={rec.item_id} onClick={() => navigate(`/${rec.type}/${rec.item_id}`)} className="cursor-pointer">
                      <MovieCard
                        item={rec}
                        onClick={() => navigate(`/${rec.type}/${rec.item_id}`)}
                        onRate={(val) => handleRate(rec.item_id, val)}
                        showMatchScore={true}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayRecs.map((rec) => (
                    <div
                      key={rec.item_id}
                      onClick={() => navigate(`/${rec.type}/${rec.item_id}`)}
                      className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all cursor-pointer group"
                    >
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <MovieCard item={rec} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-lg line-clamp-1">{rec.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-1">{rec.genres}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating
                            value={Math.round(rec.rating)}
                            onChange={(val) => handleRate(rec.item_id, val)}
                            max={5}
                            size="sm"
                          />
                          <span className="text-xs text-purple-300 bg-purple-900/20 px-2 py-0.5 rounded">
                            {rec.reason}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Score</p>
                        <p className="text-xl font-bold text-purple-400">{rec.score.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        )}

        {/* Search Results View */}
        {!isSearching && searchResults.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Search results for "{searchQuery}"</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {searchResults.map((item) => (
                <MovieCard
                  key={`${item.type}-${item.id}`}
                  item={{
                    item_id: item.id,
                    title: item.name,
                    type: item.type,
                    score: 0,
                    genres: item.genres || '',
                    year: item.year || 0,
                    rating: item.rating || 0,
                    reason: '',
                    poster_path: item.poster_path || '',
                  } as Recommendation}
                  onClick={() => navigate(`/${item.type}/${item.id}`)}
                  size="sm"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;