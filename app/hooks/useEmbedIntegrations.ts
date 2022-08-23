import * as React from "react";
import { IntegrationType } from "@shared/types";
import Integration from "~/models/Integration";
import Logger from "~/utils/Logger";
import useStores from "./useStores";

export default function useEmbedIntegrations() {
  const { integrations } = useStores();
  const [embedIntegrations, setEmbedIntegrations] = React.useState<
    Integration<IntegrationType.Embed>[] | undefined
  >();

  React.useEffect(() => {
    async function fetchEmbedIntegrations() {
      try {
        await integrations.fetchPage({
          limit: 100,
          type: IntegrationType.Embed,
        });
        setEmbedIntegrations(integrations.orderedData);
      } catch (err) {
        Logger.error("Failed to fetch embed integrations", err);
      }
    }

    integrations.isLoaded
      ? setEmbedIntegrations(integrations.orderedData)
      : fetchEmbedIntegrations();
  }, [integrations]);

  return embedIntegrations;
}
