import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let googleMapsLoaded = false;
let loadPromise: Promise<void> | null = null;

export const useGooglePlaces = () => {
  const [isLoaded, setIsLoaded] = useState(googleMapsLoaded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (googleMapsLoaded) {
      setIsLoaded(true);
      return;
    }

    if (loadPromise) {
      loadPromise.then(() => setIsLoaded(true)).catch((err) => setError(err.message));
      return;
    }

    const loadGoogleMaps = async () => {
      try {
        // Get API key from environment variable (set in Vercel during deployment)
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
          throw new Error('Google Maps API key not configured');
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
        });

        await loader.load();
        googleMapsLoaded = true;
        setIsLoaded(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Google Maps';
        setError(errorMessage);
        console.error('Error loading Google Maps:', err);
      }
    };

    loadPromise = loadGoogleMaps();
  }, []);

  return { isLoaded, error };
};
