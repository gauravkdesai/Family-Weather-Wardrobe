export interface DayPartForecast {
  period: string; // e.g., "Morning", "Afternoon", "Evening"
  temp: number;
  condition: string;
  conditionIcon: string;
  time: string; // e.g., "07:00"
}

export interface WeatherData {
  location: string;
  highTemp: number;
  lowTemp: number;
  dayParts: DayPartForecast[];
  dateRange?: string;
}

export interface ClothingSuggestion {
  member: string;
  outfit: string[];
  notes: string;
}

export interface GeminiResponse {
  weather?: WeatherData;
  suggestions?: ClothingSuggestion[];
}

export interface FamilyMember {
  name: string;
  pinned: boolean;
}