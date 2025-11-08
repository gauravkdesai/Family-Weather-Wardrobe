
import React from 'react';

interface TempUnitToggleProps {
  unit: 'C' | 'F';
  onToggle: (unit: 'C' | 'F') => void;
}

const TempUnitToggle: React.FC<TempUnitToggleProps> = ({ unit, onToggle }) => {
  return (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
      <button
        onClick={() => onToggle('C')}
        className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${
          unit === 'C'
            ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-pressed={unit === 'C'}
      >
        °C
      </button>
      <button
        onClick={() => onToggle('F')}
        className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${
          unit === 'F'
            ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-pressed={unit === 'F'}
      >
        °F
      </button>
    </div>
  );
};

export default TempUnitToggle;
