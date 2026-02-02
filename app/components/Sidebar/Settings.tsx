import groupBy from "lodash/groupBy";
import { observer } from "mobx-react";
import { BackIcon, SidebarIcon } from "outline-icons";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { metaDisplay } from "@shared/utils/keyboard";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import useStores from "~/hooks/useStores";
import useCurrentUser from "~/hooks/useCurrentUser";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { settingsPath } from "~/utils/routeHelpers";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SidebarButton from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import ToggleButton from "./components/ToggleButton";

function SettingsSidebar() {
  const { ui, integrations } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const configs = useSettingsConfig();
  const currentUser = useCurrentUser({ rejectOnEmpty: false });
  const isAdmin = currentUser?.isAdmin ?? false;

  const groupedConfig = groupBy(
    configs.filter((item) =>
      item.group === "Integrations" && item.pluginId
        ? integrations.findByService(item.pluginId)
        : true
    ),
    "group"
  );

  const adminResources = useMemo(
    () =>
      isAdmin
        ? [
          {
            label: t("Changelog"),
            href: UrlHelper.changelog,
          },
          {
            label: t("Report a bug"),
            href: UrlHelper.github,
          },
          {
            label: t("API documentation"),
            href: UrlHelper.developers,
          },
        ]
        : [],
    [isAdmin, t]
  );

  const returnToApp = useCallback(() => {
    history.push("/home");
  }, [history]);

  return (
    <Sidebar>
      <HistoryNavigation />
      <SidebarButton
        title={t("Return to App")}
        image={<StyledBackIcon />}
        onClick={returnToApp}
      >
        <Tooltip content={t("Toggle sidebar")} shortcut={`${metaDisplay}+.`}>
          <ToggleButton
            aria-label={
              ui.sidebarCollapsed ? t("Expand sidebar") : t("Collapse sidebar")
            }
            position="bottom"
            image={<SidebarIcon />}
            onClick={() => {
              ui.toggleCollapsedSidebar();
              (document.activeElement as HTMLElement)?.blur();
            }}
          />
        </Tooltip>
      </SidebarButton>

      <Flex auto column>
        <Scrollable shadow>
          {Object.keys(groupedConfig).map((header) => (
            <Section key={header}>
              <Header title={header}>
                {groupedConfig[header].map((item) => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    onClickIntent={item.preload}
                    active={
                      item.path.startsWith(settingsPath("templates"))
                        ? location.pathname.startsWith(item.path)
                        : undefined
                    }
                    icon={<item.icon />}
                    label={item.name}
                  />
                ))}
              </Header>
            </Section>
          ))}
          {adminResources.length > 0 && (
            <Section>
              <Header title={t("Admin resources")}>
                {adminResources.map((resource) => (
                  <SidebarLink
                    key={resource.href}
                    href={resource.href}
                    label={resource.label}
                    target="_blank"
                    rel="noreferrer"
                  />
                ))}
              </Header>
            </Section>
          )}
        </Scrollable>
      </Flex>
    </Sidebar>
  );
}

const StyledBackIcon = styled(BackIcon)`
  margin-left: 4px;
`;

export default observer(SettingsSidebar);
