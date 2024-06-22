import { useState, useEffect } from "react";

export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean | null>(null);

  if (matches === null) {
    if (window.matchMedia) {
      const media = window.matchMedia(query);
      setMatches(media.matches);
    }
  }

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

  return !!matches;
}
