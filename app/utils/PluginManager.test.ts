import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "./PluginManager";

const SettingsComponent = () => null;
const Icon = () => null;
const component = createLazyComponent(async () => ({
  default: SettingsComponent,
}));

describe("PluginManager", () => {
  it("returns registered hooks from observable plugin arrays", () => {
    PluginManager.add([
      {
        id: "test-settings-plugin-low",
        name: "Low priority plugin",
        type: Hook.Settings,
        priority: 20,
        value: {
          group: "Integrations",
          icon: Icon,
          component,
        },
      },
      {
        id: "test-settings-plugin-high",
        name: "High priority plugin",
        type: Hook.Settings,
        priority: 10,
        value: {
          group: "Integrations",
          icon: Icon,
          component,
        },
      },
    ]);

    const hooks = PluginManager.getHooks(Hook.Settings).filter((plugin) =>
      plugin.id.startsWith("test-settings-plugin")
    );

    expect(hooks.map((plugin) => plugin.id)).toEqual([
      "test-settings-plugin-high",
      "test-settings-plugin-low",
    ]);
  });
});
