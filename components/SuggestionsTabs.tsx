import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ClothingSuggestion, FamilyMember } from '../types';
import SuggestionCard from './SuggestionCard';
import { PinIcon, SolidPinIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface SuggestionsTabsProps {
  suggestions: ClothingSuggestion[];
  family: FamilyMember[];
  onTogglePin: (memberName: string) => void;
}

const SuggestionsTabs: React.FC<SuggestionsTabsProps> = ({ suggestions, family, onTogglePin }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  if (!suggestions || suggestions.length === 0) {
    return <div className="p-6 text-center text-slate-400 italic">No suggestions available.</div>;
  }

  const handlePrev = useCallback(() => {
    setActiveIndex(prevIndex => (prevIndex === 0 ? suggestions.length - 1 : prevIndex - 1));
  }, [suggestions.length]);

  const handleNext = useCallback(() => {
    setActiveIndex(prevIndex => (prevIndex === suggestions.length - 1 ? 0 : prevIndex + 1));
  }, [suggestions.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = 0; // Reset on new touch
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    
    // Finger moves from left to right (e.g., dragging content to the right)
    const isRightSwipe = distance < -minSwipeDistance;
    // Finger moves from right to left (e.g., dragging content to the left)
    const isLeftSwipe = distance > minSwipeDistance;

    if (isRightSwipe) {
      handlePrev();
    } else if (isLeftSwipe) {
      handleNext();
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };


  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
        {suggestions.map((suggestion, index) => {
          if (!suggestion || !suggestion.member) return null;
          const memberData = family.find(f => f.name === suggestion.member);
          const isPinned = memberData?.pinned ?? false;
          const isActive = activeIndex === index;

          return (
            <button
              key={suggestion.member}
              onClick={() => setActiveIndex(index)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-5 rounded-full text-sm font-bold transition-all focus:outline-none ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 scale-105'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span className="truncate max-w-[120px]">{suggestion.member}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(suggestion.member);
                }}
                className={`cursor-pointer p-1 rounded-full transition-colors ${isActive ? 'hover:bg-white/20' : 'hover:bg-white/10'}`}
                aria-label={isPinned ? `Unpin ${suggestion.member}` : `Pin ${suggestion.member}`}
                role="button"
              >
                {isPinned 
                  ? <SolidPinIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-400'}`} /> 
                  : <PinIcon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`} />
                }
              </span>
            </button>
          );
        })}
      </div>

      {/* Content with Swipe Handlers and Arrows */}
      <div 
        className="relative mt-4 min-h-[200px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        >
         <div key={activeIndex} className="animate-fade-in">
            <SuggestionCard suggestion={suggestions[activeIndex]} />
         </div>
         
         {/* Navigation Arrows (Desktop mostly) */}
         <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-2 sm:px-0">
             {suggestions.length > 1 && (
                <>
                    <button 
                        onClick={handlePrev} 
                        className="pointer-events-auto p-3 rounded-full bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-md text-white transition-all hover:scale-110 focus:outline-none border border-white/10 opacity-0 sm:opacity-100 hover:opacity-100 -ml-4 shadow-xl"
                        aria-label="Previous suggestion"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={handleNext} 
                        className="pointer-events-auto p-3 rounded-full bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-md text-white transition-all hover:scale-110 focus:outline-none border border-white/10 opacity-0 sm:opacity-100 hover:opacity-100 -mr-4 shadow-xl"
                        aria-label="Next suggestion"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </>
             )}
         </div>
      </div>
       <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards; }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
    </div>
  );
};

export default SuggestionsTabs;