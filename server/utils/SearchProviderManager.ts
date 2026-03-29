import env from "@server/env";
import Logger from "@server/logging/Logger";
import type { BaseSearchProvider } from "./BaseSearchProvider";
import { Hook, PluginManager } from "./PluginManager";

/**
 * Manages selection and caching of the active search provider based on the
 * `SEARCH_PROVIDER` environment variable.
 */
export default class SearchProviderManager {
  private static cachedProvider: BaseSearchProvider | undefined;

  /**
   * Returns the active search provider. The provider is determined by matching
   * `SEARCH_PROVIDER` env var against registered `Hook.SearchProvider` plugins.
   *
   * @returns the active search provider instance.
   * @throws if no matching provider is found.
   */
  public static getProvider(): BaseSearchProvider {
    if (this.cachedProvider) {
      return this.cachedProvider;
    }

    const providerId = env.SEARCH_PROVIDER;
    const plugins = PluginManager.getHooks(Hook.SearchProvider);

    for (const plugin of plugins) {
      if (plugin.value.id === providerId) {
        this.cachedProvider = plugin.value;
        Logger.debug("plugins", `Using search provider: ${plugin.value.id}`);
        return this.cachedProvider;
      }
    }

    throw new Error(
      `Search provider "${providerId}" not found. Available providers: ${plugins
        .map((p) => p.value.id)
        .join(", ")}`
    );
  }

  /**
   * Reset the cached provider. Useful for testing.
   */
  public static reset(): void {
    this.cachedProvider = undefined;
  }
}
