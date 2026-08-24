import { useEffect, useState } from "react";
import { isEmojiIndexLoaded, loadEmojiIndex } from "@shared/utils/emoji";

/**
 * Load the emoji dataset, re-rendering once it is ready. The dataset is only
 * fetched by components that need to look emoji up by name or category, so it
 * stays out of the bundle for views that merely render emoji characters.
 *
 * @param enabled Whether the dataset is needed yet, defaults to true.
 * @returns whether emoji search and categories are available.
 */
export function useEmojiIndex(enabled = true): boolean {
  const [loaded, setLoaded] = useState(isEmojiIndexLoaded);

  useEffect(() => {
    if (enabled && !loaded) {
      void loadEmojiIndex().then(() => setLoaded(true));
    }
  }, [enabled, loaded]);

  return loaded;
}

/**
 * Preload the emoji dataset without re-rendering when it is ready. Use this in
 * views where emoji are likely to be used soon, so the data has arrived by the
 * time a component that needs it mounts.
 *
 * @param enabled Whether preloading should start, defaults to true.
 */
export function usePreloadEmojiIndex(enabled = true): void {
  useEffect(() => {
    if (enabled) {
      void loadEmojiIndex();
    }
  }, [enabled]);
}
