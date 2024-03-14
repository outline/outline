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

/**
 * The different types of server plugins that can be registered.
 */
export enum PluginType {
  API = "api",
  AuthProvider = "authProvider",
  EmailTemplate = "emailTemplate",
  Processor = "processor",
  Task = "task",
  UnfurlProvider = "unfurl",
}

/**
 * A map of plugin types to their values, for example an API plugin would have a value of type
 * Router. Registering an API plugin causes the router to be mounted.
 */
type PluginValueMap = {
  [PluginType.API]: Router;
  [PluginType.AuthProvider]: Router;
  [PluginType.EmailTemplate]: typeof BaseEmail;
  [PluginType.Processor]: typeof BaseProcessor;
  [PluginType.Task]: typeof BaseTask<any>;
  [PluginType.UnfurlProvider]: UnfurlSignature;
};

export type Plugin<T extends PluginType> = {
  /** Plugin type */
  type: T;
  /** A unique ID for the plugin */
  id: string;
  /** The plugin's display name */
  name?: string;
  /** A brief description of the plugin */
  description?: string;
  /** The plugin content */
  value: PluginValueMap[T];
  /** Priority will affect order in menus and execution. Lower is earlier. */
  priority: number;
};

export class PluginManager {
  private static plugins = new Map<PluginType, Plugin<PluginType>[]>();
  /**
   * Add plugins
   * @param plugins
   */
  public static add(plugins: Array<Plugin<PluginType>>) {
    plugins.forEach((plugin) => this.register(plugin));
  }

  private static register<T extends PluginType>(plugin: Plugin<T>) {
    if (!this.plugins.has(plugin.type)) {
      this.plugins.set(plugin.type, []);
    }

    this.plugins.get(plugin.type)!.push(plugin);

    Logger.debug(
      "plugins",
      `Plugin(type=${plugin.type}) registered "${plugin.id}" ${
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
  public static getPlugins<T extends PluginType>(type: T) {
    this.loadPlugins();
    return sortBy(this.plugins.get(type) || [], "priority") as Plugin<T>[];
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
