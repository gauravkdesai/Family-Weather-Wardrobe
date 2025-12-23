// Manual Jest mock for @google-cloud/vertexai to avoid ESM/runtime issues in tests.
class VertexAI {
  constructor(opts) {
    this.opts = opts;
  }

  getGenerativeModel() {
    return {
      async generateContent(params = {}) {
        const prompt = params.contents?.[0]?.parts?.[0]?.text || '';
        let payload;

        if (prompt.toLowerCase().includes('sunrise and sunset')) {
          payload = { sunrise: '06:30', sunset: '18:45' };
        } else if (prompt.toLowerCase().includes('clothing') || prompt.toLowerCase().includes('packing')) {
          payload = [
            { member: 'Adult', outfit: ['Light jacket', 'Jeans'], notes: 'Layers for changing temps.' },
            { member: 'Child', outfit: ['Hoodie', 'Sneakers'], notes: 'Comfortable for activities.' }
          ];
        } else {
          payload = {
            location: 'Mockville, MV',
            highTemp: 20,
            lowTemp: 10,
            temp07: 10,
            temp12: 20,
            temp17: 18,
            temp22: 12,
            condition07: 'Clear',
            condition12: 'Sunny',
            condition17: 'Clear',
            condition22: 'Clear'
          };
        }

        return { response: { candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] } };
      }
    };
  }
}

module.exports = { VertexAI };
