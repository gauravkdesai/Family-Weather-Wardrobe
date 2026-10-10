import React from 'react';
import { UserGroupIcon, CalendarIcon, LocationMarkerIcon } from './icons';

interface WelcomeCardProps {
  onGetToday: () => void;
  onEnterManualLocation: () => void;
  onOpenTravel: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onGetToday,
  onEnterManualLocation,
  onOpenTravel,
}) => {
  return (
    <div className="w-full glass-panel p-8 rounded-3xl animate-fade-in border border-white/10 text-center relative overflow-hidden shadow-2xl">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl mx-auto space-y-4 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
          <span>✨</span> Smart Weather Intelligence
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Dress Your Family Right, Every Day
        </h3>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-light">
          Get real-time hourly forecasts and tailored outfit recommendations for adults, kids, toddlers, and babies—whether heading to school or boarding a flight.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
          <button
            onClick={onGetToday}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-3 group-hover:bg-indigo-500/30 transition-colors">
              <UserGroupIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Today's Outfits</div>
              <div className="text-xs text-slate-400 mt-1">Automatic GPS weather & layering advice</div>
            </div>
          </button>

          <button
            onClick={onEnterManualLocation}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-3 group-hover:bg-cyan-500/30 transition-colors">
              <LocationMarkerIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Search Any City</div>
              <div className="text-xs text-slate-400 mt-1">Forecast for London, Paris, Zurich...</div>
            </div>
          </button>

          <button
            onClick={onOpenTravel}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-3 group-hover:bg-emerald-500/30 transition-colors">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Trip Packing List</div>
              <div className="text-xs text-slate-400 mt-1">Multi-day packing for family travel</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
