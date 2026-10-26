import { isArray, sortBy } from "es-toolkit/compat";
import { action, makeObservable, observable, runInAction } from "mobx";
import type { IObservableArray } from "mobx";
import type { BaseIconProps } from "@shared/components/IssueStatusIcon";
import type {
  IntegrationService,
  IntegrationSettings,
  IntegrationType,
  MentionType,
} from "@shared/types";
import type Integration from "~/models/Integration";
import type Team from "~/models/Team";
import type User from "~/models/User";
import type { LazyComponent } from "~/components/LazyLoad";
import { useComputed } from "~/hooks/useComputed";
import Logger from "./Logger";
import isCloudHosted from "./isCloudHosted";

/**
 * The different types of client plugins that can be registered.
 */
export enum Hook {
  Settings = "settings",
  Imports = "imports",
  Icon = "icon",
  MentionProvider = "mentionProvider",
  IssueStatusIcon = "issueStatusIcon",
  InstanceUrl = "instanceUrl",
}

/**
 * A map of plugin types to their values, each plugin type has a different shape of value.
 */
type PluginValueMap = {
  [Hook.Settings]: {
    /** The group in settings sidebar this plugin belongs to. */
    group: string;
    /** An optional settings item to display this after. */
    after?: string;
    /** The displayed icon of the plugin. */
    icon: React.ElementType;
    /** The lazy loaded settings screen component. */
    component: LazyComponent<React.ComponentType>;
    /** The description that will show on the plugins card. */
    description?: string;
    /** Whether the plugin is enabled in the current context. */
    enabled?: (team: Team, user: User) => boolean;
  };
  [Hook.Imports]: {
    /** The title of the import. */
    title: string;
    /** The auxiliary descriptive text of the import. */
    subtitle: string;
    /** An icon to denote the kind of import. */
    icon: React.ReactElement;
    /** Trigger for the import. */
    action: React.ReactElement;
  };
  [Hook.Icon]: React.ElementType;
  [Hook.MentionProvider]: {
    /** The integration service that this provider handles. */
    service: IntegrationService;
    /** Whether the URL belongs to the integration. */
    isMentionable: (url: URL, integration: Integration) => boolean;
    /** The mention type of the URL, or undefined if it cannot be mentioned. */
    mentionType: (
      url: URL,
      integration: Integration
    ) => MentionType | undefined;
  };
  [Hook.IssueStatusIcon]: {
    /** The integration service that this icon is used for. */
    service: IntegrationService;
    /** The component that renders the status of an issue. */
    component: React.ComponentType<BaseIconProps>;
    /** Recognizes issue URLs from unfurls saved without a service. */
    matchesUrl?: (url: URL) => boolean;
  };
  [Hook.InstanceUrl]: {
    /** The integration service that this resolver is used for. */
    service: IntegrationService;
    /** Returns the URL of the instance that the integration is configured with. */
    url: (
      settings: IntegrationSettings<IntegrationType.Embed>
    ) => string | undefined;
  };
};

export type Plugin<T extends Hook> = {
  /** A unique identifier for the plugin */
  id: string;
  /** Plugin type */
  type: T;
  /** The plugin's display name */
  name: string;
  /** A brief description of the plugin */
  description?: string;
  /** The plugin content */
  value: PluginValueMap[T];
  /** Priority will affect order in menus and execution. Lower is earlier. */
  priority?: number;
  /** The deployments this plugin is enabled for (default: all) */
  deployments?: string[];
};

/**
 * Client plugin manager.
 */
export class PluginManager {
  /**
   * Add plugins to the manager.
   *
   * @param plugins
   */
  public static add(plugins: Array<Plugin<Hook>> | Plugin<Hook>) {
    if (isArray(plugins)) {
      return plugins.forEach((plugin) => this.register(plugin));
    }

    this.register(plugins);
  }

  @action
  private static register<T extends Hook>(plugin: Plugin<T>) {
    const enabledInDeployment =
      !plugin?.deployments ||
      plugin.deployments.length === 0 ||
      (plugin.deployments.includes("cloud") && isCloudHosted) ||
      (plugin.deployments.includes("community") && !isCloudHosted) ||
      (plugin.deployments.includes("enterprise") && !isCloudHosted);
    if (!enabledInDeployment) {
      return;
    }

    if (!this.plugins.has(plugin.type)) {
      this.plugins.set(plugin.type, observable.array([], { deep: false }));
    }

    this.plugins
      .get(plugin.type)!
      .push({ ...plugin, priority: plugin.priority ?? 0 });

    Logger.debug(
      "plugins",
      `Plugin(type=${plugin.type}) registered ${plugin.name} ${
        plugin.description ? `(${plugin.description})` : ""
      }`
    );
  }

  /**
   * Returns all the plugins of a given type in order of priority.
   *
   * @param type The type of plugin to filter by
   * @returns A list of plugins
   */
  public static getHooks<T extends Hook>(type: T) {
    const plugins = this.plugins.get(type) ?? [];
    return sortBy([...plugins], "priority") as Plugin<T>[];
  }

  /**
   * Returns a plugin of a given type by its id.
   *
   * @param type The type of plugin to filter by
   * @param id The id of the plugin
   * @returns A plugin
   */
  public static getHook<T extends Hook>(type: T, id: string) {
    return this.plugins.get(type)?.find((hook) => hook.id === id) as
      | Plugin<T>
      | undefined;
  }

  /**
   * Load plugin client components, must be in `/<plugin>/client/index.ts(x)`
   */
  public static async loadPlugins() {
    if (this.loaded) {
      return;
    }

    const r = import.meta.glob("../../plugins/*/client/index.{ts,js,tsx,jsx}");
    await Promise.all(Object.keys(r).map((key: string) => r[key]()));
    runInAction(() => {
      this.loaded = true;
    });
  }

  /**
   * Whether all plugin client modules have finished loading.
   */
  public static get isLoaded(): boolean {
    return this.loaded;
  }

  private static plugins = observable.map<
    Hook,
    IObservableArray<Plugin<Hook>>
  >();

  @observable
  private static loaded = false;
}

makeObservable(PluginManager);

/**
 * Convenience hook to get the value for a specific plugin and type.
 */
export function usePluginValue<T extends Hook>(type: T, id: string) {
  return useComputed(
    () => PluginManager.getHook<T>(type, id)?.value,
    [type, id]
  );
}

/**
 * Returns the issue status icon that a plugin registered for an issue.
 *
 * @param issue the service and URL of the issue.
 * @returns the icon component, or undefined if none is registered.
 */
export function getIssueStatusIcon(issue: { service?: string; url: string }) {
  const hooks = PluginManager.getHooks(Hook.IssueStatusIcon);
  if (issue.service) {
    return hooks.find((hook) => hook.value.service === issue.service)?.value
      .component;
  }

  let url: URL;
  try {
    url = new URL(issue.url);
  } catch {
    return undefined;
  }
  return hooks.find((hook) => hook.value.matchesUrl?.(url))?.value.component;
}
