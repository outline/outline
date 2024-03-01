import path from "path";
import { glob } from "glob";
import type Router from "koa-router";
import sortBy from "lodash/sortBy";
import { UnfurlSignature } from "@shared/types";
import type BaseEmail from "@server/emails/templates/BaseEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type BaseProcessor from "@server/queues/processors/BaseProcessor";
import type BaseTask from "@server/queues/tasks/BaseTask";

export enum PluginPriority {
  VeryHigh = 0,
  High = 100,
  Normal = 200,
  Low = 300,
  VeryLow = 500,
}

export enum PluginType {
  API = "api",
  AuthProvider = "authProvider",
  EmailTemplate = "emailTemplate",
  Processor = "processor",
  Task = "task",
  UnfurlProvider = "unfurl",
}

type PluginValueMap = {
  [PluginType.API]: Router;
  [PluginType.AuthProvider]: Router;
  [PluginType.EmailTemplate]: typeof BaseEmail;
  [PluginType.Processor]: typeof BaseProcessor;
  [PluginType.Task]: typeof BaseTask<any>;
  [PluginType.UnfurlProvider]: UnfurlSignature;
};

export type Plugin<T extends PluginType> = {
  /** A unique ID for the plugin */
  id: string;
  /** The plugin's display name */
  name?: string;
  /** A brief description of the plugin */
  description?: string;
  /** The plugin content */
  value: PluginValueMap[T];
  /** An optional priority, will affect order in menus and execution. Lower is earlier. */
  priority?: number;
  /** Whether the plugin is enabled (default: true) */
  enabled?: boolean;
};

export class PluginManager {
  private static plugins = new Map<PluginType, Plugin<PluginType>[]>();

  public static register<T extends PluginType>(
    type: T,
    id: string,
    value: PluginValueMap[T],
    options: Omit<Plugin<T>, "id" | "value"> = {}
  ) {
    if (!this.plugins.has(type)) {
      this.plugins.set(type, []);
    }
    if (this.getPlugin(type, id)) {
      throw Error(
        `Attempt to register plugin ${id} of type ${type} that is already registered.`
      );
    }

    const plugin = {
      id,
      value,
      priority: PluginPriority.Normal,
      ...options,
    };

    Logger.debug(
      "plugins",
      `Plugin ${options.enabled === false ? "disabled" : "enabled"} "${id}" (${
        options.description
      })`
    );

    this.plugins.get(type)!.push(plugin);

    // allow chaining
    return this;
  }

  public static registerTask(
    value: PluginValueMap[PluginType.Task],
    options: Omit<Plugin<PluginType.Task>, "id" | "value"> = {}
  ) {
    return this.register(PluginType.Task, value.name, value, options);
  }

  public static registerProcessor(
    value: PluginValueMap[PluginType.Processor],
    options: Omit<Plugin<PluginType.Processor>, "id" | "value"> = {}
  ) {
    return this.register(PluginType.Processor, value.name, value, options);
  }

  /**
   * Return a single registered plugin of a type, mainly useful for tests.
   *
   * @param type The type of plugin to filter by
   * @param id The ID to find
   * @returns The plugin if found, otherwise undefined
   */
  public static getPlugin<T extends PluginType>(type: T, id: string) {
    return this.plugins.get(type)?.filter((plugin) => plugin.id === id)[0] as
      | Plugin<T>
      | undefined;
  }

  /**
   * Returns all the plugins of a given type in order of priority.
   *
   * @param type The type of plugin to filter by
   * @returns A list of plugins
   */
  public static getPlugins<T extends PluginType>(type: T) {
    this.loadPlugins();
    return sortBy(this.plugins.get(type) || [], "priority") as Plugin<T>[];
  }

  /**
   * Returns all the enabled plugins of a given type in order of priority.
   *
   * @param type The type of plugin to filter by
   * @returns A list of plugins
   */
  public static getEnabledPlugins<T extends PluginType>(type: T) {
    return this.getPlugins(type).filter((plugin) => plugin.enabled !== false);
  }

  /**
   * Load plugin server components (anything in the `/server/` directory of a plugin will be loaded)
   */
  public static loadPlugins() {
    if (this.loaded) {
      return;
    }
    const rootDir = env.ENVIRONMENT === "test" ? "" : "build";

    glob
      .sync(path.join(rootDir, "plugins/*/server/!(*.test|schema).[jt]s"))
      .forEach((filePath: string) => {
        require(path.join(process.cwd(), filePath));
      });
    this.loaded = true;
  }

  private static loaded = false;
}
