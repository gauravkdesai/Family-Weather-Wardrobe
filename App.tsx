



import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getWeatherAndClothingSuggestions, getTravelClothingSuggestions, getWeatherAndClothingSuggestionsForLocation } from './services/geminiService';
import { GeminiResponse, WeatherData, FamilyMember } from './types';
import Spinner from './components/Spinner';
import FamilyConfigModal from './components/FamilyConfigModal';
import { UserGroupIcon, CogIcon, CalendarIcon, LocationMarkerIcon, SunnyIcon, CloudyIcon, RainIcon, SnowIcon, WindyIcon, PartlyCloudyIcon } from './components/icons';
import SuggestionsTabs from './components/SuggestionsTabs';
// FIX: Import the WeatherDisplay component.
import WeatherDisplay from './components/WeatherDisplay';
import TempUnitToggle from './components/TempUnitToggle';

const FAMILY_STORAGE_key = 'familyWeatherWardrobeFamily';
const TRAVEL_CALENDAR_STORAGE_key = 'familyWeatherWardrobeTravelCalendarConnected';
const TEMP_UNIT_STORAGE_KEY = 'familyWeatherWardrobeTempUnit';

// FIX: Define the missing ErrorMessage component.
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative w-full max-w-4xl" role="alert">
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

// FIX: Define the missing ResultsBlock component.
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
      <div className="bg-white dark:bg-slate-800/50 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg animate-fade-in-fast">
         <p className="text-center text-slate-500">Could not retrieve complete suggestions. Please try again.</p>
      </div>
    )
  }
  return (
    <div className="bg-white dark:bg-slate-800/50 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg animate-fade-in-fast">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-full hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh suggestions"
        >
          Refresh
        </button>
      </div>
      {data.weather && <WeatherDisplay weather={data.weather} tempUnit={tempUnit} />}
      {data.suggestions && <SuggestionsTabs suggestions={data.suggestions} family={family} onTogglePin={onTogglePin} />}
    </div>
  );
};


