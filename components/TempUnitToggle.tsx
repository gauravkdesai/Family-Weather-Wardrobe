
import React from 'react';

interface TempUnitToggleProps {
  unit: 'C' | 'F';
  onToggle: (unit: 'C' | 'F') => void;
}

const TempUnitToggle: React.FC<TempUnitToggleProps> = ({ unit, onToggle }) => {
  return (
    <nav aria-label="Temperature unit selector">
      <div className="flex items-center p-1" role="group" aria-label="Temperature unit toggle">
        <button
          onClick={() => onToggle('C')}
          className={`px-3 py-1 text-sm font-bold rounded-full transition-all ${
            unit === 'C'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          aria-pressed={unit === 'C'}
          aria-label="Celsius"
        >
          °C
        </button>
        <button
          onClick={() => onToggle('F')}
          className={`px-3 py-1 text-sm font-bold rounded-full transition-all ${
            unit === 'F'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          aria-pressed={unit === 'F'}
          aria-label="Fahrenheit"
        >
          °F
        </button>
      </div>
    </nav>
  );
};

export default TempUnitToggle;
