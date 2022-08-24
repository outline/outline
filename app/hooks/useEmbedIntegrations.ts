import * as React from "react";
import { IntegrationType } from "@shared/types";
import Integration from "~/models/Integration";
import Logger from "~/utils/Logger";
import useStores from "./useStores";

export default function useEmbedIntegrations() {
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

    !integrations.isLoaded && fetchEmbedIntegrations();
  }, [integrations]);

  return integrations.orderedData as Integration<IntegrationType.Embed>[];
}
