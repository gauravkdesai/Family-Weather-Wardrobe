

import React, { useMemo } from 'react';
import { WeatherData, DayPartForecast } from '../types';
import { SunnyIcon, CloudyIcon, RainIcon, SnowIcon, WindyIcon, PartlyCloudyIcon, LocationMarkerIcon } from './icons';

interface WeatherDisplayProps {
  weather: WeatherData;
  tempUnit: 'C' | 'F';
}

// Helper to get weather icon component
const getWeatherIconComponent = (iconName: string) => {
    switch (iconName?.toUpperCase()) {
        case 'SUNNY': return SunnyIcon;
        case 'CLOUDY': return CloudyIcon;
        case 'PARTLY_CLOUDY': return PartlyCloudyIcon;
        case 'RAIN': return RainIcon;
        case 'SNOW': return SnowIcon;
        case 'WINDY': return WindyIcon;
        default: return PartlyCloudyIcon;
    }
};


const WeatherTimeline: React.FC<{ dayParts: DayPartForecast[], tempUnit: 'C'|'F' }> = ({ dayParts, tempUnit }) => {
    const convertTemp = (celsius: number) => tempUnit === 'F' ? Math.round(celsius * 9 / 5 + 32) : celsius;
    
    if (!dayParts || dayParts.length < 2) return null;

    const temperatures = dayParts.map(p => convertTemp(p.temp));
    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const tempRange = maxTemp - minTemp || 1; // Avoid division by zero

    const SVG_WIDTH = 300;
    const SVG_HEIGHT = 120;
    const PADDING_Y = 30;
    const PADDING_X = 20;
    const CHART_HEIGHT = SVG_HEIGHT - (2 * PADDING_Y);
    const CHART_WIDTH = SVG_WIDTH - (2 * PADDING_X);

    const getPoint = (temp: number, index: number) => {
        const x = PADDING_X + (CHART_WIDTH / (dayParts.length - 1)) * index;
        const y = SVG_HEIGHT - PADDING_Y - ((temp - minTemp) / tempRange) * CHART_HEIGHT;
        return { x, y };
    };

    const points = temperatures.map(getPoint);
    const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');

    return (
        <div className="w-full mt-4 pt-4 border-t border-slate-200 dark:border-slate-600/50">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto" aria-labelledby="weather-graph-title" role="img">
                <title id="weather-graph-title">A graph showing temperature and weather changes throughout the day.</title>
                <path d={pathData} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-400 dark:text-slate-500" />

                {points.map((p, i) => {
                    const temp = temperatures[i];
                    const IconComponent = getWeatherIconComponent(dayParts[i].conditionIcon);
                    
                    return (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" stroke="currentColor" strokeWidth="2" className="text-indigo-500 bg-white dark:bg-slate-700" />
                            <text x={p.x} y={p.y - 12} textAnchor="middle" fill="currentColor" className="text-sm font-semibold text-slate-700 dark:text-slate-200" aria-label={`Temperature: ${temp} degrees ${tempUnit}`}>
                                {temp}°
                            </text>
                            
                            <foreignObject x={p.x - 12} y={SVG_HEIGHT - 40} width="24" height="24" aria-label={`Weather is ${dayParts[i].condition}`}>
                                <IconComponent className="w-full h-full" />
                            </foreignObject>
                            
                            <text x={p.x} y={SVG_HEIGHT - 10} textAnchor="middle" fill="currentColor" className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                              {(() => {
                                const t = dayParts[i].time || '';
                                const [hhStr, mmStr] = t.split(':');
                                const hh = Number(hhStr);
                                const mm = Number(mmStr || 0);
                                if (Number.isNaN(hh)) return t;
                                const suffix = hh >= 12 ? 'PM' : 'AM';
                                const hour12 = ((hh + 11) % 12) + 1; // convert 0->12
                                if (mm && mm !== 0) {
                                  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
                                }
                                return `${hour12} ${suffix}`;
                              })()}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};


const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather, tempUnit }) => {
  const representativeForecast = 
    weather.dayParts?.find(p => p.period.toUpperCase() === 'AFTERNOON') || 
    weather.dayParts?.[1] || 
    weather.dayParts?.[0];

  const condition = representativeForecast?.condition ?? 'Weather data unavailable';
  const conditionIcon = representativeForecast?.conditionIcon ?? 'PARTLY_CLOUDY';
  
  const convertTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return Math.round(celsius * 9 / 5 + 32);
    }
    return celsius;
  };
  
  const displayHigh = convertTemp(weather.highTemp);
  const displayLow = convertTemp(weather.lowTemp);

  const WeatherIcon = useMemo(() => getWeatherIconComponent(conditionIcon), [conditionIcon]);

  return (
    <section
      className="bg-slate-100 dark:bg-slate-700/40 rounded-lg p-4 sm:p-6 w-full"
      aria-label={`Weather summary for ${weather.location}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <WeatherIcon className="w-16 h-16 flex-shrink-0" aria-hidden="true" />
          <div className="flex-grow">
            <div className="flex items-center gap-2">
                <LocationMarkerIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100" id="weather-location">{weather.location}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 pl-7" aria-describedby="weather-location">{condition}</p>
          </div>
        </div>
        <div className="text-center sm:text-right flex-shrink-0">
          <p className="text-5xl font-bold text-slate-800 dark:text-slate-100" aria-label={`High temperature: ${displayHigh} degrees ${tempUnit}`}>{displayHigh}°{tempUnit}</p>
          <p className="text-slate-500 dark:text-slate-400" aria-label={`Low temperature: ${displayLow} degrees ${tempUnit}`}>High / {displayLow}°{tempUnit} Low</p>
        </div>
      </div>
      <WeatherTimeline dayParts={weather.dayParts} tempUnit={tempUnit} />
    </section>
  );
};

export default WeatherDisplay;