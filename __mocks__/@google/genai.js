// Manual Jest mock for @google/genai to avoid ESM runtime issues in tests.
class MockGoogleGenAI {
  constructor(opts) {
    this.opts = opts;
    this.models = {
      generateContent: async ({ model, contents, config }) => {
        // Return a predictable JSON text payload suitable for parsing by the function
        const responseObj = {
          weather: {
            location: 'Mockville, MV',
            highTemp: 20,
            lowTemp: 10,
            dayParts: [
              { period: 'Morning', temp: 10, condition: 'Clear', conditionIcon: 'SUNNY', time: '07:00' },
              { period: 'Afternoon', temp: 20, condition: 'Sunny', conditionIcon: 'SUNNY', time: '12:00' },
              { period: 'Evening', temp: 18, condition: 'Clear', conditionIcon: 'SUNNY', time: '17:00' },
              { period: 'Night', temp: 10, condition: 'Clear', conditionIcon: 'SUNNY', time: '22:00' },
            ],
          },
          suggestions: [],
        };

        return { text: JSON.stringify(responseObj) };
      }
    };
  }
}

// Minimal Type object to satisfy runtime code that uses Type.OBJECT, Type.STRING, etc.
const Type = {
  OBJECT: 'object',
  STRING: 'string',
  INTEGER: 'integer',
  ARRAY: 'array'
};

module.exports = {
  GoogleGenAI: MockGoogleGenAI,
  Type,
};
