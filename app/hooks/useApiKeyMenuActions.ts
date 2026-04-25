import { useMemo } from "react";
import {
  copyApiKeyFactory,
  revokeApiKeyFactory,
} from "~/actions/definitions/apiKeys";
import type ApiKey from "~/models/ApiKey";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for API key operations.
 *
 * @param apiKey - the API key to build actions for.
 * @returns action with children for use in menus.
 */
export function useApiKeyMenuActions(apiKey: ApiKey) {
  const actions = useMemo(
    () => [copyApiKeyFactory({ apiKey }), revokeApiKeyFactory({ apiKey })],
    [apiKey]
  );
  return useMenuAction(actions);
}
