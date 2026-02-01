import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getWeatherAndClothingSuggestions, getTravelClothingSuggestions, getWeatherAndClothingSuggestionsForLocation } from './services/geminiService';
import { GeminiResponse, FamilyMember } from './types';
import SkeletonLoader from './components/SkeletonLoader';
import FamilyConfigModal from './components/FamilyConfigModal';
import { UserGroupIcon, CogIcon, CalendarIcon } from './components/icons';
import SuggestionsTabs from './components/SuggestionsTabs';
import WeatherDisplay from './components/WeatherDisplay';
import TempUnitToggle from './components/TempUnitToggle';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useGeolocation } from './hooks/useGeolocation';

const FAMILY_STORAGE_key = 'familyWeatherWardrobeFamily';
const TRAVEL_CALENDAR_STORAGE_key = 'familyWeatherWardrobeTravelCalendarConnected';
const TEMP_UNIT_STORAGE_KEY = 'familyWeatherWardrobeTempUnit';
const DEFAULT_FAMILY_STATE = [
  { name: 'Adult', pinned: true },
  { name: 'Child (5-12)', pinned: false },
  { name: 'Toddler (1-4)', pinned: false },
  { name: 'Baby (0-1)', pinned: false },
];

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl relative w-full max-w-4xl backdrop-blur-sm" role="alert">
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

const friendlyError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown error');
  const lower = raw.toLowerCase();
  if (lower.includes('function url is not configured')) {
    return 'Backend is not configured. Please set VITE_FUNCTION_URL or try again later.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('aborterror') || lower.includes('load failed')) {
    return 'Could not reach the backend. Please check your connection and try again.';
  }
  if (lower.includes('cors')) {
    return 'Request was blocked by CORS. Please try again or contact support if it persists.';
  }
  return raw;
};

interface ResultsBlockProps {
  title: string;
  data: GeminiResponse;
  onRefresh: () => void;
  isLoading: boolean;
  family: FamilyMember[];
  onTogglePin: (memberName: string) => void;
  tempUnit: 'C' | 'F';
}