const App: React.FC = () => {
  // State for local weather suggestions
  const [dailyLoadingMessage, setDailyLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeminiResponse | null>(null);
  const [dailyScheduleInput, setDailyScheduleInput] = useState<string>('');
  const [lastRequestType, setLastRequestType] = useState<'today' | 'tomorrow' | null>(null);
  const [showManualLocation, setShowManualLocation] = useState<boolean>(false);
  const [manualLocationInput, setManualLocationInput] = useState<string>('');

  // State for travel suggestions
  const [travelLoadingMessage, setTravelLoadingMessage] = useState<string | null>(null);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelData, setTravelData] = useState<GeminiResponse | null>(null);
  const [travelInput, setTravelInput] = useState<string>('');
  
  // Shared state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showLocationExplanation, setShowLocationExplanation] = useState(false);
  const pendingRequestDayRef = useRef<'today' | 'tomorrow' | null>(null);
  const [family, setFamily] = useState<FamilyMember[]>(() => {
    try {
      const storedFamily = localStorage.getItem(FAMILY_STORAGE_key);
      if (storedFamily) {
          let familyData: FamilyMember[];
          const parsed = JSON.parse(storedFamily);
          // Gracefully migrate old string[] format to new FamilyMember[] format
          if (Array.isArray(parsed) && (parsed.length === 0 || typeof parsed[0] === 'string')) {
              familyData = parsed.map((name: string) => ({ 
                  name, 
                  // Pin the new default member for a smooth transition for existing users
                  pinned: ['Adult'].includes(name) 
              }));
          } else {
              familyData = parsed;
          }
          // Sort on load to ensure pinned items are always first
          familyData.sort((a, b) => Number(b.pinned) - Number(a.pinned));
          return familyData;
      }
    } catch (e) {
      console.error("Failed to parse family data from localStorage", e);
    }
    // New default state, pre-sorted and gender-neutral
    return [
      { name: 'Adult', pinned: true },
      { name: 'Child (5-12)', pinned: false },
      { name: 'Toddler (1-4)', pinned: false },
      { name: 'Baby (0-1)', pinned: false },
    ];
  });
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(() => {
    const storedUnit = localStorage.getItem(TEMP_UNIT_STORAGE_KEY);
    return (storedUnit === 'C' || storedUnit === 'F') ? storedUnit : 'C';
  });
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const travelResultsRef = useRef<HTMLDivElement>(null);
  const loadingIntervalRef = useRef<number | null>(null);

  const [isTravelCalendarConnected, setTravelCalendarConnected] = useState<boolean>(() => {
     return localStorage.getItem(TRAVEL_CALENDAR_STORAGE_key) === 'true';
  });


  useEffect(() => {
    localStorage.setItem(FAMILY_STORAGE_key, JSON.stringify(family));
  }, [family]);

  useEffect(() => {
    localStorage.setItem(TRAVEL_CALENDAR_STORAGE_key, String(isTravelCalendarConnected));
  }, [isTravelCalendarConnected]);

  useEffect(() => {
    localStorage.setItem(TEMP_UNIT_STORAGE_KEY, tempUnit);
  }, [tempUnit]);

  useEffect(() => {
    if (data && !dailyLoadingMessage) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data, dailyLoadingMessage]);
  
  useEffect(() => {
    if (travelData && !travelLoadingMessage) {
      travelResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [travelData, travelLoadingMessage]);

  const handleTogglePin = useCallback((memberName: string) => {
    setFamily(currentFamily => {
        const updatedFamily = currentFamily.map(member =>
            member.name === memberName ? { ...member, pinned: !member.pinned } : member
        );
        // Re-sort by pinned status
        updatedFamily.sort((a, b) => Number(b.pinned) - Number(a.pinned));
        return updatedFamily;
    });
  }, []);

  const handleGetSuggestions = useCallback((day: 'today' | 'tomorrow', opts?: { skipPermissionPrompt?: boolean }) => {
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    
    setError(null);
    setData(null);
    setLastRequestType(day);

    const familyNames = family.map(f => f.name);

    const messages = [
        `Fetching ${day}'s forecast...`,
        "Analyzing local weather patterns...",
        "Considering your daily schedule...",
        ...familyNames.map(name => `Tailoring suggestions for ${name}...`),
        "Finalizing recommendations..."
    ];
    
    let messageIndex = 0;
    setDailyLoadingMessage(messages[messageIndex]);
    messageIndex++;

    loadingIntervalRef.current = window.setInterval(() => {
        setDailyLoadingMessage(messages[messageIndex]);
        messageIndex = (messageIndex + 1) % messages.length;
    }, 2500);

    const performManualSearch = async () => {
        if (!manualLocationInput.trim()) {
            setError("Please enter a location to get suggestions.");
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            setDailyLoadingMessage(null);
            return;
        }
        try {
            const result = await getWeatherAndClothingSuggestionsForLocation(manualLocationInput, familyNames, day, dailyScheduleInput);
            if (result?.suggestions) {
                result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
            }
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            setDailyLoadingMessage(null);
        }
    };
    
    if (showManualLocation) {
        performManualSearch();
        return;
    }
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter your location manually.");
      setShowManualLocation(true);
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      setDailyLoadingMessage(null);
      return;
    }

    const skipPrompt = opts?.skipPermissionPrompt === true;
    // Show an in-app explanation before triggering the browser permission prompt
    if (!skipPrompt && !showManualLocation) {
      pendingRequestDayRef.current = day;
      setShowLocationExplanation(true);
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      setDailyLoadingMessage(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const result = await getWeatherAndClothingSuggestions(latitude, longitude, familyNames, day, dailyScheduleInput);
          
          if (result?.suggestions) {
            result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
          }
          setData(result);
          setShowManualLocation(false); 
          setManualLocationInput('');
        } catch (err) {
          setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
          if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
          setDailyLoadingMessage(null);
        }
      },
      (geoError) => {
        let message = "Could not retrieve your location. Please enter it manually below.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
            message = "Location access denied. Please enable it in your browser settings or enter your location manually below.";
        }
        setError(message);
        setShowManualLocation(true);
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        setDailyLoadingMessage(null);
      }
    );
  }, [family, dailyScheduleInput, showManualLocation, manualLocationInput]);

  const handleGetTravelSuggestions = useCallback(async () => {
    if (!travelInput.trim()) {
        setTravelError("Please enter a destination and duration.");
        return;
    }
    
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    
    setTravelError(null);
    setTravelData(null);
    
    const familyNames = family.map(f => f.name);

    const messages = [
        `Generating packing list for ${travelInput}...`,
        "Researching typical weather conditions...",
        ...familyNames.map(name => `Creating packing list for ${name}...`),
        "Adding travel essentials...",
        "Finalizing your packing list..."
    ];
    
    let messageIndex = 0;
    setTravelLoadingMessage(messages[messageIndex]);
    messageIndex++;

    loadingIntervalRef.current = window.setInterval(() => {
        setTravelLoadingMessage(messages[messageIndex]);
        messageIndex = (messageIndex + 1) % messages.length;
    }, 2500);
    
    try {
        const result = await getTravelClothingSuggestions(travelInput, familyNames);
        if (result?.suggestions) {
            result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
        }
        setTravelData(result);
    } catch (err) {
        setTravelError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        setTravelLoadingMessage(null);
    }
  }, [travelInput, family]);

  const generateResultsTitle = (day: 'today' | 'tomorrow' | null): string => {
    if (!day) return '';
    
    const date = new Date();
    if (day === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString(undefined, options);
    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
    
    return `${dayLabel}'s Outfit Suggestions (${dateString})`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      {showLocationExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Allow location access?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Family Weather Wardrobe would like to use your device's location to show local weather and personalized outfit suggestions. We only use your location to fetch weather and do not store precise coordinates.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLocationExplanation(false);
                  setShowManualLocation(true);
                  pendingRequestDayRef.current = null;
                }}
                className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              >
                Enter location manually
              </button>
              <button
                onClick={() => {
                  const pending = pendingRequestDayRef.current ?? 'today';
                  setShowLocationExplanation(false);
                  pendingRequestDayRef.current = null;
                  handleGetSuggestions(pending, { skipPermissionPrompt: true });
                }}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Allow location
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="container mx-auto px-4 py-8 sm:py-16 flex-grow">
        <header className="w-full max-w-4xl mx-auto text-center mb-10">
            <div className="flex justify-center items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white">
                  Family Weather Wardrobe
                </h1>
                <TempUnitToggle unit={tempUnit} onToggle={setTempUnit} />
            </div>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              AI-powered clothing advice for today's weather or your next trip.
            </p>
        </header>

        <div className="flex flex-col items-center justify-center space-y-6">
          {/* --- Main Action Buttons --- */}
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 w-full max-w-lg">
            <button
              onClick={() => handleGetSuggestions('today')}
              disabled={!!dailyLoadingMessage}
              title="Get today's forecast and outfit suggestions"
              className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 w-full"
            >
              <UserGroupIcon className="w-5 h-5 mr-2 transition-transform group-hover:rotate-12" />
              For Today
            </button>
            <button
              onClick={() => handleGetSuggestions('tomorrow')}
              disabled={!!dailyLoadingMessage}
              title="Get tomorrow's forecast and outfit suggestions"
              className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white bg-sky-600 rounded-full shadow-lg hover:bg-sky-700 active:bg-sky-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300 dark:focus:ring-sky-800 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 w-full"
            >
              <CalendarIcon className="w-5 h-5 mr-2 transition-transform group-hover:rotate-12" />
              For Tomorrow
            </button>
            <button
              onClick={() => setIsConfigOpen(true)}
              title="Configure family members"
              className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-slate-600 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-full shadow-lg hover:bg-slate-300 dark:hover:bg-slate-600 active:bg-slate-400 dark:active:bg-slate-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 w-full"
            >
              <CogIcon className="w-5 h-5 mr-2 transition-transform group-hover:rotate-12" />
              Configure Family
            </button>
          </div>
          
          {/* --- Optional Inputs Card --- */}
          <div className="w-full max-w-lg">
            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                {showManualLocation && (
                    <div className="animate-fade-in-fast">
                        <label htmlFor="manual-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Location
                        </label>
                        <input
                            id="manual-location"
                            type="text"
                            value={manualLocationInput}
                            onChange={(e) => setManualLocationInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !dailyLoadingMessage) handleGetSuggestions('today'); }}
                            placeholder="e.g., 'London, UK' or '90210'"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Manual location input"
                            autoFocus
                        />
                    </div>
                )}
                
                <div>
                    <label htmlFor="daily-schedule" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Daily Schedule <span className="text-slate-400">(Optional)</span>
                    </label>
                    <input
                        id="daily-schedule"
                        type="text"
                        value={dailyScheduleInput}
                        onChange={(e) => setDailyScheduleInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !dailyLoadingMessage) handleGetSuggestions('today'); }}
                        placeholder="e.g., morning run, afternoon meeting"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        aria-label="Daily schedule input"
                    />
                </div>
            </div>
          </div>
          
          {/* --- Today's Suggestions --- */}
          {dailyLoadingMessage && <Spinner message={dailyLoadingMessage} />}
          {error && <ErrorMessage message={error} />}
          {data && lastRequestType && (
            <div ref={resultsRef} className="w-full max-w-4xl">
              <ResultsBlock title={generateResultsTitle(lastRequestType)} data={data} onRefresh={() => lastRequestType && handleGetSuggestions(lastRequestType)} isLoading={!!dailyLoadingMessage} family={family} onTogglePin={handleTogglePin} tempUnit={tempUnit}/>
            </div>
          )}

          <div className="w-full max-w-4xl h-px bg-slate-200 dark:bg-slate-700 my-8"></div>
          
          {/* --- Travel Planner --- */}
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 dark:text-white">Upcoming Travel</h2>
             {!isTravelCalendarConnected ? (
                 <div className="text-center">
                    <button onClick={() => setTravelCalendarConnected(true)} className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline" title="Generate a packing list for an upcoming trip">
                        <CalendarIcon className="w-5 h-5" />
                        Plan a packing list for a trip
                    </button>
                 </div>
             ) : (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <input
                        type="text"
                        value={travelInput}
                        onChange={(e) => setTravelInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGetTravelSuggestions(); }}
                        placeholder="e.g., 'Paris for 5 days' or 'Vienna for Christmas'"
                        className="flex-grow w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleGetTravelSuggestions}
                        disabled={!!travelLoadingMessage}
                        title="Generate a packing list for your trip"
                        className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400"
                      >
                        Generate Packing List
                      </button>
                    </div>
                </div>
             )}
          </div>
          
          {/* --- Travel Suggestions --- */}
          {travelLoadingMessage && <Spinner message={travelLoadingMessage} />}
          {travelError && <ErrorMessage message={travelError} />}
          {travelData && (
            <div ref={travelResultsRef} className="w-full max-w-4xl mt-6">
                <ResultsBlock
                    title={travelData.weather?.dateRange ? `${travelData.weather.location} (${travelData.weather.dateRange})` : travelData.weather?.location || 'Travel Packing List'}
                    data={travelData}
                    onRefresh={handleGetTravelSuggestions}
                    isLoading={!!travelLoadingMessage}
                    family={family}
                    onTogglePin={handleTogglePin}
                    tempUnit={tempUnit}
                />
            </div>
          )}
        </div>
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center px-4 py-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Disclaimer: The clothing and weather information provided is AI-generated. Please verify local weather conditions independently and dress appropriately. You are responsible for your own safety and comfort.
        </p>
      </footer>
      {isConfigOpen && <FamilyConfigModal family={family} setFamily={setFamily} onClose={() => setIsConfigOpen(false)} />}
    </div>
  );
};

// FIX: Add default export to make the component available for import in index.tsx.
export default App;