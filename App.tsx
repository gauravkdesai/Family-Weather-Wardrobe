import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getWeatherAndClothingSuggestions, getTravelClothingSuggestions, getWeatherAndClothingSuggestionsForLocation } from './services/geminiService';
import { GeminiResponse, FamilyMember, WeatherData } from './types';
import SkeletonLoader from './components/SkeletonLoader';
import FamilyConfigModal from './components/FamilyConfigModal';
import { UserGroupIcon, CogIcon, CalendarIcon } from './components/icons';
import SuggestionsTabs from './components/SuggestionsTabs';
import WeatherDisplay from './components/WeatherDisplay';
import TempUnitToggle from './components/TempUnitToggle';
import LocationSearchInput from './components/LocationSearchInput';
import WelcomeCard from './components/WelcomeCard';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useGeolocation } from './hooks/useGeolocation';

const FAMILY_STORAGE_key = 'familyWeatherWardrobeFamily';
const TRAVEL_CALENDAR_STORAGE_key = 'familyWeatherWardrobeTravelCalendarConnected';
const TEMP_UNIT_STORAGE_KEY = 'familyWeatherWardrobeTempUnit';
const DAILY_CACHE_KEY = 'fww_last_daily_cache';
const TRAVEL_CACHE_KEY = 'fww_last_travel_cache';

const DEFAULT_FAMILY_STATE = [
  { name: 'Adult', pinned: true },
  { name: 'Child (5-12)', pinned: false },
  { name: 'Toddler (1-4)', pinned: false },
  { name: 'Baby (0-1)', pinned: false },
];

interface CachedForecast {
  data: GeminiResponse;
  savedAt: number;
  label?: string;
}

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
  if (
    lower.includes('vertexai') ||
    lower.includes('project') ||
    lower.includes('publisher') ||
    lower.includes('not found') ||
    lower.includes('status:') ||
    lower.includes('clienterror') ||
    lower.includes('status 500') ||
    lower.includes('status 404') ||
    lower.includes('gcloud')
  ) {
    return 'Unable to generate outfit suggestions at this time. Please try again shortly.';
  }
  return raw;
};

// Calculate weather-adaptive ambient glow based on weather condition
const getAmbientAtmosphere = (dailyWeather?: WeatherData | null, travelWeather?: WeatherData | null): string => {
  const w = dailyWeather || travelWeather;
  if (!w) return 'from-slate-950 via-slate-900 to-slate-950';
  const cond = (w.dayParts?.[0]?.condition || '').toLowerCase();
  const isNight = w.dayParts?.[0]?.isNight;

  if (cond.includes('snow') || cond.includes('sleet') || cond.includes('ice') || cond.includes('grain')) {
    return 'from-sky-950/40 via-slate-900 to-slate-950';
  }
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower') || cond.includes('thunder')) {
    return 'from-cyan-950/35 via-slate-900 to-slate-950';
  }
  if (cond.includes('sun') || cond.includes('clear')) {
    return isNight 
      ? 'from-indigo-950/40 via-slate-900 to-slate-950'
      : 'from-amber-950/30 via-slate-900 to-indigo-950/30';
  }
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('fog')) {
    return 'from-slate-900 via-slate-800/80 to-slate-950';
  }
  return 'from-slate-950 via-slate-900 to-slate-950';
};

interface ResultsBlockProps {
  title: string;
  data: GeminiResponse;
  onRefresh: () => void;
  isLoading: boolean;
  family: FamilyMember[];
  onTogglePin: (memberName: string) => void;
  tempUnit: 'C' | 'F';
  isOffline?: boolean;
  cachedAt?: string;
}

