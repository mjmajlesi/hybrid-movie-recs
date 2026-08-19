import React from 'react';
import type { SearchItem } from '../types';

interface SearchResultsProps {
  items: SearchItem[];
  onSelectItem: (item: SearchItem) => void;
  selectedItems: SearchItem[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  items,
  onSelectItem,
  selectedItems,
}) => {
  const isSelected = (item: SearchItem) =>
    selectedItems.some((si) => si.id === item.id && si.type === item.type);

  return (
    <div className="mt-4">
      <div className="mb-2 font-medium">Search results:</div>
      {items.length === 0 ? (
        <p className="text-gray-500">No results found. Try a different search term.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`border rounded-md p-3 hover:shadow-md transition-shadow cursor-pointer ${
                isSelected(item) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => onSelectItem(item)}
            >
              {item.poster_path && (
                <img
                  src={`/covers/${item.poster_path}`}
                  alt={item.name}
                  className="w-full h-36 object-cover rounded-md"
                />
              )}
              <h3 className="font-bold text-lg">{item.name}</h3>
              <div className="text-sm text-gray-600">
                {item.year} • {item.genres} • ⭐ {item.rating.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};