const ResultsBlock: React.FC<ResultsBlockProps> = ({ title, data, onRefresh, isLoading, family, onTogglePin, tempUnit }) => {
  if (!data.weather || !data.suggestions) {
    return (
      <div className="glass-panel p-6 rounded-2xl animate-fade-in">
         <p className="text-center text-slate-400">Could not retrieve complete suggestions. Please try again.</p>
      </div>
    )
  }
  return (
    <div className="glass-panel p-6 rounded-2xl animate-fade-in transition-all">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold text-indigo-100 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all backdrop-blur-sm border border-white/5"
          aria-label="Refresh suggestions"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {data.weather && <WeatherDisplay weather={data.weather} tempUnit={tempUnit} />}
      <div className="mt-6">
        {data.suggestions && <SuggestionsTabs suggestions={data.suggestions} family={family} onTogglePin={onTogglePin} />}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeminiResponse | null>(null);
  const [dailyScheduleInput, setDailyScheduleInput] = useState<string>('');
  const [lastRequestType, setLastRequestType] = useState<'today' | 'tomorrow' | null>(null);
  const [showManualLocation, setShowManualLocation] = useState<boolean>(false);
  const [manualLocationInput, setManualLocationInput] = useState<string>('');

  const [isTravelLoading, setIsTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelData, setTravelData] = useState<GeminiResponse | null>(null);
  const [travelInput, setTravelInput] = useState<string>('');
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showLocationExplanation, setShowLocationExplanation] = useState(false);
  const pendingRequestDayRef = useRef<'today' | 'tomorrow' | null>(null);

  const [family, setFamily, resetFamily] = useLocalStorage<FamilyMember[]>(FAMILY_STORAGE_key, DEFAULT_FAMILY_STATE);
  const [tempUnit, setTempUnit, resetTempUnit] = useLocalStorage<'C' | 'F'>(TEMP_UNIT_STORAGE_KEY, 'C');
  const [isTravelCalendarConnected, setTravelCalendarConnected, resetTravelCalendar] = useLocalStorage<boolean>(TRAVEL_CALENDAR_STORAGE_key, false);

  const [manualTempUnit, setManualTempUnit] = useState<boolean>(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const travelResultsRef = useRef<HTMLDivElement>(null);

  const { coordinates, error: geoError, getCurrentPosition, resetLocationError } = useGeolocation();

  const clearLocalPreferences = useCallback(() => {
    resetFamily();
    resetTempUnit();
    resetTravelCalendar();
    setManualTempUnit(false);
  }, [resetFamily, resetTempUnit, resetTravelCalendar]);

  useEffect(() => {
     if (Array.isArray(family) && family.length > 0 && typeof family[0] === 'string') {
         const migrated = (family as any as string[]).map((name: string) => ({ 
             name, 
             pinned: ['Adult'].includes(name) 
         }));
         migrated.sort((a, b) => Number(b.pinned) - Number(a.pinned));
         setFamily(migrated);
     }
  }, [family, setFamily]);

  function inferRegionUnit(location: string): 'C' | 'F' {
    if (!location) return 'C';
    const usZip = /^\d{5}(-\d{4})?$/;
    const usNames = ["united states", "usa", "us", "puerto rico", "guam", "american samoa", "virgin islands", "northern mariana islands"];
    const locLower = location.toLowerCase();
    if (usZip.test(location.trim()) || usNames.some(n => locLower.includes(n))) return 'F';
    return 'C';
  }

  useEffect(() => {
    if (data && !isDailyLoading) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data, isDailyLoading]);
  
  useEffect(() => {
    if (travelData && !isTravelLoading) {
      travelResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [travelData, isTravelLoading]);

  const handleTogglePin = useCallback((memberName: string) => {
    setFamily(currentFamily => {
        const updatedFamily = currentFamily.map(member =>
            member.name === memberName ? { ...member, pinned: !member.pinned } : member
        );
        updatedFamily.sort((a, b) => Number(b.pinned) - Number(a.pinned));
        return updatedFamily;
    });
  }, [setFamily]);

  const fetchSuggestions = useCallback(async (day: 'today' | 'tomorrow', lat?: number, lon?: number, locationText?: string) => {
      const familyNames = family.map(f => f.name);
      try {
        let result;
        if (lat !== undefined && lon !== undefined) {
             result = await getWeatherAndClothingSuggestions(lat, lon, familyNames, day, dailyScheduleInput);
        } else if (locationText) {
             result = await getWeatherAndClothingSuggestionsForLocation(locationText, familyNames, day, dailyScheduleInput);
        } else {
            throw new Error("No location provided");
        }

        if (result?.suggestions) {
            result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
        }
        setData(result);
        if (result?.weather?.location && !manualTempUnit) {
            setTempUnit(inferRegionUnit(result.weather.location));
        }
      } catch (err) {
          setError(friendlyError(err));
      } finally {
          setIsDailyLoading(false);
      }
  }, [family, dailyScheduleInput, manualTempUnit, setTempUnit]);

  useEffect(() => {
      if (coordinates && pendingRequestDayRef.current) {
          const day = pendingRequestDayRef.current;
          pendingRequestDayRef.current = null;
          setShowManualLocation(false);
          setManualLocationInput('');
          fetchSuggestions(day, coordinates.latitude, coordinates.longitude);
      }
      if (geoError && pendingRequestDayRef.current) {
           pendingRequestDayRef.current = null;
           setError(geoError);
           setShowManualLocation(true);
           setIsDailyLoading(false);
      }
  }, [coordinates, geoError, fetchSuggestions]);


  const handleGetSuggestions = useCallback((day: 'today' | 'tomorrow', opts?: { skipPermissionPrompt?: boolean }) => {
    setError(null);
    setData(null);
    setLastRequestType(day);
    resetLocationError();
    setIsDailyLoading(true);

    if (showManualLocation && manualLocationInput.trim()) {
        fetchSuggestions(day, undefined, undefined, manualLocationInput);
        return;
    }

    if (showManualLocation && !manualLocationInput.trim()) {
        setError("Please enter a location to get suggestions.");
        setIsDailyLoading(false);
        return;
    }
    
    const skipPrompt = opts?.skipPermissionPrompt === true;
    if (!skipPrompt && !showManualLocation) {
      pendingRequestDayRef.current = day;
      setShowLocationExplanation(true);
      setIsDailyLoading(false);
      return;
    }
    
    if (skipPrompt) {
         pendingRequestDayRef.current = day;
         setIsDailyLoading(true);
         getCurrentPosition();
    }
  }, [showManualLocation, manualLocationInput, fetchSuggestions, getCurrentPosition, resetLocationError]);


  const handleGetTravelSuggestions = useCallback(async () => {
    if (!travelInput.trim()) {
        setTravelError("Please enter a destination and duration.");
        return;
    }
    
    setTravelError(null);
    setTravelData(null);
    setIsTravelLoading(true);
    
    const familyNames = family.map(f => f.name);
    
    try {
      const result = await getTravelClothingSuggestions(travelInput, familyNames);
      if (result?.suggestions) {
        result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
      }
      setTravelData(result);
      if (result?.weather?.location && !manualTempUnit) {
        setTempUnit(inferRegionUnit(result.weather.location));
      }
    } catch (err) {
      setTravelError(friendlyError(err));
    } finally {
      setIsTravelLoading(false);
    }
  }, [travelInput, family, manualTempUnit, setTempUnit]);

  const generateResultsTitle = (day: 'today' | 'tomorrow' | null): string => {
    if (!day) return '';
    const date = new Date();
    if (day === 'tomorrow') date.setDate(date.getDate() + 1);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString(undefined, options);
    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
    return `${dayLabel}'s Outfit Suggestions (${dateString})`;
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {showLocationExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="glass-panel bg-slate-900/90 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">Allow location access?</h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              We use your device's location to fetch local weather for accurate outfit suggestions. Your location data is not stored. 
              <br/><br/>
              Prefer not to share? You can enter a city manually.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLocationExplanation(false);
                  setShowManualLocation(true);
                  pendingRequestDayRef.current = null;
                }}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 font-medium"
              >
                Enter manually
              </button>
              <button
                onClick={() => {
                  const pending = pendingRequestDayRef.current ?? 'today';
                  setShowLocationExplanation(false);
                  handleGetSuggestions(pending, { skipPermissionPrompt: true });
                }}
                className="px-5 py-2.5 rounded-xl btn-primary font-bold tracking-wide"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="container mx-auto px-4 py-12 flex-grow flex flex-col items-center">
        <header className="w-full max-w-4xl text-center mb-12 animate-slide-up">
            <div className="flex justify-center items-center gap-4 mb-4 flex-wrap">
                <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 drop-shadow-sm">
                  Weather Wardrobe
                </h1>
                <div className="glass-panel rounded-full px-1 py-1">
                  <TempUnitToggle unit={tempUnit} onToggle={unit => {
                    setTempUnit(unit);
                    setManualTempUnit(true);
                  }} />
                </div>
            </div>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
              AI-powered outfit intelligence for your family's daily adventures and travels.
            </p>
        </header>

        <div className="w-full max-w-4xl space-y-8">
          {/* --- Main Action Buttons --- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => handleGetSuggestions('today')}
              disabled={isDailyLoading}
              className="btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-50 disabled:scale-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserGroupIcon className="w-6 h-6" />
              {isDailyLoading && lastRequestType === 'today' ? 'Loading...' : 'For Today'}
            </button>
            <button
              onClick={() => handleGetSuggestions('tomorrow')}
              disabled={isDailyLoading}
              className="glass-btn bg-white/5 hover:bg-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg text-indigo-100 disabled:opacity-50 disabled:scale-100 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
            >
              <CalendarIcon className="w-6 h-6 text-indigo-300" />
              {isDailyLoading && lastRequestType === 'tomorrow' ? 'Loading...' : 'For Tomorrow'}
            </button>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="glass-btn bg-white/5 hover:bg-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-lg text-slate-300 disabled:opacity-50 disabled:scale-100 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
            >
              <CogIcon className="w-6 h-6 text-slate-400" />
              Configure
            </button>
          </div>
          
          {/* --- Optional Inputs Card --- */}
          <div className="glass-panel p-6 rounded-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Location Field - Only shows if active or toggleable */}
                 <div className={`${!showManualLocation ? 'hidden md:block opacity-50 pointer-events-none' : ''}`}>
                    <label htmlFor="manual-location" className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                        Location
                    </label>
                    {showManualLocation ? (
                        <input
                            id="manual-location"
                            type="text"
                            value={manualLocationInput}
                            onChange={(e) => setManualLocationInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !isDailyLoading) handleGetSuggestions('today'); }}
                            placeholder="e.g., London, UK"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                            autoFocus
                        />
                    ) : (
                         <div className="px-4 py-3 border border-dashed border-slate-700 rounded-xl text-slate-500 italic text-sm">
                            Using GPS (Click "For Today" to start)
                         </div>
                    )}
                 </div>
                
                <div>
                    <label htmlFor="daily-schedule" className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                        Daily Schedule <span className="text-slate-500 font-normal normal-case ml-1">(Optional)</span>
                    </label>
                    <input
                        id="daily-schedule"
                        type="text"
                        value={dailyScheduleInput}
                        onChange={(e) => setDailyScheduleInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isDailyLoading) handleGetSuggestions('today'); }}
                        placeholder="e.g., morning run, 2pm meeting..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>
          </div>
          
          {/* --- Today's Suggestions --- */}
          {isDailyLoading && <SkeletonLoader />}
          {error && <ErrorMessage message={error} />}
          {data && lastRequestType && (
            <div ref={resultsRef} className="animate-fade-in">
              <ResultsBlock title={generateResultsTitle(lastRequestType)} data={data} onRefresh={() => lastRequestType && handleGetSuggestions(lastRequestType)} isLoading={isDailyLoading} family={family} onTogglePin={handleTogglePin} tempUnit={tempUnit}/>
            </div>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-10"></div>
          
          {/* --- Travel Packing List --- */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-white flex items-center justify-center gap-3">
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Trip Packing List</span>
            </h2>
            
             {!isTravelCalendarConnected ? (
                 <div className="text-center">
                    <button onClick={() => setTravelCalendarConnected(true)} className="inline-flex items-center gap-2 text-indigo-300 hover:text-white transition-colors hover:underline underline-offset-4" title="Generate a packing list for an upcoming trip">
                        <CalendarIcon className="w-5 h-5" />
                        Get a packing list for a trip
                    </button>
                 </div>
             ) : (
                <div className="glass-panel p-2 rounded-2xl flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={travelInput}
                        onChange={(e) => setTravelInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGetTravelSuggestions(); }}
                        placeholder="e.g., 'Paris for 5 days'..."
                        className="flex-grow bg-slate-900/50 border-none rounded-xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-600"
                      />
                      <button
                        onClick={handleGetTravelSuggestions}
                        disabled={isTravelLoading}
                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isTravelLoading ? 'Generating...' : 'Generate List'}
                      </button>
                </div>
             )}
          </section>
          
          {/* --- Travel Suggestions --- */}
          {isTravelLoading && <SkeletonLoader />}
          {travelError && <ErrorMessage message={travelError} />}
          {travelData && (
            <div ref={travelResultsRef} className="mt-6 animate-fade-in">
                <ResultsBlock
                    title={travelData.weather?.dateRange ? `${travelData.weather.location} (${travelData.weather.dateRange})` : travelData.weather?.location || 'Travel Packing List'}
                    data={travelData}
                    onRefresh={handleGetTravelSuggestions}
                    isLoading={isTravelLoading}
                    family={family}
                    onTogglePin={handleTogglePin}
                    tempUnit={tempUnit}
                />
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-8 text-slate-500 text-xs">
        <p className="max-w-2xl mx-auto px-4">
          Disclaimer: AI-generated advice. Verify local weather conditions. <br/> Built with 💜 and Gemini.
        </p>
      </footer>
      {isConfigOpen && <FamilyConfigModal family={family} setFamily={setFamily} onClose={() => setIsConfigOpen(false)} clearLocalPreferences={clearLocalPreferences} />}
    </div>
  );
};

export default App;