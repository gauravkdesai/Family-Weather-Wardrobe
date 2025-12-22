import { GeminiResponse } from './types';

export const mockGeminiResponse: GeminiResponse = {
  weather: {
    location: "San Francisco, CA",
    highTemp: 18,
    lowTemp: 11,
    dayParts: [
      {
        period: "Morning",
        temp: 12,
        condition: "Cool and foggy",
        conditionIcon: "CLOUDY",
        time: "07:00",
        isNight: false,
      },
      {
        period: "Afternoon",
        temp: 18,
        condition: "Partly sunny",
        conditionIcon: "PARTLY_CLOUDY",
        time: "12:00",
        isNight: false,
      },
      {
        period: "Evening",
        temp: 15,
        condition: "Clear and cool",
        conditionIcon: "SUNNY",
        time: "17:00",
        isNight: false,
      },
      {
        period: "Night",
        temp: 11,
        condition: "Clear skies",
        conditionIcon: "SUNNY",
        time: "22:00",
        isNight: true,
      },
    ],
    dateRange: "October 26, 2024",
  },
  suggestions: [
    {
      member: "Adult",
      outfit: [
        "Light jacket or hoodie",
        "Long-sleeve shirt",
        "Jeans or comfortable pants",
        "Closed-toe shoes",
      ],
      notes: "It's a typical SF day! Layers are key. The morning fog will burn off, but it will get cool again in the evening.",
    },
    {
      member: "Child (5-12)",
      outfit: [
        "Sweatshirt",
        "T-shirt",
        "Pants",
        "Sneakers",
      ],
      notes: "A warm layer is important for the morning and after the sun goes down.",
    },
    {
        member: "Toddler (1-4)",
        outfit: [
          "Warm fleece jacket",
          "Long-sleeve onesie or shirt",
          "Pants",
          "Socks and shoes",
          "Beanie (for the morning)",
        ],
        notes: "Keep the little one bundled in the morning and evening. The fleece can be removed during the warmer afternoon.",
    },
    {
        member: "Baby (0-1)",
        outfit: [
          "Footed pajamas or a warm romper",
          "A warm, hooded jacket or bunting",
          "Warm hat or beanie",
          "Blanket for the stroller",
        ],
        notes: "Babies get cold easily. Ensure they are well-covered, especially when it's foggy and windy.",
    },
  ],
};
