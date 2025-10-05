import { useState, useEffect } from "react";
import type { LibraryItem } from "@excalidraw/excalidraw/types/types";
import type { ExcalidrawImperativeAPI } from "../lib/types";
import { getDefaultLibraries } from "../lib/defaultLibraries";

/**
 * Hook to load and manage Excalidraw libraries from team preferences
 */
export function useExcalidrawLibraries(
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  isMountedRef: React.RefObject<boolean>,
  libraryUrls?: string[]
) {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  // Load libraries from team preferences
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;

    getDefaultLibraries(libraryUrls).then((items) => {
      if (mounted) {
        setLibraryItems(items);
      }
    });

    return () => {
      mounted = false;
    };
  }, [libraryUrls]);

  // Update library when items are loaded and API is available
  useEffect(() => {
    if (excalidrawAPI && libraryItems.length > 0 && isMountedRef.current) {
      excalidrawAPI.updateLibrary({
        libraryItems,
        openLibraryMenu: false,
      });
    }
  }, [excalidrawAPI, libraryItems, isMountedRef]);

  return libraryItems;
}
