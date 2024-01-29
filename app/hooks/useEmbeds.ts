import find from "lodash/find";
import * as React from "react";
import embeds from "@shared/editor/embeds";
import { IntegrationType } from "@shared/types";
import Integration from "~/models/Integration";
import Logger from "~/utils/Logger";
import useStores from "./useStores";

/**
 * Hook to get all embed configuration for the current team
 *
 * @param loadIfMissing Should we load integration settings if they are not locally available
 * @returns A list of embed descriptors
 */
export default function useEmbeds(loadIfMissing = false) {
  const { integrations } = useStores();

  React.useEffect(() => {
    async function fetchEmbedIntegrations() {
      try {
        await integrations.fetchPage({
          limit: 100,
          type: IntegrationType.Embed,
        });
      } catch (err) {
        Logger.error("Failed to fetch embed integrations", err);
      }
    }

    if (!integrations.isLoaded && !integrations.isFetching && loadIfMissing) {
      void fetchEmbedIntegrations();
    }
  }, [integrations, loadIfMissing]);

  return React.useMemo(
    () =>
      embeds.map((e) => {
        // Find any integrations that match this embed and inject the settings
        const integration: Integration<IntegrationType.Embed> | undefined =
          find(
            integrations.orderedData,
            (integration) => integration.service === e.name
          );

        if (integration?.settings) {
          e.settings = integration.settings;
        }

        return e;
      }),
    [integrations.orderedData]
  );
}
