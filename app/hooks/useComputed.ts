import { computed } from "mobx";
import { type DependencyList, useMemo } from "react";

/**
 * Hook around MobX computed function that runs computation whenever observable values change.
 *
 * @param callback Function which returns a memorized value.
 * @param inputs Dependency list for useMemo.
 */
export function useComputed<T>(
  callback: () => T,
  inputs: DependencyList = []
): T {
  // The dependency list is supplied by the caller so it cannot be verified here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => computed(callback), inputs);
  return value.get();
}
