import React from 'react';
import { ClothingSuggestion } from '../types';

interface SuggestionCardProps {
  suggestion: ClothingSuggestion;
}

interface CategoryBadge {
  label: string;
  emoji: string;
  className: string;
}

const detectCategory = (text: string): CategoryBadge | null => {
  const lower = text.toLowerCase();
  if (/jacket|coat|hoodie|sweater|cardigan|fleece|windbreaker|parka|raincoat|blazer|anorak/.test(lower)) {
    return { label: 'Outerwear', emoji: '🧥', className: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
  }
  if (/shoe|sneaker|boot|sandals|footwear|loafers|cleats|slippers|socks/.test(lower)) {
    return { label: 'Footwear', emoji: '👟', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
  }
  if (/pants|jeans|shorts|trousers|skirt|leggings|sweatpants|joggers|slacks/.test(lower)) {
    return { label: 'Bottom', emoji: '👖', className: 'bg-blue-500/10 text-blue-300 border-blue-500/20' };
  }
  if (/t-shirt|shirt|polo|blouse|tank|top|undershirt|thermal/.test(lower)) {
    return { label: 'Top', emoji: '👕', className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
  }
  if (/hat|cap|beanie|umbrella|sunglasses|scarf|gloves|mittens|belt|sun hat|shades/.test(lower)) {
    return { label: 'Accessory', emoji: '🧢', className: 'bg-purple-500/10 text-purple-300 border-purple-500/20' };
  }
  return null;
};

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  if (!suggestion || !Array.isArray(suggestion.outfit)) {
    return <p className="text-red-400 bg-red-400/10 p-4 rounded-lg">Invalid suggestion data.</p>;
  }

  const detailRegex = /\(([^)]+)\)/;

  const renderOutfitItem = (item: string) => {
    const match = item.match(detailRegex);
    const mainText = match ? item.replace(detailRegex, '').trim() : item;
    const detailText = match ? match[1] : null;
    const category = detectCategory(item);

    return (
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-2 flex-grow">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-100">{mainText}</span>
          {category && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${category.className}`}
              title={category.label}
            >
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </span>
          )}
        </div>
        {detailText && (
          <span className="text-indigo-300 text-xs tracking-wide uppercase font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 w-fit">
            {detailText}
          </span>
        )}
      </div>
    );
  };

  return (
    <section aria-label={`Clothing suggestions for ${suggestion.member}`} className="h-full flex flex-col">
      <ul className="space-y-3 mb-6 flex-grow" role="list">
        {suggestion.outfit.map((item, index) => (
          <li 
            key={index} 
            className="flex items-start p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.01]" 
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
            {renderOutfitItem(item)}
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