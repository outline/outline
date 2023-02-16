interface Plugin {
  id: string;
  config: {
    name: string;
    description: string;
    requiredEnvVars?: string[];
  };
  settings: React.FC;
  icon: React.FC;
}

export function loadPlugins(): { [id: string]: Plugin } {
  const plugins = {};

  function importAll(r: any, property: string) {
    Object.keys(r).forEach((key: string) => {
      const id = key.split("/")[3];
      plugins[id] = plugins[id] || {
        id,
      };
      plugins[id][property] = r[key].default;
    });
  }

  importAll(
    import.meta.glob("../../plugins/*/client/Settings.{ts,js,tsx,jsx}", {
      eager: true,
    }),
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

  return plugins;
}
