import React from 'react';
import { ClothingSuggestion } from '../types';

interface SuggestionCardProps {
  suggestion: ClothingSuggestion;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  if (!suggestion || !Array.isArray(suggestion.outfit)) {
    return <p className="text-red-500">Invalid suggestion data.</p>;
  }

  // Regex to find and capture text in parentheses
  const detailRegex = /\(([^)]+)\)/;

  const renderOutfitItem = (item: string) => {
    const match = item.match(detailRegex);
    if (match) {
      const mainText = item.replace(detailRegex, '').trim();
      const detailText = match[1];
      return (
        <>
          {mainText}
          <span className="ml-2 text-slate-500 dark:text-slate-400 text-xs">({detailText})</span>
        </>
      );
    }
    return item;
  };

  return (
    <section aria-label={`Clothing suggestions for ${suggestion.member}`}>
      <ul className="space-y-1.5 mb-3" role="list">
        {suggestion.outfit.map((item, index) => (
          <li key={index} className="flex items-center text-slate-700 dark:text-slate-300" role="listitem">
            <svg
              className="w-5 h-5 mr-2 text-green-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{renderOutfitItem(item)}</span>
          </li>
        ))}
      </ul>
      {suggestion.notes && (
         <p className="mt-4 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {suggestion.notes}
         </p>
      )}
    </section>
  );
};

export default SuggestionCard;