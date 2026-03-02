import find from "lodash/find";
import { useEffect, useMemo } from "react";
import embeds from "@shared/editor/embeds";
import { IntegrationType, TeamPreference } from "@shared/types";
import type Integration from "~/models/Integration";
import Logger from "~/utils/Logger";
import useCurrentTeam from "./useCurrentTeam";
import useStores from "./useStores";

/**
 * Hook to get all embed configuration for the current team
 *
 * @param loadIfMissing Should we load integration settings if they are not locally available
 * @returns A list of embed descriptors
 */
export default function useEmbeds(loadIfMissing = false) {
  const { integrations } = useStores();
  const team = useCurrentTeam({ rejectOnEmpty: false });

  useEffect(() => {
    async function fetchEmbedIntegrations() {
      try {
        await integrations.fetchAll({
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

  const disabledEmbeds =
    (team.getPreference(TeamPreference.DisabledEmbeds) as string[]) || [];

  return useMemo(
    () =>
      embeds.map((e) => {
        // Find any integrations that match this embed and inject the settings
        const integration: Integration<IntegrationType.Embed> | undefined =
          find(integrations.orderedData, (i) => i.service === e.name);

        if (integration?.settings) {
          e.settings = integration.settings;
        }

        e.disabled = disabledEmbeds.includes(e.id);

        return e;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [integrations.orderedData, team.preferences]
  );
}
