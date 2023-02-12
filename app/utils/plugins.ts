interface Plugin {
  id: string;
  config: {
    name: string;
  };
  settings: React.FC;
  icon: React.FC;
}

export function loadPlugins(): { [id: string]: Plugin } {
  const plugins = {};

  function importAll(r: any, property: string) {
    r.keys().forEach((key: string) => {
      const id = key.split("/")[1];
      plugins[id] = plugins[id] || {
        id,
      };

      const plugin = r(key);
      plugins[id][property] = "default" in plugin ? plugin.default : plugin;
    });
  }
  importAll(
    require.context("../../plugins", true, /client\/Settings\.[tj]sx?$/),
    "settings"
  );
  importAll(
    require.context("../../plugins", true, /client\/Icon\.[tj]sx?$/),
    "icon"
  );
  importAll(require.context("../../plugins", true, /plugin\.json?$/), "config");

  return plugins;
}
