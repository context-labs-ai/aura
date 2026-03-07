'use client';

import { useState, useEffect, useCallback } from 'react';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  isLoading: boolean;
}

const CACHE_DURATION_MS = 60_000; // 60 seconds

let cachedPosition: { lat: number; lng: number; timestamp: number } | null = null;

/**
 * GPS hook — wraps navigator.geolocation.getCurrentPosition().
 * Caches position for 60 seconds to avoid repeated prompts.
 * iOS PWA has unreliable geolocation — treat as optional enhancement.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({
    lat: cachedPosition?.lat ?? null,
    lng: cachedPosition?.lng ?? null,
    error: null,
    isLoading: false,
  });

  const requestLocation = useCallback(() => {
    // Return cached position if still fresh
    if (cachedPosition && Date.now() - cachedPosition.timestamp < CACHE_DURATION_MS) {
      setState({
        lat: cachedPosition.lat,
        lng: cachedPosition.lng,
        error: null,
        isLoading: false,
      });
      return;
    }

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        cachedPosition = { lat: latitude, lng: longitude, timestamp: Date.now() };
        setState({
          lat: latitude,
          lng: longitude,
          error: null,
          isLoading: false,
        });
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: CACHE_DURATION_MS,
      }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { ...state, requestLocation };
}
