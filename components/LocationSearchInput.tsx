import React, { useState, useEffect, useRef } from 'react';
import { LocationMarkerIcon } from './icons';

export interface LocationSearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation?: (result: LocationSearchResult) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  onSelectLocation,
  onSubmit,
  placeholder = 'e.g., London, UK',
  disabled = false,
  autoFocus = false,
  id = 'location-search',
}) => {
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            setSuggestions(data.results);
            setIsOpen(data.results.length > 0);
            setHighlightedIndex(-1);
          } else {
            setSuggestions([]);
            setIsOpen(false);
          }
        }
      } catch {
        // Silently catch fetch or abort errors
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: LocationSearchResult) => {
    const formatted = `${item.name}${item.admin1 ? ', ' + item.admin1 : ''}${item.country ? ', ' + item.country : ''}`;
    onChange(formatted);
    onSelectLocation?.(item);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      } else if (onSubmit) {
        setIsOpen(false);
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/20 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, idx) => (
            <li
              key={`${item.id}-${idx}`}
              role="option"
              aria-selected={highlightedIndex === idx}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => handleSelect(item)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                highlightedIndex === idx
                  ? 'bg-indigo-600/40 text-white'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <LocationMarkerIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-white">{item.name}</span>
                {(item.admin1 || item.country) && (
                  <span className="text-slate-400 ml-1.5 text-xs">
                    {[item.admin1, item.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearchInput;
