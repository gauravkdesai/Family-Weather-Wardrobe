
import React, { useMemo } from 'react';
import { WeatherData } from '../types';
import { SunnyIcon, CloudyIcon, RainIcon, SnowIcon, WindyIcon, PartlyCloudyIcon, LocationMarkerIcon } from './icons';

interface WeatherDisplayProps {
  weather: WeatherData;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather }) => {
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
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 w-full max-w-4xl mx-auto border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <WeatherIcon className="w-16 h-16 text-indigo-500" />
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <LocationMarkerIcon className="w-5 h-5" />
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{weather.location}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">{weather.condition}</p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{weather.highTemp}°C</p>
          <p className="text-slate-500 dark:text-slate-400">High / {weather.lowTemp}°C Low</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay;
