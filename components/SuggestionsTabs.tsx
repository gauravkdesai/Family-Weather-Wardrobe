import React, { useState } from 'react';
import { ClothingSuggestion, FamilyMember } from '../types';
import SuggestionCard from './SuggestionCard';
import { PinIcon, SolidPinIcon } from './icons';

interface SuggestionsTabsProps {
  suggestions: ClothingSuggestion[];
  family: FamilyMember[];
  onTogglePin: (memberName: string) => void;
}

const SuggestionsTabs: React.FC<SuggestionsTabsProps> = ({ suggestions, family, onTogglePin }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!suggestions || suggestions.length === 0) {
    return <div className="p-6 text-center text-slate-500">No suggestions available.</div>;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {suggestions.map((suggestion, index) => {
          const memberData = family.find(f => f.name === suggestion.member);
          const isPinned = memberData?.pinned ?? false;

          return (
            <button
              key={suggestion.member}
              onClick={() => setActiveIndex(index)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 text-center text-sm font-semibold transition-colors focus:outline-none ${
                activeIndex === index
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="truncate">{suggestion.member}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation(); // Prevent tab from changing focus on pin click
                  onTogglePin(suggestion.member);
                }}
                className="cursor-pointer p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
                aria-label={isPinned ? `Unpin ${suggestion.member}` : `Pin ${suggestion.member}`}
                role="button"
              >
                {isPinned 
                  ? <SolidPinIcon className="w-4 h-4 text-indigo-500" /> 
                  : <PinIcon className="w-4 h-4 text-slate-400" />
                }
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <SuggestionCard key={suggestions[activeIndex].member} suggestion={suggestions[activeIndex]} />
      </div>
    </div>
  );
};

export default SuggestionsTabs;