import { createWeatherPrompt, createTravelWeatherPrompt, createClothingPrompt, createTravelClothingPrompt } from '../suggestions';

describe('suggestions.ts prompt creation', () => {
  it('creates a weather prompt with location', () => {
    const prompt = createWeatherPrompt('today', { location: 'Zurich' });
    expect(prompt).toContain('Zurich');
    expect(prompt).toContain('weather');
    expect(prompt).toContain('temp07');
    expect(prompt).toContain('temp12');
    expect(prompt).toContain('temp17');
    expect(prompt).toContain('temp22');
  });

  it('creates a clothing prompt', () => {
    const weatherData = {
      location: 'Zurich, Switzerland',
      highTemp: 15,
      lowTemp: 5,
      temp07: 8,
      temp12: 13,
      temp17: 14,
      temp22: 7,
      condition07: 'Clear',
      condition12: 'Sunny',
      condition17: 'Partly cloudy',
      condition22: 'Clear'
    };
    const prompt = createClothingPrompt(['Alice', 'Bob'], weatherData, 'school, gym');
    expect(prompt).toContain('Zurich');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain('school, gym');
    expect(prompt).toContain('15°C');
  });

  it('creates a travel weather prompt', () => {
    const prompt = createTravelWeatherPrompt('Paris, 3 days');
    expect(prompt).toContain('Paris');
    expect(prompt).toContain('weather');
    expect(prompt).toContain('temp07');
  });

  it('creates a travel clothing prompt', () => {
    const weatherData = {
      location: 'Paris, France',
      dateRange: 'Dec 1-3, 2025',
      highTemp: 10,
      lowTemp: 2,
      temp07: 5,
      temp12: 8,
      temp17: 9,
      temp22: 4,
      condition07: 'Cloudy',
      condition12: 'Light rain',
      condition17: 'Overcast',
      condition22: 'Clear'
    };
    const prompt = createTravelClothingPrompt(['Alice', 'Bob'], weatherData);
    expect(prompt).toContain('Paris');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain('Dec 1-3');
  });
});
