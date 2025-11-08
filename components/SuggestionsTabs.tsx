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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeTab = tabRefs.current[activeIndex];
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeIndex]);

  if (!suggestions || suggestions.length === 0) {
    return <div className="p-6 text-center text-slate-500">No suggestions available.</div>;
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
      // Dragging finger to the right reveals the previous item on the left.
      handlePrev();
    } else if (isLeftSwipe) {
      // Dragging finger to the left reveals the next item on the right.
      handleNext();
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };


  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
        {suggestions.map((suggestion, index) => {
          const memberData = family.find(f => f.name === suggestion.member);
          const isPinned = memberData?.pinned ?? false;

          return (
            <button
              key={suggestion.member}
              // FIX: The ref callback function should not return a value. 
              // An arrow function with a body in parentheses `() => (expression)` returns the expression.
              // We wrap the assignment in curly braces `{}` to make it a statement, so the function implicitly returns undefined.
              ref={el => { tabRefs.current[index] = el; }}
              onClick={() => setActiveIndex(index)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 text-center text-sm font-semibold transition-colors focus:outline-none ${
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

      {/* Content with Swipe Handlers and Arrows */}
      <div 
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        >
         <div className="p-4 sm:p-6 min-h-[150px]">
             <div key={activeIndex} className="animate-fade-in-fast">
                <SuggestionCard suggestion={suggestions[activeIndex]} />
             </div>
         </div>
         
         {/* Left Arrow */}
         {activeIndex > 0 && (
            <button 
                onClick={handlePrev} 
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 backdrop-blur-sm transition-all opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Previous suggestion"
            >
                <ChevronLeftIcon className="w-6 h-6 text-slate-700 dark:text-slate-200" />
            </button>
         )}

         {/* Right Arrow */}
         {activeIndex < suggestions.length - 1 && (
            <button 
                onClick={handleNext} 
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 backdrop-blur-sm transition-all opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Next suggestion"
            >
                <ChevronRightIcon className="w-6 h-6 text-slate-700 dark:text-slate-200" />
            </button>
         )}
      </div>
       <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-fade-in-fast {
            animation: fadeIn 0.3s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
    </div>
  );
};

export default SuggestionsTabs;