import { find } from "lodash";
import * as React from "react";
import embeds, { EmbedDescriptor } from "@shared/editor/embeds";
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

  return React.useMemo(
    () =>
      embeds.map((e) => {
        const em: Integration<IntegrationType.Embed> | undefined = find(
          integrations.orderedData,
          (i) => i.service === e.component.name.toLowerCase()
        );
        return new EmbedDescriptor({
          ...e,
          settings: em?.settings,
        });
      }),
    [integrations.orderedData]
  );
}
