import { createLazyComponent } from "~/components/LazyLoad";
import { IntegrationService } from "@shared/types";
import { Hook, PluginManager, getIssueStatusIcon } from "./PluginManager";

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

  it("resolves issue status icons by service or legacy url", () => {
    const StatusIcon = () => null;
    PluginManager.add({
      id: "test-issue-status-icon",
      name: "Test issue status icon",
      type: Hook.IssueStatusIcon,
      value: {
        service: IntegrationService.Linear,
        component: StatusIcon,
        matchesUrl: (url) => url.hostname === "issues.example.com",
      },
    });

    expect(
      getIssueStatusIcon({
        service: IntegrationService.Linear,
        url: "https://other.example.com/1",
      })
    ).toBe(StatusIcon);
    expect(
      getIssueStatusIcon({ url: "https://issues.example.com/issue/1" })
    ).toBe(StatusIcon);
    expect(
      getIssueStatusIcon({ url: "https://other.example.com/1" })
    ).toBeUndefined();
    expect(
      getIssueStatusIcon({
        service: IntegrationService.GitHub,
        url: "https://issues.example.com/issue/1",
      })
    ).toBeUndefined();
  });
});
