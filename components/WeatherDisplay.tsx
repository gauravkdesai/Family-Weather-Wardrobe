

import React, { useMemo } from 'react';
import { WeatherData, DayPartForecast } from '../types';
import { SunnyIcon, CloudyIcon, RainIcon, SnowIcon, WindyIcon, PartlyCloudyIcon, LocationMarkerIcon, PartlyCloudyNightIcon, MoonIcon } from './icons';

interface WeatherDisplayProps {
  weather: WeatherData;
  tempUnit: 'C' | 'F';
}

// Helper to get weather icon component
const getWeatherIconComponent = (iconName: string) => {
    switch (iconName?.toUpperCase()) {
        case 'SUNNY': return SunnyIcon;
    case 'CLEAR_NIGHT': return MoonIcon;
        case 'CLOUDY': return CloudyIcon;
        case 'PARTLY_CLOUDY': return PartlyCloudyIcon;
    case 'PARTLY_CLOUDY_NIGHT': return PartlyCloudyNightIcon;
        case 'RAIN': return RainIcon;
        case 'SNOW': return SnowIcon;
        case 'WINDY': return WindyIcon;
        default: return PartlyCloudyIcon;
    }
};

const nightAdjustIcon = (iconName: string, isNight?: boolean) => {
  if (!isNight) return iconName;
  const upper = iconName?.toUpperCase();
  if (upper === 'SUNNY') return 'CLEAR_NIGHT';
  if (upper === 'PARTLY_CLOUDY') return 'PARTLY_CLOUDY_NIGHT';
  return iconName;
};


const WeatherTimeline: React.FC<{ dayParts: DayPartForecast[], tempUnit: 'C'|'F' }> = ({ dayParts, tempUnit }) => {
    const convertTemp = (celsius: number) => tempUnit === 'F' ? Math.round(celsius * 9 / 5 + 32) : celsius;
    
    if (!dayParts || dayParts.length < 2) return null;

    const temperatures = dayParts.map(p => convertTemp(p.temp));
    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const tempRange = maxTemp - minTemp || 1; // Avoid division by zero

    const SVG_WIDTH = 300;
    const SVG_HEIGHT = 180;
    const PADDING_TOP = 40;
    const PADDING_BOTTOM = 60;
    const PADDING_X = 20;
    const CHART_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const CHART_WIDTH = SVG_WIDTH - (2 * PADDING_X);

    const getPoint = (temp: number, index: number) => {
        const x = PADDING_X + (CHART_WIDTH / (dayParts.length - 1)) * index;
        const y = SVG_HEIGHT - PADDING_BOTTOM - ((temp - minTemp) / tempRange) * CHART_HEIGHT;
        return { x, y };
    };

    const points = temperatures.map(getPoint);
    const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');

    return (
        <div className="w-full mt-6 pt-6 border-t border-white/10">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto" aria-labelledby="weather-graph-title" role="img">
                <title id="weather-graph-title">A graph showing temperature and weather changes throughout the day.</title>
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                </defs>
                
                <path d={pathData} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" className="opacity-80 drop-shadow-lg" />

                {points.map((p, i) => {
                    const temp = temperatures[i];
                    const iconName = nightAdjustIcon(dayParts[i].conditionIcon, dayParts[i].isNight);
                    const IconComponent = getWeatherIconComponent(iconName);
                    
                    return (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#1e293b" stroke="#22d3ee" strokeWidth="2" />
                            <text x={p.x} y={p.y - 12} textAnchor="middle" fill="currentColor" className="text-sm font-bold text-white drop-shadow-md" aria-label={`Temperature: ${temp} degrees ${tempUnit}`}>
                                {temp}°
                            </text>
                            
                            <svg x={p.x - 12} y={p.y + 12} width="24" height="24" aria-label={`Weather is ${dayParts[i].condition}`}>
                                <IconComponent className="w-full h-full drop-shadow-sm" />
                            </svg>
                            
                            <text x={p.x} y={SVG_HEIGHT - 10} textAnchor="middle" fill="currentColor" className="text-[10px] uppercase tracking-wider font-medium text-slate-300">
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
  const conditionIcon = nightAdjustIcon(representativeForecast?.conditionIcon ?? 'PARTLY_CLOUDY', representativeForecast?.isNight);
  
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
      className="w-full"
      aria-label={`Weather summary for ${weather.location}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 w-full sm:w-auto">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-inner">
             <WeatherIcon className="w-16 h-16 flex-shrink-0 filter drop-shadow-lg" aria-hidden="true" />
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
                <LocationMarkerIcon className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                <h2 className="text-2xl font-bold text-white tracking-tight" id="weather-location">{weather.location}</h2>
            </div>
            <p className="text-lg text-indigo-200 pl-7 font-medium" aria-describedby="weather-location">{condition}</p>
          </div>
        </div>
        <div className="text-center sm:text-right flex-shrink-0 text-white bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
          <div className="flex items-baseline justify-center sm:justify-end gap-3">
            <div className="flex flex-col items-center">
                 <span className="text-xs text-indigo-300 uppercase tracking-widest font-bold">High</span>
                 <span className="text-3xl font-black text-white" aria-label={`High temperature: ${displayHigh} degrees ${tempUnit}`}>{displayHigh}°</span>
            </div>
            <span className="text-3xl font-light text-slate-500 self-center">/</span>
            <div className="flex flex-col items-center">
                 <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Low</span>
                 <span className="text-3xl font-bold text-slate-300" aria-label={`Low temperature: ${displayLow} degrees ${tempUnit}`}>{displayLow}°</span>
            </div>
          </div>
        </div>
      </div>
      <WeatherTimeline dayParts={weather.dayParts} tempUnit={tempUnit} />
    </section>
  );
};

export default WeatherDisplay;