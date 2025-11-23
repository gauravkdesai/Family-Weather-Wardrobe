import { createDailyPrompt, createTravelPrompt } from '../suggestions';

describe('suggestions.ts prompt creation', () => {
  it('creates a daily prompt with location', () => {
    const prompt = createDailyPrompt(['Alice', 'Bob'], 'today', 'school, gym', { location: 'Zurich' });
    expect(prompt).toContain('Zurich');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain('school, gym');
    expect(prompt).toContain('weather');
    expect(prompt).toContain('suggestions');
  });

  it('creates a travel prompt', () => {
    const prompt = createTravelPrompt('Paris, 3 days', ['Alice', 'Bob']);
    expect(prompt).toContain('Paris');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain('weather');
    expect(prompt).toContain('suggestions');
  });
});
