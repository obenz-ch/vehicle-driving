import React, { useState } from 'react';
import { Search, MapPin, Eclipse as Gps } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, type: 'plate' | 'gps') => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'plate' | 'gps'>('plate');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), searchType);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center px-4 py-3 border-r border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSearchType('plate')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  searchType === 'plate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MapPin size={16} />
                <span>Plate</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchType('gps')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  searchType === 'gps'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Gps size={16} />
                <span>GPS</span>
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchType === 'plate'
                  ? 'Enter license plate number (e.g., ABC-123)'
                  : 'Enter GPS coordinates (e.g., 40.7128,-74.0060)'
              }
              className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 border-0 outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <Search size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};