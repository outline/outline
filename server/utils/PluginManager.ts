import path from "path";
import { glob } from "glob";
import type Router from "koa-router";
import isArray from "lodash/isArray";
import sortBy from "lodash/sortBy";
import type BaseEmail from "@server/emails/templates/BaseEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import type BaseProcessor from "@server/queues/processors/BaseProcessor";
import type BaseTask from "@server/queues/tasks/BaseTask";
import { UnfurlSignature, UninstallSignature } from "@server/types";

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
export enum Hook {
  API = "api",
  AuthProvider = "authProvider",
  EmailTemplate = "emailTemplate",
  Processor = "processor",
  Task = "task",
  UnfurlProvider = "unfurl",
  Uninstall = "uninstall",
}

/**
 * A map of plugin types to their values, for example an API plugin would have a value of type
 * Router. Registering an API plugin causes the router to be mounted.
 */
type PluginValueMap = {
  [Hook.API]: Router;
  [Hook.AuthProvider]: { router: Router; id: string };
  [Hook.EmailTemplate]: typeof BaseEmail;
  [Hook.Processor]: typeof BaseProcessor;
  [Hook.Task]: typeof BaseTask<any>;
  [Hook.Uninstall]: UninstallSignature;
  [Hook.UnfurlProvider]: { unfurl: UnfurlSignature; cacheExpiry: number };
};

export type Plugin<T extends Hook> = {
  /** Plugin type */
  type: T;
  /** The plugin's display name */
  name?: string;
  /** A brief description of the plugin */
  description?: string;
  /** The plugin content */
  value: PluginValueMap[T];
  /** Priority will affect order in menus and execution. Lower is earlier. */
  priority?: number;
};

/**
 * Server plugin manager.
 */
export class PluginManager {
  private static plugins = new Map<Hook, Plugin<Hook>[]>();

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

  private static register<T extends Hook>(plugin: Plugin<T>) {
    if (!this.plugins.has(plugin.type)) {
      this.plugins.set(plugin.type, []);
    }

    this.plugins
      .get(plugin.type)!
      .push({ ...plugin, priority: plugin.priority ?? PluginPriority.Normal });

    // Do not log plugin registration in forked worker processes, one log from the master process
    // is enough. This can be detected by the presence of `process.send`.
    if (process.send === undefined) {
      Logger.debug(
        "plugins",
        `Plugin(type=${plugin.type}) registered ${
          "name" in plugin.value ? plugin.value.name : ""
        } ${plugin.description ? `(${plugin.description})` : ""}`
      );
    }
  }

  /**
   * Returns all the plugins of a given type in order of priority.
   *
   * @param type The type of plugin to filter by
   * @returns A list of plugins
   */
  public static getHooks<T extends Hook>(type: T) {
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
