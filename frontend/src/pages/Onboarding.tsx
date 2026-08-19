import React, { useState, useEffect } from 'react';
import { searchItems, rateItem } from '../api';
import { StarRating } from '../components/StarRating';
import { MovieCard } from '../components/MovieCard';
import { Button } from '../components/Button';
import type { SearchItem } from '../types';
import { useDebounce } from '../utils/useDebounce';
import { Search, Loader2, Check } from 'lucide-react';

const Onboarding: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SearchItem[]>([]);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  // Auto-search on debounced query change
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const fetchResults = async () => {
      setSearching(true);
      setError(null);
      try {
        const items = await searchItems(debouncedQuery);
        if (!cancelled) setSearchResults(items);
      } catch (err: any) {
        if (!cancelled) setError('Search failed. ' + (err?.message || ''));
      } finally {
        if (!cancelled) setSearching(false);
      }
    };
    fetchResults();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelectItem = (item: SearchItem) => {
    if (selectedItems.some((si) => si.id === item.id && si.type === item.type)) {
      setSelectedItems(selectedItems.filter((si) => !(si.id === item.id && si.type === item.type)));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item.');
      return;
    }
    if (rating === 0) {
      setError('Please give a rating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await Promise.all(selectedItems.map((item) => rateItem(1, item.id, rating)));
      setSuccessMsg(`Saved! Rated ${selectedItems.length} item(s) as ${rating.toFixed(1)} stars.`);
      setSelectedItems([]);
      setRating(0);
      setQuery('');
      setSearchResults([]);
    } catch (err) {
      setError('Failed to save ratings.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Discover Your Taste
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Search for movies and TV shows you've enjoyed, rate them, and get personalized recommendations.
          </p>
        </header>

        {/* Search Box */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies & shows... (e.g. 'Matrix', 'Friends')"
            className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          {searching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" size={20} />
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-700 text-red-200 text-sm mb-6">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-green-900/30 border border-green-700 text-green-200 text-sm mb-6">
            {successMsg}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              Search results ({searchResults.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((item) => {
                const isSelected = selectedItems.some(
                  (si) => si.id === item.id && si.type === item.type
                );
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectItem(item)}
                    className="relative"
                  >
                    <MovieCard item={item} size="sm" />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center z-10 shadow-lg">
                        <Check className="text-white" size={16} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty search state */}
        {searchResults.length === 0 && query.trim().length >= 2 && !searching && !error && (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-xl mb-8">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No results for "{query}"</h3>
            <p className="text-gray-500 text-sm">Try a different movie or show name.</p>
          </div>
        )}

        {/* Selected + Rating */}
        {selectedItems.length > 0 && (
          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">
              Selected items ({selectedItems.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {selectedItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 bg-slate-800 rounded-lg p-2 pr-4">
                  <div className="w-8 h-10 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center text-sm">
                    🎬
                  </div>
                  <div>
                    <span className="font-medium text-white text-sm">{item.name}</span>
                    <span className="text-xs text-gray-400"> ({item.year})</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <span className="text-sm font-semibold text-gray-200">Rate all as:</span>
              <StarRating value={rating} onChange={setRating} max={5} size="md" />
            </div>

            <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full">
              {submitting ? 'Saving...' : 'Get Recommendations →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
