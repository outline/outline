import { find } from "es-toolkit/compat";
import { useEffect, useMemo } from "react";
import { toError } from "@shared/utils/error";
import embeds from "@shared/editor/embeds";
import { IntegrationType, TeamPreference } from "@shared/types";
import type Integration from "~/models/Integration";
import Logger from "~/utils/Logger";
import { Hook, PluginManager } from "~/utils/PluginManager";
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
        Logger.error("Failed to fetch embed integrations", toError(err));
      }
    }

    if (!integrations.isLoaded && !integrations.isFetching && loadIfMissing) {
      void fetchEmbedIntegrations();
    }
  }, [integrations, loadIfMissing]);

  // Plugins may register instance URL resolvers after integrations load.
  const pluginsLoaded = PluginManager.isLoaded;
  const disabledEmbeds =
    (team?.getPreference(TeamPreference.DisabledEmbeds) as string[]) || [];

  return useMemo(
    () =>
      embeds.map((e) => {
        // Find any integrations that match this embed and inject the settings
        const integration: Integration<IntegrationType.Embed> | undefined =
          find(integrations.orderedData, (i) => i.service === e.name);

        if (integration?.settings) {
          e.settings = integration.settings;
          e.instanceUrl = PluginManager.getHooks(Hook.InstanceUrl)
            .find((hook) => hook.value.service === e.name)
            ?.value.url(integration.settings);
        }

        e.disabled = disabledEmbeds.includes(e.id);

        return e;
      }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [integrations.orderedData, team?.preferences, pluginsLoaded]
  );
}
