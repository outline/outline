import * as React from "react";
import { Minute } from "@shared/utils/time";
import Logger from "~/utils/Logger";
import useIdle from "./useIdle";
import useInterval from "./useInterval";
import usePageVisibility from "./usePageVisibility";

// The case of isReloaded=true should never be hit as the app will reload
// before the hook is called again, however seems like the only possible
// cause of #5384, adding to debug.
let isReloaded = false;

/**
 * Hook to reload the app around once a day to stop old code from running.
 */
export default function useAutoRefresh() {
  const [minutes, setMinutes] = React.useState(0);
  const isVisible = usePageVisibility();
  const isIdle = useIdle(15 * Minute.ms);

  useInterval(() => {
    setMinutes((prev) => prev + 1);

    if (minutes >= 60 * 24) {
      if (isVisible) {
        Logger.debug("lifecycle", "Skipping reload due to app visible");
        return;
      }
      if (!isIdle) {
        Logger.debug("lifecycle", "Skipping reload due to user activity");
        return;
      }
      if (isReloaded) {
        Logger.warn("Attempted to reload twice");
        return;
      }

      Logger.debug("lifecycle", "Auto-reloading app…");
      window.location.reload();
      isReloaded = true;
    }
  }, Minute.ms);
}
