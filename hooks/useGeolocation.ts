import { useState, useCallback } from 'react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  loading: boolean;
  error: string | null;
  coordinates: Coordinates | null;
}

export const useGeolocation = () => {
  const [locationState, setLocationState] = useState<GeolocationState>({
    loading: false,
    error: null,
    coordinates: null,
  });

  const getCurrentPosition = useCallback((options?: PositionOptions) => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setLocationState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState({
          loading: false,
          error: null,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      (error) => {
        let message = 'Could not retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location access denied.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try entering your city manually.';
        }
        setLocationState({
          loading: false,
          error: message,
          coordinates: null,
        });
      },
      { timeout: 10000, ...options }
    );
  }, []);

  const resetLocationError = useCallback(() => {
    setLocationState(prev => ({ ...prev, error: null }));
  }, []);

  return { ...locationState, getCurrentPosition, resetLocationError };
};
