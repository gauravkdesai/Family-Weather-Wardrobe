import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { GeminiResponse } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    weather: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: "City and region, e.g., 'San Francisco, CA'" },
        highTemp: { type: Type.INTEGER, description: "Highest temperature for the day in Celsius" },
        lowTemp: { type: Type.INTEGER, description: "Lowest temperature for the day in Celsius" },
        condition: { type: Type.STRING, description: "A brief description of the weather, e.g., 'Sunny with a light breeze'" },
        conditionIcon: { type: Type.STRING, description: "A single keyword for an icon: 'SUNNY', 'CLOUDY', 'RAIN', 'SNOW', 'WINDY', 'PARTLY_CLOUDY'" }
      },
      required: ["location", "highTemp", "lowTemp", "condition", "conditionIcon"],
    },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          member: { type: Type.STRING, description: "The family member, which must exactly match one of the provided member descriptions." },
          outfit: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of clothing items to wear or pack."
          },
          notes: { type: Type.STRING, description: "Additional notes or accessories, e.g., 'Don't forget an umbrella!'" }
        },
        required: ["member", "outfit", "notes"],
      }
    }
  },
  required: ["weather", "suggestions"],
};

const callGemini = async (prompt: string, useGrounding: boolean = false): Promise<GeminiResponse> => {
    let responseText = '';
    try {
        const config: GenerateContentParameters['config'] = {};
        
        if (useGrounding) {
            config.tools = [{googleSearch: {}}];
        } else {
            config.responseMimeType = "application/json";
            config.responseSchema = responseSchema;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: config,
        });

        responseText = response.text.trim();
        // The model can sometimes wrap the JSON in markdown backticks when not using schema enforcement.
        const cleanedText = responseText.replace(/^```json\n?/, '').replace(/```$/, '');
        
        return JSON.parse(cleanedText) as GeminiResponse;
    } catch (error) {
        console.error("Error fetching suggestions from Gemini:", error);
        if (error instanceof SyntaxError) {
             console.error("Failed to parse JSON response from Gemini. Response text was:", responseText);
             throw new Error("Failed to get suggestions. The model returned an invalid format.");
        }
        throw new Error("Failed to get suggestions. The model may be unavailable or the request was malformed.");
    }
}

export const getWeatherAndClothingSuggestions = async (lat: number, lon: number, family: string[], schedule?: string): Promise<GeminiResponse> => {
  const schedulePromptPart = schedule && schedule.trim() ? ` Also, consider the following schedule for the day: "${schedule}". Tailor the suggestions to be appropriate for these activities.` : '';
  const prompt = `Using real-time, live weather data from Google Search for the entire day at latitude ${lat} and longitude ${lon}, provide a weather summary and clothing suggestions for a family consisting of: ${family.join(', ')}.${schedulePromptPart} The suggestions should be practical for the full day's temperature range and conditions. Crucially, consider local clothing norms and styles for the provided location. Ensure the suggestions are appropriate for each person. The 'member' field in your response for each suggestion must exactly match the member description provided. Respond ONLY with a valid JSON object that conforms to the following structure: { weather: { location: string, highTemp: number (Celsius), lowTemp: number (Celsius), condition: string, conditionIcon: 'SUNNY'|'CLOUDY'|'RAIN'|'SNOW'|'WINDY'|'PARTLY_CLOUDY' }, suggestions: [{ member: string, outfit: string[], notes: string }] }. Do not include any markdown formatting like \`\`\`json.`;
  return callGemini(prompt, true);
};

export const getTravelClothingSuggestions = async (destinationAndDuration: string, family: string[]): Promise<GeminiResponse> => {
    const prompt = `Using real-time, live weather data from Google Search for an upcoming trip to ${destinationAndDuration}, provide a weather summary and a detailed packing list for a family consisting of: ${family.join(', ')}. The suggestions should be practical for the likely temperature range and conditions for that location and time. Crucially, consider local clothing norms and styles. Ensure the suggestions are appropriate for each person. The 'member' field in your response for each suggestion must exactly match the member description provided. Respond ONLY with a valid JSON object that conforms to the following structure: { weather: { location: string, highTemp: number (Celsius), lowTemp: number (Celsius), condition: string, conditionIcon: 'SUNNY'|'CLOUDY'|'RAIN'|'SNOW'|'WINDY'|'PARTLY_CLOUDY' }, suggestions: [{ member: string, outfit: string[], notes: string }] }. Do not include any markdown formatting like \`\`\`json.`;
    return callGemini(prompt, true);
}