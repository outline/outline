import type { MentionType } from "@shared/types";
import type Integration from "~/models/Integration";
import { Hook, PluginManager } from "~/utils/PluginManager";

/**
 * Returns the mention provider registered for the service of an integration.
 *
 * @param integration the integration to find a provider for.
 * @returns the provider, or undefined if no plugin handles the service.
 */
const getMentionProvider = (integration: Integration) =>
  PluginManager.getHooks(Hook.MentionProvider).find(
    (hook) => hook.value.service === integration.service
  )?.value;

/**
 * Checks whether a URL can be converted to a mention for the given
 * integration.
 *
 * @param options the URL and integration to check against.
 * @returns true if the URL can be mentioned through the integration.
 */
export const isURLMentionable = ({
  url,
  integration,
}: {
  url: URL;
  integration: Integration;
}): boolean =>
  getMentionProvider(integration)?.isMentionable(url, integration) ?? false;

/**
 * Determines the type of mention a URL represents for the given integration,
 * such as an issue, pull request, or project.
 *
 * @param options the URL and integration to evaluate.
 * @returns the mention type, or undefined if the URL is not recognized.
 */
export const determineMentionType = ({
  url,
  integration,
}: {
  url: URL;
  integration: Integration;
}): MentionType | undefined =>
  getMentionProvider(integration)?.mentionType(url, integration);
