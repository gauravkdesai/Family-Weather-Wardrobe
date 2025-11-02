import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getWeatherAndClothingSuggestions, getTravelClothingSuggestions } from './services/geminiService';
import { GeminiResponse, WeatherData, FamilyMember } from './types';
import Spinner from './components/Spinner';
import FamilyConfigModal from './components/FamilyConfigModal';
import { UserGroupIcon, CogIcon, CalendarIcon, LocationMarkerIcon, SunnyIcon, CloudyIcon, RainIcon, SnowIcon, WindyIcon, PartlyCloudyIcon } from './components/icons';
import SuggestionsTabs from './components/SuggestionsTabs';

const FAMILY_STORAGE_KEY = 'familyWeatherWardrobeFamily';
const TRAVEL_CALENDAR_STORAGE_KEY = 'familyWeatherWardrobeTravelCalendarConnected';
const DAILY_CALENDAR_STORAGE_KEY = 'familyWeatherWardrobeDailyCalendarConnected';

const App: React.FC = () => {
  // State for local weather suggestions
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeminiResponse | null>(null);
  const [dailyScheduleInput, setDailyScheduleInput] = useState<string>('');

  // State for travel suggestions
  const [isTravelLoading, setTravelLoading] = useState<boolean>(false);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelData, setTravelData] = useState<GeminiResponse | null>(null);
  const [travelInput, setTravelInput] = useState<string>('');
  
  // Shared state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [family, setFamily] = useState<FamilyMember[]>(() => {
    try {
      const storedFamily = localStorage.getItem(FAMILY_STORAGE_KEY);
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

  const [isTravelCalendarConnected, setTravelCalendarConnected] = useState<boolean>(() => {
     return localStorage.getItem(TRAVEL_CALENDAR_STORAGE_KEY) === 'true';
  });
  const [isDailyCalendarConnected, setDailyCalendarConnected] = useState<boolean>(() => {
    return localStorage.getItem(DAILY_CALENDAR_STORAGE_KEY) === 'true';
  });


  useEffect(() => {
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(family));
  }, [family]);

  useEffect(() => {
    localStorage.setItem(TRAVEL_CALENDAR_STORAGE_KEY, String(isTravelCalendarConnected));
  }, [isTravelCalendarConnected]);

  useEffect(() => {
    localStorage.setItem(DAILY_CALENDAR_STORAGE_KEY, String(isDailyCalendarConnected));
  }, [isDailyCalendarConnected]);

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

  const handleGetSuggestions = useCallback(() => {
    setLoading(true);
    setError(null);
    setData(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const familyNames = family.map(f => f.name);
          const result = await getWeatherAndClothingSuggestions(latitude, longitude, familyNames, dailyScheduleInput);
          
          if (result?.suggestions) {
            // Sort the API response to match our pinned/sorted family order
            result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
          }
          setData(result);

        } catch (err) {
          setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        let message = "Could not retrieve your location.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
            message = "Location access denied. Please enable it in your browser settings.";
        }
        setError(message);
        setLoading(false);
      }
    );
  }, [family, dailyScheduleInput]);
  
  const handleGetTravelSuggestions = useCallback(async () => {
    if (!travelInput.trim()) {
        setTravelError("Please enter a destination and duration.");
        return;
    }
    setTravelLoading(true);
    setTravelError(null);
    setTravelData(null);
    
    try {
        const familyNames = family.map(f => f.name);
        const result = await getTravelClothingSuggestions(travelInput, familyNames);
        if (result?.suggestions) {
            result.suggestions.sort((a, b) => familyNames.indexOf(a.member) - familyNames.indexOf(b.member));
        }
        setTravelData(result);
    } catch (err) {
        setTravelError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setTravelLoading(false);
    }
  }, [travelInput, family]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <main className="container mx-auto px-4 py-8 sm:py-16">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white mb-2">
            Family Weather Wardrobe
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            AI-powered clothing advice for today's weather or your next trip.
          </p>
        </header>

        <div className="flex flex-col items-center justify-center space-y-6">
          {/* --- Main Action Buttons --- */}
          <div className="flex flex-col items-center justify-center gap-4 w-full max-w-lg">
              <div className="flex items-center justify-center gap-4 w-full">
                <button
                  onClick={handleGetSuggestions}
                  disabled={loading}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 w-full sm:w-auto"
                >
                  <UserGroupIcon className="w-6 h-6 mr-3 transition-transform group-hover:rotate-12" />
                  What to Wear Today
                </button>
                <button
                  onClick={() => setIsConfigOpen(true)}
                  className="p-4 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-300 dark:focus:ring-slate-600"
                  aria-label="Configure Family"
                >
                  <CogIcon className="w-6 h-6" />
                </button>
              </div>
               {/* --- Daily Calendar Input --- */}
              <div className="w-full text-center">
                {!isDailyCalendarConnected ? (
                  <button onClick={() => setDailyCalendarConnected(true)} className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    <CalendarIcon className="w-4 h-4" />
                    Connect Calendar for today's events?
                  </button>
                ) : (
                  <div className="animate-fade-in-fast">
                    <label htmlFor="daily-schedule" className="sr-only">Today's Schedule</label>
                    <input
                      id="daily-schedule"
                      type="text"
                      value={dailyScheduleInput}
                      onChange={(e) => setDailyScheduleInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGetSuggestions(); }}
                      placeholder="Optional: Enter today's events (e.g., work meeting, gym)"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                )}
              </div>
          </div>
          
          {/* --- Today's Suggestions --- */}
          {loading && <Spinner />}
          {error && <ErrorMessage message={error} />}
          {data && (
            <div className="w-full max-w-4xl">
              <ResultsBlock title="Today's Outfit Suggestions" data={data} onRefresh={handleGetSuggestions} isLoading={loading} family={family} onTogglePin={handleTogglePin}/>
            </div>
          )}

          <div className="w-full max-w-4xl h-px bg-slate-200 dark:bg-slate-700 my-8"></div>
          
          {/* --- Travel Planner --- */}
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4 text-slate-800 dark:text-white">Upcoming Travel?</h2>
             {!isTravelCalendarConnected ? (
                 <div className="text-center">
                    <button onClick={() => setTravelCalendarConnected(true)} className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
                        <CalendarIcon className="w-5 h-5" />
                        Connect Calendar to generate a packing list
                    </button>
                    <p className="text-xs text-slate-500 mt-1">(This is a simulation. You'll enter trip details manually.)</p>
                 </div>
             ) : (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <input
                        type="text"
                        value={travelInput}
                        onChange={(e) => setTravelInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGetTravelSuggestions(); }}
                        placeholder="e.g., 'Paris for 5 days'"
                        className="flex-grow w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleGetTravelSuggestions}
                        disabled={isTravelLoading}
                        className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400"
                      >
                        Generate Packing List
                      </button>
                    </div>
                </div>
             )}
          </div>
          
          {/* --- Travel Suggestions --- */}
          {isTravelLoading && <Spinner />}
          {travelError && <ErrorMessage message={travelError} />}
          {travelData && (
            <div className="w-full max-w-4xl mt-6">
             <ResultsBlock title="Your Packing List" data={travelData} onRefresh={handleGetTravelSuggestions} isLoading={isTravelLoading} family={family} onTogglePin={handleTogglePin} />
            </div>
          )}
        </div>

        {isConfigOpen && (
          <FamilyConfigModal
            family={family}
            setFamily={setFamily}
            onClose={() => setIsConfigOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

// Helper components
const ErrorMessage: React.FC<{message: string}> = ({ message }) => (
    <div className="mt-8 text-center bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-md shadow-md max-w-2xl w-full" role="alert">
      <p className="font-bold">Oops! Something went wrong.</p>
      <p>{message}</p>
    </div>
);

const CompactWeatherDisplay: React.FC<{ weather: WeatherData }> = ({ weather }) => {
    const WeatherIcon = useMemo(() => {
    switch (weather.conditionIcon.toUpperCase()) {
      case 'SUNNY': return SunnyIcon;
      case 'CLOUDY': return CloudyIcon;
      case 'PARTLY_CLOUDY': return PartlyCloudyIcon;
      case 'RAIN': return RainIcon;
      case 'SNOW': return SnowIcon;
      case 'WINDY': return WindyIcon;
      default: return PartlyCloudyIcon;
    }
  }, [weather.conditionIcon]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <LocationMarkerIcon className="w-4 h-4" />
            <span className="font-medium">{weather.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <WeatherIcon className="w-5 h-5" />
            <span>{weather.condition}</span>
        </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
            <span>{weather.highTemp}°</span>
            <span className="text-slate-400 font-normal"> / {weather.lowTemp}°C</span>
            </div>
    </div>
  );
};

interface ResultsBlockProps {
    title: string;
    data: GeminiResponse;
    onRefresh: () => void;
    isLoading: boolean;
    family: FamilyMember[];
    onTogglePin: (memberName: string) => void;
}

const ResultsBlock: React.FC<ResultsBlockProps> = ({ title, data, onRefresh, isLoading, family, onTogglePin }) => (
    <div className="w-full animate-fade-in bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-slate-800 dark:text-white">{title}</h2>
          <CompactWeatherDisplay weather={data.weather} />
      </div>

      <SuggestionsTabs suggestions={data.suggestions} family={family} onTogglePin={onTogglePin} />

       <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
         <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            Refresh Suggestions
          </button>
       </div>
       <style>{`
          .animate-fade-in {
            animation: fadeIn 0.5s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
           .animate-fade-in-fast {
            animation: fadeIn 0.2s ease-in-out;
          }
        `}</style>
    </div>
);


export default App;