import React from "react";

interface Plugin {
  id: string;
  config: {
    name: string;
    description: string;
    requiredEnvVars?: string[];
    deployments?: string[];
  };
  settings: React.FC;
  icon: React.FC<{ size?: number; fill?: string }>;
}

export default class PluginLoader {
  private static pluginsCache: { [id: string]: Plugin };

  public static get plugins(): { [id: string]: Plugin } {
    if (this.pluginsCache) {
      return this.pluginsCache;
    }
    const plugins = {};

    function importAll(r: any, property: string) {
      Object.keys(r).forEach((key: string) => {
        const id = key.split("/")[3];
        plugins[id] = plugins[id] || {
          id,
        };
        plugins[id][property] = r[key].default ?? React.lazy(r[key]);
      });
    }

    importAll(
      import.meta.glob("../../plugins/*/client/Settings.{ts,js,tsx,jsx}"),
      "settings"
    );
    importAll(
      import.meta.glob("../../plugins/*/client/Icon.{ts,js,tsx,jsx}", {
        eager: true,
      }),
      "icon"
    );
    importAll(
      import.meta.glob("../../plugins/*/plugin.json", { eager: true }),
      "config"
    );

    this.pluginsCache = plugins;
    return plugins;
  }
}
