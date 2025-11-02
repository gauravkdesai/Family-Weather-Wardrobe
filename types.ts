export interface WeatherData {
  location: string;
  highTemp: number;
  lowTemp: number;
  condition: string;
  conditionIcon: string;
}

export interface ClothingSuggestion {
  member: string;
  outfit: string[];
  notes: string;
}

export interface GeminiResponse {
  weather: WeatherData;
  suggestions: ClothingSuggestion[];
}

export interface FamilyMember {
  name: string;
  pinned: boolean;
}
