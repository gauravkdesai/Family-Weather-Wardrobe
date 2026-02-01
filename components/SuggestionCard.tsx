import React from 'react';
import { ClothingSuggestion } from '../types';

interface SuggestionCardProps {
  suggestion: ClothingSuggestion;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  if (!suggestion || !Array.isArray(suggestion.outfit)) {
    return <p className="text-red-400 bg-red-400/10 p-4 rounded-lg">Invalid suggestion data.</p>;
  }

  const detailRegex = /\(([^)]+)\)/;

  const renderOutfitItem = (item: string) => {
    const match = item.match(detailRegex);
    if (match) {
      const mainText = item.replace(detailRegex, '').trim();
      const detailText = match[1];
      return (
        <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="font-medium text-slate-100">{mainText}</span>
          <span className="text-indigo-300 text-xs tracking-wide uppercase font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{detailText}</span>
        </span>
      );
    }
    return <span className="font-medium text-slate-100">{item}</span>;
  };

  return (
    <section aria-label={`Clothing suggestions for ${suggestion.member}`} className="h-full flex flex-col">
      <ul className="space-y-3 mb-6 flex-grow" role="list">
        {suggestion.outfit.map((item, index) => (
          <li 
            key={index} 
            className="flex items-start p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors" 
            role="listitem"
          >
            <div className="mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <span className="leading-relaxed">{renderOutfitItem(item)}</span>
          </li>
        ))}
      </ul>
      {suggestion.notes && (
         <div className="mt-auto p-4 rounded-xl bg-slate-900/60 border border-indigo-500/20">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Why this outfit?</h4>
            <p className="text-sm text-slate-300 leading-relaxed font-light" aria-live="polite">
                {suggestion.notes}
            </p>
         </div>
      )}
    </section>
  );
};

export default SuggestionCard;