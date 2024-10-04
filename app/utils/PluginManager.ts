import isArray from "lodash/isArray";
import sortBy from "lodash/sortBy";
import { action, observable } from "mobx";
import Team from "~/models/Team";
import User from "~/models/User";
import { useComputed } from "~/hooks/useComputed";
import Logger from "./Logger";
import isCloudHosted from "./isCloudHosted";

/**
 * The different types of client plugins that can be registered.
 */
export enum Hook {
  Settings = "settings",
  Icon = "icon",
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
    /** The settings screen somponent, should be lazy loaded. */
    component: React.LazyExoticComponent<React.ComponentType>;
    /** Whether the plugin is enabled in the current context. */
    enabled?: (team: Team, user: User) => boolean;
  };
  [Hook.Icon]: React.ElementType;
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
      this.plugins.set(plugin.type, observable.array([]));
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
    return sortBy(this.plugins.get(type) || [], "priority") as Plugin<T>[];
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
    this.loaded = true;
  }

  private static plugins = observable.map<Hook, Plugin<Hook>[]>();

  @observable
  private static loaded = false;
}

/**
 * Convenience hook to get the value for a specific plugin and type.
 */
export function usePluginValue<T extends Hook>(type: T, id: string) {
  return useComputed(
    () => PluginManager.getHook<T>(type, id)?.value,
    [type, id]
  );
}
