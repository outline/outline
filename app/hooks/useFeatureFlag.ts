import type { FeatureFlag } from "@shared/types";
import useStores from "~/hooks/useStores";

/**
 * Hook to check if a feature flag is enabled for the current team.
 *
 * @param flag The feature flag to check.
 * @returns Whether the flag is enabled.
 */
export default function useFeatureFlag(flag: FeatureFlag): boolean {
  const { auth } = useStores();
  return auth.getFeatureFlag(flag);
}
