import { useState, useEffect } from "react";

/**
 * Hook to check if a media query matches the current viewport.
 *
 * @param query The CSS media query to check against
 * @returns boolean indicating whether the media query matches
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (window.matchMedia) {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => {
        setMatches(media.matches);
      };
      media.addListener(listener);
      return () => media.removeListener(listener);
    }

    return undefined;
  }, [matches, query]);

  return matches;
}
