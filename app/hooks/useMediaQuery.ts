import { useState, useEffect } from "react";

/**
 * Hook to check if a media query matches the current viewport.
 *
 * @param query The CSS media query to check against
 * @returns boolean indicating whether the media query matches
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(
    () => typeof window !== "undefined" && !!window.matchMedia?.(query)?.matches
  );

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }
    const media = window.matchMedia(query);
    setMatches(media.matches);

    let timeoutId: ReturnType<typeof setTimeout>;
    const listener = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setMatches(media.matches), 0);
    };
    media.addEventListener("change", listener);
    return () => {
      clearTimeout(timeoutId);
      media.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}