const ResultsBlock: React.FC<ResultsBlockProps> = ({
  title,
  data,
  onRefresh,
  isLoading,
  family,
  onTogglePin,
  tempUnit,
  isOffline,
  cachedAt,
}) => {
  const [copied, setCopied] = useState(false);

  if (!data.weather || !data.suggestions) {
    return (
      <div className="glass-panel p-6 rounded-2xl animate-fade-in">
         <p className="text-center text-slate-400">Could not retrieve complete suggestions. Please try again.</p>
      </div>
    );
  }

  const handleShare = async () => {
    if (!data.weather || !data.suggestions) return;
    const tempConvert = (c: number) => tempUnit === 'F' ? Math.round(c * 9 / 5 + 32) : c;
    
    const textLines = [
      `🌤️ ${title}`,
      `📍 Location: ${data.weather.location}`,
      `🌡️ High: ${tempConvert(data.weather.highTemp)}°${tempUnit} / Low: ${tempConvert(data.weather.lowTemp)}°${tempUnit}`,
      '',
      'Family Outfit Suggestions:',
      ...data.suggestions.flatMap(s => [
        `\n• ${s.member}:`,
        ...s.outfit.map(item => `  - ${item}`),
        s.notes ? `  (Why: ${s.notes})` : ''
      ].filter(Boolean)),
      '',
      'Shared from Family Weather Wardrobe'
    ];
    const fullText = textLines.join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title,
          text: fullText,
        });
        return;
      }
    } catch {
      // User cancelled share dialog or platform limitation: fall through to clipboard
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl animate-fade-in transition-all">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          {isOffline && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Offline Cache {cachedAt ? `• ${cachedAt}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 flex items-center gap-1.5"
            aria-label="Share or copy suggestions to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
                <span>Share</span>
              </>
            )}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-semibold text-indigo-100 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all backdrop-blur-sm border border-white/5"
            aria-label="Refresh suggestions"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
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
  const [isDailyOffline, setIsDailyOffline] = useState(false);
  const [dailyCachedTime, setDailyCachedTime] = useState<string | null>(null);
  const [dailyScheduleInput, setDailyScheduleInput] = useState<string>('');
  const [lastRequestType, setLastRequestType] = useState<'today' | 'tomorrow' | null>(null);
  const [showManualLocation, setShowManualLocation] = useState<boolean>(false);
  const [manualLocationInput, setManualLocationInput] = useState<string>('');

  const [isTravelLoading, setIsTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelData, setTravelData] = useState<GeminiResponse | null>(null);
  const [isTravelOffline, setIsTravelOffline] = useState(false);
  const [travelCachedTime, setTravelCachedTime] = useState<string | null>(null);
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

  // Try hydrating initial state from offline cache if available
  useEffect(() => {
    try {
      const cachedDaily = localStorage.getItem(DAILY_CACHE_KEY);
      if (cachedDaily && !data) {
        const parsed: CachedForecast = JSON.parse(cachedDaily);
        if (parsed.data?.weather) {
          setData(parsed.data);
          setLastRequestType('today');
          setIsDailyOffline(true);
          setDailyCachedTime(new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
      const cachedTravel = localStorage.getItem(TRAVEL_CACHE_KEY);
      if (cachedTravel && !travelData) {
        const parsed: CachedForecast = JSON.parse(cachedTravel);
        if (parsed.data?.weather) {
          setTravelData(parsed.data);
          setTravelCalendarConnected(true);
          setIsTravelOffline(true);
          setTravelCachedTime(new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch {
      // Ignore cache parsing errors
    }
  }, []);

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
        let result: GeminiResponse;
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
        setIsDailyOffline(false);
        setDailyCachedTime(null);

        // Cache successful response in localStorage
        try {
          const cachePayload: CachedForecast = {
            data: result,
            savedAt: Date.now(),
            label: locationText || (lat !== undefined ? `${lat.toFixed(2)}, ${lon?.toFixed(2)}` : '')
          };
          localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(cachePayload));
        } catch {}

        if (result?.weather?.location && !manualTempUnit) {
            setTempUnit(inferRegionUnit(result.weather.location));
        }
      } catch (err) {
          // If network failed, check if we have cached daily data to keep the app useful
          try {
            const cachedRaw = localStorage.getItem(DAILY_CACHE_KEY);
            if (cachedRaw) {
              const parsed: CachedForecast = JSON.parse(cachedRaw);
              if (parsed.data?.weather) {
                setData(parsed.data);
                setIsDailyOffline(true);
                setDailyCachedTime(new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                setError(null);
                return;
              }
            }
          } catch {}
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
    setIsTravelLoading(true);
    
    const familyNames = family.map(f => f.name);
    
    try {
      const result = await getTravelClothingSuggestions(travelInput, familyNames);
      if (result?.suggestions) {
        result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
      }
      setTravelData(result);
      setIsTravelOffline(false);
      setTravelCachedTime(null);

      try {
        const cachePayload: CachedForecast = {
          data: result,
          savedAt: Date.now(),
          label: travelInput
        };
        localStorage.setItem(TRAVEL_CACHE_KEY, JSON.stringify(cachePayload));
      } catch {}

      if (result?.weather?.location && !manualTempUnit) {
        setTempUnit(inferRegionUnit(result.weather.location));
      }
    } catch (err) {
      // Check offline travel cache
      try {
        const cachedRaw = localStorage.getItem(TRAVEL_CACHE_KEY);
        if (cachedRaw) {
          const parsed: CachedForecast = JSON.parse(cachedRaw);
          if (parsed.data?.weather) {
            setTravelData(parsed.data);
            setIsTravelOffline(true);
            setTravelCachedTime(new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setTravelError(null);
            return;
          }
        }
      } catch {}
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

  const ambientAtmosphere = getAmbientAtmosphere(data?.weather, travelData?.weather);

  return (
    <div className={`min-h-screen text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white bg-gradient-to-br ${ambientAtmosphere} transition-colors duration-1000`}>
      {showLocationExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="glass-panel bg-slate-900/90 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">Allow location access?</h3>
            <p className="text-slate-300 mb-6 leading-relaxed text-sm">
              We use your device's location to fetch local weather for accurate outfit suggestions. Your location data is not stored. 
              <br/><br/>
              Prefer not to share? You can enter any city manually.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLocationExplanation(false);
                  setShowManualLocation(true);
                  pendingRequestDayRef.current = null;
                }}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 font-medium text-sm"
              >
                Enter manually
              </button>
              <button
                onClick={() => {
                  const pending = pendingRequestDayRef.current ?? 'today';
                  setShowLocationExplanation(false);
                  handleGetSuggestions(pending, { skipPermissionPrompt: true });
                }}
                className="px-5 py-2.5 rounded-xl btn-primary font-bold tracking-wide text-sm"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-12 flex-grow flex flex-col items-center">
        <header className="w-full max-w-4xl text-center mb-10 animate-slide-up">
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
              {isDailyLoading && lastRequestType === 'today' ? (
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              ) : (
                 <UserGroupIcon className="w-6 h-6" />
              )}
              For Today
            </button>
            <button
              onClick={() => handleGetSuggestions('tomorrow')}
              disabled={isDailyLoading}
              className="glass-btn bg-white/5 hover:bg-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg text-indigo-100 disabled:opacity-50 disabled:scale-100 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
            >
              {isDailyLoading && lastRequestType === 'tomorrow' ? (
                 <svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              ) : (
                 <CalendarIcon className="w-6 h-6 text-indigo-300" />
              )}
              For Tomorrow
            </button>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="glass-btn bg-white/5 hover:bg-white/10 py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-lg text-slate-300 disabled:opacity-50 disabled:scale-100 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
            >
              <CogIcon className="w-6 h-6 text-slate-400" />
              Configure ({family.length})
            </button>
          </div>
          
          {/* --- Optional Inputs Card --- */}
          <div className="glass-panel p-6 rounded-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Location Field with Autocomplete */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="manual-location" className="block text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Location
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !showManualLocation;
                          setShowManualLocation(nextState);
                          if (!nextState) setManualLocationInput('');
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-200 underline transition-colors"
                      >
                        {showManualLocation ? 'Use GPS instead' : 'Enter city manually'}
                      </button>
                    </div>

                    {showManualLocation ? (
                      <LocationSearchInput
                        id="manual-location"
                        value={manualLocationInput}
                        onChange={setManualLocationInput}
                        onSubmit={() => {
                          if (!isDailyLoading) handleGetSuggestions('today');
                        }}
                        placeholder="Search city (e.g., Zurich, London)..."
                        autoFocus
                      />
                    ) : (
                      <div className="px-4 py-3 border border-dashed border-slate-700/80 rounded-xl text-slate-400 text-sm flex items-center justify-between">
                        <span>Using GPS (Click "For Today")</span>
                        <button
                          type="button"
                          onClick={() => setShowManualLocation(true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Change
                        </button>
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
                        placeholder="e.g., morning run, 2pm playground, dinner out..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>
          </div>

          {/* --- Welcome / Empty State Card --- */}
          {!data && !travelData && !isDailyLoading && !error && (
            <WelcomeCard
              onGetToday={() => handleGetSuggestions('today')}
              onEnterManualLocation={() => setShowManualLocation(true)}
              onOpenTravel={() => setTravelCalendarConnected(true)}
            />
          )}
          
          {/* --- Today's Suggestions --- */}
          {isDailyLoading && <SkeletonLoader />}
          {error && <ErrorMessage message={error} />}
          {data && lastRequestType && (
            <div ref={resultsRef} className="animate-fade-in">
              <ResultsBlock
                title={generateResultsTitle(lastRequestType)}
                data={data}
                onRefresh={() => lastRequestType && handleGetSuggestions(lastRequestType)}
                isLoading={isDailyLoading}
                family={family}
                onTogglePin={handleTogglePin}
                tempUnit={tempUnit}
                isOffline={isDailyOffline}
                cachedAt={dailyCachedTime || undefined}
              />
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
                    <button
                      onClick={() => setTravelCalendarConnected(true)}
                      className="inline-flex items-center gap-2 text-indigo-300 hover:text-white transition-colors hover:underline underline-offset-4"
                      title="Generate a packing list for an upcoming trip"
                    >
                        <CalendarIcon className="w-5 h-5" />
                        Plan and pack for an upcoming trip
                    </button>
                 </div>
             ) : (
                <div className="glass-panel p-2 rounded-2xl flex flex-col sm:flex-row gap-2">
                  <div className="flex-grow">
                    <LocationSearchInput
                      id="travel-destination-search"
                      value={travelInput}
                      onChange={setTravelInput}
                      onSubmit={handleGetTravelSuggestions}
                      placeholder="e.g., 'Paris for 5 days', 'Tokyo in November'..."
                    />
                  </div>
                  <button
                    onClick={handleGetTravelSuggestions}
                    disabled={isTravelLoading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                    isOffline={isTravelOffline}
                    cachedAt={travelCachedTime || undefined}
                />
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-8 text-slate-500 text-xs">
        <p className="max-w-2xl mx-auto px-4">
          Disclaimer: The clothing and weather information provided is AI-generated. Please verify local weather conditions independently and dress appropriately. You are responsible for your own safety and comfort.
        </p>
      </footer>
      {isConfigOpen && <FamilyConfigModal family={family} setFamily={setFamily} onClose={() => setIsConfigOpen(false)} clearLocalPreferences={clearLocalPreferences} />}
    </div>
  );
};

export default App;