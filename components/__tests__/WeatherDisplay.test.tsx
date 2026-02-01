import React from 'react';
import { render, screen } from '@testing-library/react';
import WeatherDisplay from '../WeatherDisplay';
import { WeatherData } from '../../types';

// Mock the icons to simplify testing
jest.mock('../icons', () => ({
  SunnyIcon: () => <svg data-testid="SunnyIcon" />,
  CloudyIcon: () => <svg data-testid="CloudyIcon" />,
  RainIcon: () => <svg data-testid="RainIcon" />,
  SnowIcon: () => <svg data-testid="SnowIcon" />,
  WindyIcon: () => <svg data-testid="WindyIcon" />,
  PartlyCloudyIcon: () => <svg data-testid="PartlyCloudyIcon" />,
  PartlyCloudyNightIcon: () => <svg data-testid="PartlyCloudyNightIcon" />,
  MoonIcon: () => <svg data-testid="MoonIcon" />,
  LocationMarkerIcon: () => <svg data-testid="LocationMarkerIcon" />,
}));

const mockWeather: WeatherData = {
  location: 'Test City, TS',
  highTemp: 25,
  lowTemp: 15,
  dayParts: [
    { period: 'Morning', time: '07:00', temp: 16, condition: 'Sunny', conditionIcon: 'SUNNY', isNight: false },
    { period: 'Afternoon', time: '12:00', temp: 24, condition: 'Partly Cloudy', conditionIcon: 'PARTLY_CLOUDY', isNight: false },
    { period: 'Evening', time: '17:00', temp: 22, condition: 'Cloudy', conditionIcon: 'CLOUDY', isNight: false },
    { period: 'Night', time: '22:00', temp: 18, condition: 'Clear', conditionIcon: 'CLEAR_NIGHT', isNight: true },
  ],
  raw: {}
};

describe('WeatherDisplay', () => {
  it('renders location and current condition', () => {
    render(<WeatherDisplay weather={mockWeather} tempUnit="C" />);
    
    expect(screen.getByText('Test City, TS')).toBeInTheDocument();
    // Default condition logic picks afternoon or second item
    expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();
  });

  it('renders high and low temperatures in Celsius', () => {
    render(<WeatherDisplay weather={mockWeather} tempUnit="C" />);
    
    // Updated to use aria-labels as text is now split across elements
    expect(screen.getByLabelText('High temperature: 25 degrees C')).toBeInTheDocument();
    expect(screen.getByLabelText('Low temperature: 15 degrees C')).toBeInTheDocument();
  });

  it('converts temperatures to Fahrenheit when tempUnit is F', () => {
    render(<WeatherDisplay weather={mockWeather} tempUnit="F" />);
    
    // 25C = 77F, 15C = 59F
    expect(screen.getByLabelText('High temperature: 77 degrees F')).toBeInTheDocument();
    expect(screen.getByLabelText('Low temperature: 59 degrees F')).toBeInTheDocument();
  });

  it('renders the timeline graph', () => {
    render(<WeatherDisplay weather={mockWeather} tempUnit="C" />);
    
    // Check if SVG is present
    const svg = screen.getByLabelText('A graph showing temperature and weather changes throughout the day.');
    expect(svg).toBeInTheDocument();
    
    // Check for timeline points
    expect(screen.getByLabelText('Temperature: 16 degrees C')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature: 24 degrees C')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature: 22 degrees C')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature: 18 degrees C')).toBeInTheDocument();
  });

  it('adjusts icons for night time in timeline', () => {
    render(<WeatherDisplay weather={mockWeather} tempUnit="C" />);
    
    // The night item (last one) should have MoonIcon or CLEAR_NIGHT equivalent if mapped correctly
    // Our mock data has conditionIcon: 'CLEAR_NIGHT' for the last item.
    // WeatherDisplay calls nightAdjustIcon.
    // Let's verify the icon component rendered for the night part.
    // We can find it by the foreignObject context or by nearby text.
    
    // simpler: check if MoonIcon is rendered (which maps to CLEAR_NIGHT)
    expect(screen.queryByTestId('MoonIcon')).toBeInTheDocument();
  });

  it('formats time correctly', () => {
      render(<WeatherDisplay weather={mockWeather} tempUnit="C" />);
      
      // 07:00 -> 7 AM
      // 12:00 -> 12 PM
      // 17:00 -> 5 PM
      // 22:00 -> 10 PM
      expect(screen.getByText('7 AM')).toBeInTheDocument();
      expect(screen.getByText('12 PM')).toBeInTheDocument();
      expect(screen.getByText('5 PM')).toBeInTheDocument();
      expect(screen.getByText('10 PM')).toBeInTheDocument();
  });
});
