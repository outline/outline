import { useState, useEffect } from "react";
import { isBrowser } from "@shared/utils/browser";

const getMatches = (query: string): boolean =>
  isBrowser && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;

/**
 * Hook to check if a media query matches the current viewport.
 *
 * @param query The CSS media query to check against
 * @returns boolean indicating whether the media query matches
 */
export default function useMediaQuery(query: string): boolean {
  // Initialize with the real value so the first render is correct and doesn't
  // flash an incorrect result before the effect runs.
  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    if (!isBrowser || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia(query);
    // Resync in case the query changed, or the viewport moved between the
    // initial render and this effect, since the initial state is only computed
    // once on mount.
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
