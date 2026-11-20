import { useEffect, useEffectEvent } from "react";
import { useHistory } from "react-router-dom";

/**
 * Calls the callback when the location pathname changes. Changes to only the
 * search or hash do not call it. The component does not re-render on
 * navigation, so the hook is safe to use in components that stay mounted.
 *
 * @param callback the function to call after the pathname changes.
 * @param enabled whether to listen for changes, defaults to true.
 */
export function usePathnameChange(callback: () => void, enabled = true) {
  const history = useHistory();
  const onChange = useEffectEvent(callback);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let pathname = history.location.pathname;

    return history.listen((location) => {
      if (location.pathname === pathname) {
        return;
      }
      pathname = location.pathname;
      onChange();
    });
  }, [enabled, history]);
}
