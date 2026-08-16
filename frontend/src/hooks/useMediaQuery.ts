'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to evaluate a CSS media query in React components.
 * SSR safe: returns false before hydration/mount.
 *
 * @param query CSS media query string, e.g. '(max-width: 767px)'
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Compatibility for legacy browsers
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook to detect if the current viewport is mobile.
 * Uses 768px boundary by default (< 768px is mobile).
 *
 * @param breakpoint Max width breakpoint in pixels (default: 768)
 * @returns boolean indicating if viewport is mobile width
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

export default useMediaQuery;
