import type { Location } from "history";
import { useCallback, useSyncExternalStore } from "react";
import { useHistory } from "react-router-dom";

/**
 * Returns a value derived from the current location. Unlike `useLocation`,
 * the component only re-renders when the derived value changes, not on every
 * navigation.
 *
 * @param selector derives the value from the location. Values are compared
 *   with `Object.is`, so it should return a primitive or a stable reference.
 * @returns the derived value.
 */
export function useLocationSelector<State, Value>(
  selector: (location: Location<State>) => Value
): Value {
  const history = useHistory<State>();
  const subscribe = useCallback(
    (onChange: () => void) => history.listen(onChange),
    [history]
  );

  return useSyncExternalStore(subscribe, () => selector(history.location));
}
